import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/blog";

// Auto-writes blog posts. Four content types, each with a different trust model:
//
//  - event       Roundup of REAL upcoming events already in our own database.
//                Nothing outside our data is used → auto-published.
//  - movement    Educational art-history/style guide (general, well-established
//                knowledge, not tied to current events) → published as a DRAFT
//                for a human to skim before it goes live.
//  - exhibition  Real gallery/exhibition news, found via Google Search grounding.
//  - celebrity   Real "artist/celebrity visiting Italy" news, via the same
//                grounding. Both of these are external claims we cannot verify
//                against our own data, so: they are ONLY ever written when the
//                API actually returns real search sources (never invented),
//                the source links are stored and shown to the admin, and the
//                post is always inserted as a DRAFT — never auto-published.
//
// Triggers:
//  - GET  ?type=<event|movement|exhibition|celebrity>  Authorization: Bearer <CRON_SECRET>
//    → scheduled (Vercel Cron). Only "event" is daily; others are weekly (see vercel.json).
//  - POST { type } Authorization: Bearer <admin access token>  → manual "Generate now".

const EDITORIAL_BYLINE = "The Local Art Hub Editorial Team";
const RUN_DAYS_EVENT = [0, 1, 2, 3, 4, 5, 6]; // daily
const LOOKAHEAD_DAYS = 21;
const EVENT_COOLDOWN_DAYS = 6;      // don't re-cover the same city within this window
const MOVEMENT_COOLDOWN_DAYS = 30;  // don't repeat a movement/style too soon
const EXHIBITION_COOLDOWN_DAYS = 14;
const CELEBRITY_COOLDOWN_DAYS = 30;

const ART_MOVEMENTS = [
  "the Renaissance", "Cubism", "Street Art & Graffiti", "Impressionism",
  "Baroque Art", "Futurism (born in Italy)", "Surrealism", "Pop Art",
  "Minimalism", "Contemporary Installation Art", "Abstract Expressionism",
  "Art Nouveau",
];

const ITALIAN_ART_CITIES = ["Florence", "Milan", "Rome", "Venice", "Turin", "Naples", "Bologna"];

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

async function getAdminProfileId(db: SupabaseClient): Promise<string | null> {
  const { data } = await db.from("profiles").select("id").eq("is_admin", true).limit(1).maybeSingle();
  return data?.id || null;
}

// Recent auto_topic values for a given auto_type, for simple cooldown/dedupe checks.
async function recentTopics(db: SupabaseClient, autoType: string, cooldownDays: number): Promise<Set<string>> {
  const since = new Date(Date.now() - cooldownDays * 86400_000).toISOString();
  const { data } = await db.from("posts").select("auto_topic").eq("auto_type", autoType).gte("created_at", since);
  return new Set((data || []).map(r => (r.auto_topic || "").toLowerCase()).filter(Boolean));
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

async function callGemini(model: string, key: string, prompt: string, grounded: boolean): Promise<Response> {
  // Lowest-common-denominator request shape accepted by all generateContent
  // models: a single user turn, no system_instruction field, no responseMimeType
  // (both of which some models reject with a 400).
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(grounded ? { tools: [{ google_search: {} }] } : {}),
      // Generous limit: on Gemini 2.5+ internal "thinking" tokens count against
      // maxOutputTokens, so a tight cap truncates the visible answer mid-JSON.
      generationConfig: { maxOutputTokens: 8192, temperature: grounded ? 0.4 : 0.7 },
    }),
  });
}

// Escape raw control characters that appear INSIDE JSON string literals —
// models often emit real newlines in string values, which JSON.parse rejects.
// Characters outside strings (pretty-printing) are left untouched.
function escapeCtrlInStrings(json: string): string {
  let out = "";
  let inStr = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inStr && ch === "\\" && i + 1 < json.length) { out += ch + json[++i]; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr && ch === "\n") { out += "\\n"; continue; }
    if (inStr && ch === "\t") { out += "\\t"; continue; }
    if (inStr && ch === "\r") continue;
    out += ch;
  }
  return out;
}

