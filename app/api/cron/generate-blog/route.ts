import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/blog";

// Auto-writes a blog roundup from REAL upcoming events already in our database.
// The AI is given only the actual event rows and is instructed never to invent
// anything — so the output is grounded and verified, not hallucinated.
//
// Triggers:
//  - GET  with  Authorization: Bearer <CRON_SECRET>  → scheduled (Vercel Cron, daily).
//    Writes at most one post per run and skips days with no fresh events.
//  - POST with  Authorization: Bearer <admin access token>  → manual "Generate now".

const RUN_DAYS = [0, 1, 2, 3, 4, 5, 6]; // every day
const LOOKAHEAD_DAYS = 21;
const COOLDOWN_DAYS = 6;    // don't re-cover the same city within this window

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

// Fallback model list used only if the live model-discovery call fails.
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-001", "gemini-1.5-flash"];

// Ask the API which models this key can actually use for generateContent, so we
// never send a guessed name that 404s. Flash models first (fast + free).
async function listGeminiModels(key: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!res.ok) return GEMINI_MODELS;
    const data = await res.json();
    // Exclude special-purpose variants (TTS, image generation, audio/live,
    // embeddings, thinking) — they support generateContent but can't return
    // plain text articles.
    const SPECIAL = /tts|image|audio|live|native|embedding|thinking|vision|exp\b/;
    const avail: string[] = (data.models || [])
      .filter((m: { supportedGenerationMethods?: string[] }) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: { name: string }) => m.name.replace(/^models\//, ""))
      .filter((n: string) => n.includes("gemini") && !SPECIAL.test(n));
    // New API keys can only use Google's newer models (older ones 404 with
    // "no longer available to new users"), so sort by version DESCENDING.
    // Within the same version prefer flash (fast/free) and stable names over
    // preview/latest ones.
    const version = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? "0");
    const rank = (n: string) =>
      version(n) * 100 + (n.includes("flash") ? 10 : 0) + (/preview|latest/.test(n) ? 0 : 1);
    const ordered = [...new Set(avail)].sort((a, b) => rank(b) - rank(a));
    return ordered.length ? ordered : GEMINI_MODELS;
  } catch {
    return GEMINI_MODELS;
  }
}

async function callGemini(model: string, key: string, prompt: string): Promise<Response> {
  // Lowest-common-denominator request shape accepted by all generateContent
  // models: a single user turn, no system_instruction field, no responseMimeType
  // (both of which some models reject with a 400).
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1800, temperature: 0.7 },
    }),
  });
}

