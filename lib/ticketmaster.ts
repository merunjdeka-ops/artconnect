import type { SupabaseClient } from "@supabase/supabase-js";

// Ticketmaster Discovery API → our `events` table. Shared by the admin
// "Import now" button and the daily import cron, so both behave identically.

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

// Ticketmaster stores Italian venue cities under their local names, so once
// the query is country-filtered an English name like "Milan" finds nothing.
const CITY_ALIASES: Record<string, string> = {
  milan: "Milano",
  rome: "Roma",
  florence: "Firenze",
  naples: "Napoli",
  turin: "Torino",
  venice: "Venezia",
  genoa: "Genova",
  padua: "Padova",
  syracuse: "Siracusa",
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


export function normaliseCities(input: string[]): string[] {
  const out: string[] = [];
  const lowered = new Set<string>();
  for (const raw of input.map(s => s.trim()).filter(Boolean)) {
    const c = CITY_ALIASES[raw.toLowerCase()] ?? raw;
    if (!lowered.has(c.toLowerCase())) {
      lowered.add(c.toLowerCase());
      out.push(c);
    }
  }
  return out;
}

export type ImportResult = { imported: number; skipped: number; failedCities: string[] };

export async function importTicketmasterEvents(
  admin: SupabaseClient,
  cities: string[],
  createdBy: string,
  tmKey: string,
): Promise<ImportResult> {
  // The same event can surface in more than one city query, so dedupe by
  // Ticketmaster id across the batch.
  const startDateTime = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const mapped: EventRow[] = [];
  const batchIds = new Set<string>();
  const failedCities: string[] = [];

  for (const cityName of cities) {
    const params = new URLSearchParams({
      apikey: tmKey,
      city: cityName,
      countryCode: "IT",
      size: "40",
      sort: "date,asc",
      startDateTime,
    });
    const tmRes = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`);
    // Discovery API allows 5 requests/second — stay well under it.
    await new Promise(r => setTimeout(r, 250));
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
        created_by: createdBy,
        artist_id: null,
      });
    }
  }

  if (failedCities.length === cities.length && cities.length > 0) {
    throw new Error("Ticketmaster request failed for every city.");
  }
  if (mapped.length === 0) return { imported: 0, skipped: 0, failedCities };

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
  return { imported: fresh.length, skipped: mapped.length - fresh.length, failedCities };
}