type AiOutcome = { ok: true; data: unknown } | { ok: false; error: string; status: number };

// Tries each candidate model in turn, falling through on 400/404/429 (bad
// model, missing model, rate limit respectively) to the next one.
async function callGeminiWithFallback(geminiKey: string, prompt: string, grounded: boolean): Promise<AiOutcome> {
  const models = await listGeminiModels(geminiKey);
  let aiRes: Response | null = null;
  let lastStatus = 500;
  let lastBody = "";
  for (const model of models.slice(0, 10)) {
    aiRes = await callGemini(model, geminiKey, prompt, grounded);
    if (aiRes.ok) break;
    lastStatus = aiRes.status;
    lastBody = await aiRes.text();
    if (![400, 404, 429].includes(aiRes.status)) break;
  }
  if (!aiRes || !aiRes.ok) {
    console.error("Gemini error:", lastStatus, lastBody);
    if (lastStatus === 429) {
      return { ok: false, error: "The free AI is rate-limited right now. Please wait a minute and try again.", status: 429 };
    }
    const reason = lastBody.replace(/\s+/g, " ").slice(0, 160);
    return { ok: false, error: `AI request failed (${lastStatus})${reason ? ": " + reason : ""}`, status: 502 };
  }
  return { ok: true, data: await aiRes.json() };
}

type Part = { text?: string; thought?: boolean };
type Candidate = { content?: { parts?: Part[] }; finishReason?: string; groundingMetadata?: { groundingChunks?: { web?: { uri?: string } }[] } };

function getCandidate(aiData: unknown): Candidate | undefined {
  return (aiData as { candidates?: Candidate[] })?.candidates?.[0];
}

// Join ALL text parts (skipping "thought" parts) — newer models can split the
// answer across parts, and parts[0] alone may be empty.
function extractText(aiData: unknown): string {
  const parts = getCandidate(aiData)?.content?.parts || [];
  return parts.filter(p => typeof p.text === "string" && !p.thought).map(p => p.text).join("");
}

function extractSources(aiData: unknown): string[] {
  const chunks = getCandidate(aiData)?.groundingMetadata?.groundingChunks || [];
  const urls = chunks.map(c => c.web?.uri).filter((u): u is string => Boolean(u));
  return [...new Set(urls)].slice(0, 5);
}

type ParsedPost = { title?: string; excerpt?: string; body?: string; [key: string]: unknown };

