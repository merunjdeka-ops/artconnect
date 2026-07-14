import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TMImage = { url: string; width?: number; ratio?: string };
type TMEvent = {
  id: string;
  name: string;
  url?: string;
  images?: TMImage[];
  dates?: { start?: { dateTime?: string; localDate?: string } };
  _embedded?: { venues?: { name?: string; city?: { name?: string } }[] };
};

type EventRow = {
  external_id: string;
  title: string;
  city: string;
  venue: string | null;
  event_date: string | null;
  photos: string[];
  source: string;
  source_name: string;
  external_url: string | null;
  is_published: boolean;
  created_by: string;
  artist_id: null;
};

function bestImage(images?: TMImage[]): string | null {
  if (!images?.length) return null;
  // Smallest 16:9 that's still ≥640px wide — the largest is Ticketmaster's
  // multi-hundred-KB _SOURCE original, far too heavy for feed cards.
  const wide = images.filter(i => i.ratio === "16_9" && (i.width ?? 0) >= 640);
  if (wide.length) {
    return wide.reduce((a, b) => ((a.width ?? Infinity) <= (b.width ?? Infinity) ? a : b)).url || null;
  }
  return images.reduce((a, b) => ((a.width ?? 0) >= (b.width ?? 0) ? a : b)).url || null;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

    // Verify the caller and confirm they are an admin.
    const authClient = createClient(url, anon);
    const { data: { user }, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

    // Accept one or more comma-separated cities, e.g. "Lucca, Firenze, Pisa".
    const { city } = (await req.json()) as { city?: string };
    const cities: string[] = [];
    const lowered = new Set<string>();
    for (const c of (city ?? "").split(",").map(s => s.trim()).filter(Boolean)) {
      if (!lowered.has(c.toLowerCase())) {
        lowered.add(c.toLowerCase());
        cities.push(c);
      }
    }
    if (cities.length === 0) return NextResponse.json({ error: "City is required." }, { status: 400 });
    if (cities.length > 10) return NextResponse.json({ error: "Up to 10 cities per import." }, { status: 400 });

    const tmKey = process.env.TICKETMASTER_API_KEY;
    if (!tmKey) {
      return NextResponse.json(
        { error: "Ticketmaster is not configured. Add TICKETMASTER_API_KEY to your environment." },
        { status: 500 }
      );
    }

    // Fetch upcoming events for each city; the same event can surface in more
    // than one city query, so dedupe by Ticketmaster id across the batch.
    const startDateTime = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    const mapped: EventRow[] = [];
    const batchIds = new Set<string>();
    const failedCities: string[] = [];

    for (const cityName of cities) {
      const params = new URLSearchParams({
        apikey: tmKey,
        city: cityName,
        size: "40",
        sort: "date,asc",
        startDateTime,
      });
      const tmRes = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`);
      if (!tmRes.ok) {
        failedCities.push(cityName);
        continue;
      }
      const tmData = await tmRes.json();
      const tmEvents: TMEvent[] = tmData?._embedded?.events ?? [];

      for (const ev of tmEvents) {
        if (batchIds.has(ev.id)) continue;
        batchIds.add(ev.id);
        const venue = ev._embedded?.venues?.[0];
        const img = bestImage(ev.images);
        const dt = ev.dates?.start?.dateTime
          || (ev.dates?.start?.localDate ? `${ev.dates.start.localDate}T20:00:00Z` : null);
        mapped.push({
          external_id: ev.id,
          title: ev.name,
          city: venue?.city?.name || cityName,
          venue: venue?.name || null,
          event_date: dt,
          photos: img ? [img] : [],
          source: "ticketmaster",
          source_name: "Ticketmaster",
          external_url: ev.url || null,
          is_published: true,
          created_by: user.id,
          artist_id: null,
        });
      }
    }

    if (failedCities.length === cities.length) {
      return NextResponse.json({ error: "Ticketmaster request failed for every city." }, { status: 502 });
    }

    if (mapped.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, failedCities });
    }

    // Skip events already imported.
    const ids = mapped.map(m => m.external_id);
    const { data: existing } = await admin
      .from("events").select("external_id").eq("source", "ticketmaster").in("external_id", ids);
    const seen = new Set((existing || []).map(e => e.external_id));
    const fresh = mapped.filter(m => !seen.has(m.external_id));

    if (fresh.length > 0) {
      const { error: insErr } = await admin.from("events").insert(fresh);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ imported: fresh.length, skipped: mapped.length - fresh.length, failedCities });
  } catch (err) {
    console.error("Ticketmaster import error:", err);
    return NextResponse.json({ error: "Import failed." }, { status: 500 });
  }
}