async function generate() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: "Server not configured.", status: 500 };
  if (!geminiKey) return { error: "AI writer not configured. Add GEMINI_API_KEY.", status: 500 };

  const db = admin();
  const now = new Date();
  const until = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400_000);

  // Real upcoming, published events with a city.
  const { data: events } = await db
    .from("events")
    .select("title, description, city, venue, event_date, photos, source_name, external_url")
    .eq("is_published", true)
    .not("city", "is", null)
    .gte("event_date", now.toISOString())
    .lte("event_date", until.toISOString())
    .order("event_date", { ascending: true });

  if (!events || events.length === 0) return { skipped: "No upcoming events to write about." };

  // Cities already covered by a recent auto-post are on cooldown.
  const cooldownSince = new Date(now.getTime() - COOLDOWN_DAYS * 86400_000).toISOString();
  const { data: recent } = await db
    .from("posts").select("auto_city").eq("is_auto", true).gte("created_at", cooldownSince);
  const onCooldown = new Set((recent || []).map(r => (r.auto_city || "").toLowerCase()));

  // Pick the eligible city with the most upcoming events (>= 2).
  const byCity = new Map<string, typeof events>();
  for (const ev of events) {
    const c = ev.city as string;
    if (onCooldown.has(c.toLowerCase())) continue;
    if (!byCity.has(c)) byCity.set(c, []);
    byCity.get(c)!.push(ev);
  }
  const eligible = [...byCity.entries()].filter(([, evs]) => evs.length >= 2).sort((a, b) => b[1].length - a[1].length);
  if (eligible.length === 0) return { skipped: "No city with enough fresh upcoming events." };

  const [city, cityEvents] = eligible[0];
  const source = cityEvents.slice(0, 8).map(e => ({
    title: e.title, date: fmt(e.event_date), venue: e.venue, source: e.source_name,
    description: e.description ? String(e.description).slice(0, 200) : undefined,
  }));

  const system = "You are the arts editor for The Local Art Hub, a platform for booking local artists in Italy. "
    + "You write short, lively blog roundups of upcoming events. CRITICAL RULES: use ONLY the event data provided by the user. "
    + "Never invent events, dates, venues, artists, prices, or any fact not present in the data. Do not add events you think you know about. "
    + "If information is missing, simply omit it. Warm, welcoming editorial tone, British English. Output ONLY valid JSON, no markdown fences.";

  const userMsg = `Real upcoming events in ${city}. Write a roundup blog post about them.\n\n`
    + `EVENTS:\n${JSON.stringify(source, null, 2)}\n\n`
    + `Return ONLY this JSON object:\n`
    + `{"title": "catchy headline mentioning ${city}", "excerpt": "one-sentence teaser", `
    + `"body": "3 to 5 short paragraphs of plain text (use \\n\\n between paragraphs) that walk through the events by name, with their dates and venues, and end by inviting readers to explore The Local Art Hub"}`;

  const prompt = `${system}\n\n${userMsg}`;
  const models = await listGeminiModels(geminiKey);
  let aiRes: Response | null = null;
  let lastStatus = 500;
  let lastBody = "";
  for (const model of models.slice(0, 10)) {
    aiRes = await callGemini(model, geminiKey, prompt);
    if (aiRes.ok) break;
    lastStatus = aiRes.status;
    lastBody = await aiRes.text();
    // Skip to the next model on missing (404), rate-limited (429) or a
    // model-specific bad-request (400); stop on anything else.
    if (![400, 404, 429].includes(aiRes.status)) break;
  }
  if (!aiRes || !aiRes.ok) {
    console.error("Gemini error:", lastStatus, lastBody);
    if (lastStatus === 429) {
      return { error: "The free AI is rate-limited right now. Please wait a minute and try again.", status: 429 };
    }
    const reason = lastBody.replace(/\s+/g, " ").slice(0, 160);
    return { error: `AI request failed (${lastStatus})${reason ? ": " + reason : ""}`, status: 502 };
  }
  const aiData = await aiRes.json();
  const raw: string = aiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonStr = raw.replace(/```(?:json)?/gi, "").trim();

  let parsed: { title?: string; excerpt?: string; body?: string } | null = null;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Fall back to extracting the first {...} block if there's surrounding prose.
    const m = jsonStr.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
  }
  if (!parsed) return { error: "AI returned unparseable output.", status: 502 };
  if (!parsed.title || !parsed.body) return { error: "AI output missing title or body.", status: 502 };

  const photos = cityEvents.map(e => (e.photos?.[0] as string | undefined)).filter(Boolean).slice(0, 4) as string[];
  const { data: adminProfile } = await db.from("profiles").select("id").eq("is_admin", true).limit(1).maybeSingle();

  const record = {
    title: parsed.title.trim(),
    category: "event",
    excerpt: parsed.excerpt?.trim() || null,
    body: parsed.body.trim(),
    cover_url: photos[0] || null,
    photos,
    is_published: true,   // event roundups are grounded/safe → auto-publish
    is_auto: true,
    auto_city: city,
    author_id: adminProfile?.id || null,
    published_at: now.toISOString(),
  };

  let slug = slugify(record.title) || `events-${city.toLowerCase()}`;
  let ins = await db.from("posts").insert({ ...record, slug }).select("id").single();
  if (ins.error && ins.error.code === "23505") {
    slug = `${slug}-${Math.floor(performance.now())}`;
    ins = await db.from("posts").insert({ ...record, slug }).select("id").single();
  }
  if (ins.error) return { error: ins.error.message, status: 500 };

  return { generated: true, city, title: record.title, postId: ins.data?.id, eventCount: cityEvents.length };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Daily cron, but only actually write on the scheduled weekdays.
  if (!RUN_DAYS.includes(new Date().getUTCDay())) {
    return NextResponse.json({ skipped: "Not a scheduled day." });
  }
  const result = await generate();
  return NextResponse.json(result, { status: (result as { status?: number }).status ?? 200 });
}

export async function POST(req: NextRequest) {
  // Manual admin trigger.
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await authClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const { data: profile } = await admin().from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const result = await generate();
  return NextResponse.json(result, { status: (result as { status?: number }).status ?? 200 });
}