// Returns the parsed JSON object, or a self-explanatory error string if the
// output couldn't be parsed at all (logging the full response for Vercel logs).
function parseAiJson(aiData: unknown): ParsedPost | { error: string } {
  const raw = extractText(aiData);
  const jsonStr = raw.replace(/```(?:json)?/gi, "").trim();
  const tryParse = (s: string): ParsedPost | null => { try { return JSON.parse(s); } catch { return null; } };

  let parsed = tryParse(jsonStr);
  if (!parsed) {
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const block = jsonStr.slice(start, end + 1);
      parsed = tryParse(block) ?? tryParse(escapeCtrlInStrings(block));
    }
  }
  if (!parsed) {
    console.error("Unparseable AI output:", JSON.stringify(aiData).slice(0, 3000));
    const candidate = getCandidate(aiData);
    const reason = candidate?.finishReason;
    if (reason === "MAX_TOKENS") {
      return { error: "AI answer was cut off by the token limit before the JSON completed. Try again." };
    }
    const detail = raw ? ` Output began: "${raw.slice(0, 140).replace(/\s+/g, " ")}…"` : " The model returned no text at all.";
    return { error: `AI returned unparseable output${reason ? ` (finishReason: ${reason})` : ""}.${detail}` };
  }
  return parsed;
}

type PostResult = { skipped: string } | { error: string; status: number } | Record<string, unknown>;

async function insertPost(db: SupabaseClient, record: Record<string, unknown>): Promise<PostResult> {
  let slug = slugify(record.title as string) || `post-${Date.now()}`;
  let ins = await db.from("posts").insert({ ...record, slug }).select("id").single();
  if (ins.error && ins.error.code === "23505") {
    slug = `${slug}-${Math.floor(performance.now())}`;
    ins = await db.from("posts").insert({ ...record, slug }).select("id").single();
  }
  if (ins.error) return { error: ins.error.message, status: 500 };
  return { generated: true, postId: ins.data?.id, title: record.title, ...record };
}

// ---------------------------------------------------------------------------
// Type 1: Event roundup — grounded entirely in our own database, auto-published.
// ---------------------------------------------------------------------------
async function generateEventRoundup(db: SupabaseClient, geminiKey: string): Promise<PostResult> {
  const now = new Date();
  const until = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400_000);

  const { data: events } = await db
    .from("events")
    .select("title, description, city, venue, event_date, photos, source_name, external_url")
    .eq("is_published", true)
    .not("city", "is", null)
    .gte("event_date", now.toISOString())
    .lte("event_date", until.toISOString())
    .order("event_date", { ascending: true });

  if (!events || events.length === 0) return { skipped: "No upcoming events to write about." };

  const onCooldown = await recentTopics(db, "event", EVENT_COOLDOWN_DAYS);
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
    description: e.description ? String(e.description).slice(0, 500) : undefined,
  }));

  const prompt = "You are the arts editor for The Local Art Hub, a platform for booking local artists in Italy. "
    + "You write substantial, lively blog roundups of upcoming events. CRITICAL RULES: use ONLY the event data provided below. "
    + "Never invent events, dates, venues, artists, prices, or any fact not present in the data. Do not add events you think you know about. "
    + "If information is missing, simply omit it. Warm, welcoming editorial tone, British English. Output ONLY valid JSON, no markdown fences.\n\n"
    + `Real upcoming events in ${city}. Write a roundup blog post about them.\n\n`
    + `EVENTS:\n${JSON.stringify(source, null, 2)}\n\n`
    + `Return ONLY this JSON object:\n`
    + `{"title": "catchy headline mentioning ${city}", "excerpt": "one-sentence teaser", `
    + `"body": "a well-developed article of 600 to 900 words in plain text (use \\n\\n between paragraphs). `
    + `Open with an inviting paragraph about what the coming weeks look like in ${city} based on the listed events. `
    + `Then give each event its own paragraph — name, date and venue woven into flowing prose, drawing on the description text where provided. `
    + `Vary the sentence rhythm so it reads as editorial, not a listing. `
    + `Close by inviting readers to explore and book local artists on The Local Art Hub. `
    + `Remember: every fact must come from the event data above — pad with tone and craft, never with invented details"}`;

  const outcome = await callGeminiWithFallback(geminiKey, prompt, false);
  if (!outcome.ok) return { error: outcome.error, status: outcome.status };
  const parsed = parseAiJson(outcome.data);
  if ("error" in parsed) return { error: parsed.error, status: 502 };
  if (!parsed.title || !parsed.body) return { error: "AI output missing title or body.", status: 502 };

  const photos = cityEvents.map(e => (e.photos?.[0] as string | undefined)).filter(Boolean).slice(0, 4) as string[];

  return insertPost(db, {
    title: (parsed.title as string).trim(),
    category: "event",
    excerpt: (parsed.excerpt as string | undefined)?.trim() || null,
    body: (parsed.body as string).trim(),
    cover_url: photos[0] || null,
    photos,
    is_published: true,   // event roundups are grounded in our own data → safe to auto-publish
    is_auto: true,
    auto_city: city,
    auto_type: "event",
    auto_topic: city,
    byline: EDITORIAL_BYLINE,
    author_id: await getAdminProfileId(db),
    published_at: new Date().toISOString(),
    eventCount: cityEvents.length,
    city,
  });
}

// ---------------------------------------------------------------------------
// Type 2: Art movement/style guide — general knowledge, not tied to live data.
// Always a DRAFT: it's editorial content, not verified against a source.
// ---------------------------------------------------------------------------
async function generateMovementGuide(db: SupabaseClient, geminiKey: string): Promise<PostResult> {
  const onCooldown = await recentTopics(db, "movement", MOVEMENT_COOLDOWN_DAYS);
  const choice = ART_MOVEMENTS.find(m => !onCooldown.has(m.toLowerCase()));
  if (!choice) return { skipped: "All art movements were covered recently." };

  const prompt = "You are the arts editor for The Local Art Hub, a boutique platform for booking local artists in Italy. "
    + `Write an engaging, educational blog post about "${choice}". Cover its origins, defining characteristics, and 2-3 `
    + "historically significant, widely-known artists associated with it. This is general art-history education: state only "
    + "well-established, widely-known facts. Do NOT invent specific dates, quotes, statistics, or claims you are not confident about. "
    + "Warm, accessible editorial tone for art lovers, British English. End with one short line inviting readers to discover local "
    + "artists working in related styles on The Local Art Hub. Output ONLY valid JSON, no markdown fences: "
    + `{"title": "engaging headline about ${choice}", "excerpt": "one-sentence teaser", "body": "a well-developed article of 500 to 800 words in plain text (use \\n\\n between paragraphs)"}`;

  const outcome = await callGeminiWithFallback(geminiKey, prompt, false);
  if (!outcome.ok) return { error: outcome.error, status: outcome.status };
  const parsed = parseAiJson(outcome.data);
  if ("error" in parsed) return { error: parsed.error, status: 502 };
  if (!parsed.title || !parsed.body) return { error: "AI output missing title or body.", status: 502 };

  return insertPost(db, {
    title: (parsed.title as string).trim(),
    category: "guide",
    excerpt: (parsed.excerpt as string | undefined)?.trim() || null,
    body: (parsed.body as string).trim(),
    cover_url: null,
    photos: [],
    is_published: false,  // editorial/general-knowledge content → review before publishing
    is_auto: true,
    auto_type: "movement",
    auto_topic: choice,
    byline: EDITORIAL_BYLINE,
    author_id: await getAdminProfileId(db),
    published_at: new Date().toISOString(),
    movement: choice,
  });
}

// ---------------------------------------------------------------------------
// Type 3: Exhibition/gallery review — MUST be grounded in real Google Search
// results. If the API returns zero real sources, nothing is written at all.
// Always a DRAFT with source links shown, for a human to verify before publish.
// ---------------------------------------------------------------------------
async function generateExhibitionReview(db: SupabaseClient, geminiKey: string): Promise<PostResult> {
  const onCooldown = await recentTopics(db, "exhibition", EXHIBITION_COOLDOWN_DAYS);
  const city = ITALIAN_ART_CITIES.find(c => !onCooldown.has(c.toLowerCase()));
  if (!city) return { skipped: "All cities were covered recently." };

  const prompt = "Use Google Search to find REAL art exhibitions or gallery shows that are currently open, or opening soon, "
    + `in ${city}, Italy. You MUST base your answer strictly on real, verifiable search results — never invent an exhibition `
    + `name, venue, or date. If you cannot find any real, currently relevant exhibitions in ${city} via search, respond with `
    + `exactly {"none": true} and nothing else. Otherwise, write a short blog preview covering 1-3 real exhibitions you found, `
    + "using the real venue names and dates reported by your search results. Warm editorial tone, British English. "
    + `Output ONLY valid JSON, no markdown fences: {"title": "...", "excerpt": "one-sentence teaser", "body": "3 to 4 substantial paragraphs of plain text (use \\n\\n between paragraphs)"}`
    + ` — or exactly {"none": true} if nothing real was found.`;

  const outcome = await callGeminiWithFallback(geminiKey, prompt, true);
  if (!outcome.ok) return { error: outcome.error, status: outcome.status };

  const sources = extractSources(outcome.data);
  const parsed = parseAiJson(outcome.data);

  // Defense in depth: require BOTH a real grounding source from the API AND
  // that the model didn't itself say "nothing found".
  if ("error" in parsed || parsed.none || sources.length === 0 || !parsed.title || !parsed.body) {
    return { skipped: `No verifiable exhibitions found for ${city} right now.` };
  }

  return insertPost(db, {
    title: (parsed.title as string).trim(),
    category: "review",
    excerpt: (parsed.excerpt as string | undefined)?.trim() || null,
    body: (parsed.body as string).trim(),
    cover_url: null,
    photos: [],
    is_published: false,  // external claim → always requires human review before going live
    is_auto: true,
    auto_type: "exhibition",
    auto_topic: city,
    byline: EDITORIAL_BYLINE,
    source_urls: sources,
    author_id: await getAdminProfileId(db),
    published_at: new Date().toISOString(),
    city,
    sources,
  });
}

// ---------------------------------------------------------------------------
// Type 4: "Famous artist/celebrity visiting Italy" news — same grounding
// requirement as exhibitions: real sources or nothing is written.
// ---------------------------------------------------------------------------
async function generateCelebrityVisit(db: SupabaseClient, geminiKey: string): Promise<PostResult> {
  const prompt = "Use Google Search to find REAL, current news about a well-known artist, musician, or entertainer who is "
    + "visiting, touring, exhibiting, or performing in Italy soon or right now. You MUST base this strictly on real search "
    + "results — never invent a visit that isn't reported by real news sources. If you cannot find any real, verifiable news "
    + `of this kind, respond with exactly {"none": true} and nothing else. Otherwise write a short, exciting blog news post `
    + "about it, naming the real person and the real city/venue/date as reported by your search results. Warm editorial tone, "
    + `British English. Output ONLY valid JSON, no markdown fences: {"title": "...", "excerpt": "one-sentence teaser", `
    + `"body": "3 to 4 substantial paragraphs of plain text (use \\n\\n between paragraphs)", "personName": "the real person's name"} `
    + `— or exactly {"none": true} if nothing real was found.`;

  const outcome = await callGeminiWithFallback(geminiKey, prompt, true);
  if (!outcome.ok) return { error: outcome.error, status: outcome.status };

  const sources = extractSources(outcome.data);
  const parsed = parseAiJson(outcome.data);

  if ("error" in parsed || parsed.none || sources.length === 0 || !parsed.title || !parsed.body || !parsed.personName) {
    return { skipped: "No verifiable artist/celebrity Italy visit found right now." };
  }
  const personName = parsed.personName as string;

  const onCooldown = await recentTopics(db, "celebrity", CELEBRITY_COOLDOWN_DAYS);
  if (onCooldown.has(personName.toLowerCase())) {
    return { skipped: `${personName} was already covered recently.` };
  }

  return insertPost(db, {
    title: (parsed.title as string).trim(),
    category: "news",
    excerpt: (parsed.excerpt as string | undefined)?.trim() || null,
    body: (parsed.body as string).trim(),
    cover_url: null,
    photos: [],
    is_published: false,  // external claim about a real person → always requires human review
    is_auto: true,
    auto_type: "celebrity",
    auto_topic: personName,
    byline: EDITORIAL_BYLINE,
    source_urls: sources,
    author_id: await getAdminProfileId(db),
    published_at: new Date().toISOString(),
    personName,
    sources,
  });
}

async function generate(type: string): Promise<PostResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: "Server not configured.", status: 500 };
  if (!geminiKey) return { error: "AI writer not configured. Add GEMINI_API_KEY.", status: 500 };

  const db = admin();
  switch (type) {
    case "movement": return generateMovementGuide(db, geminiKey);
    case "exhibition": return generateExhibitionReview(db, geminiKey);
    case "celebrity": return generateCelebrityVisit(db, geminiKey);
    case "event":
    default:
      return generateEventRoundup(db, geminiKey);
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get("type") || "event";
  // The daily cron only actually writes on scheduled weekdays for the "event"
  // type; other types are scheduled weekly in vercel.json and always run.
  if (type === "event" && !RUN_DAYS_EVENT.includes(new Date().getUTCDay())) {
    return NextResponse.json({ skipped: "Not a scheduled day." });
  }
  const result = await generate(type);
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

  let type = "event";
  try {
    const body = await req.json();
    if (body?.type) type = body.type;
  } catch { /* no body → default to event */ }

  const result = await generate(type);
  return NextResponse.json(result, { status: (result as { status?: number }).status ?? 200 });
}
