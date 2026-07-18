import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/config";

// Server-side helpers for the public /events pages: fetching published events
// with the anon key and building the schema.org Event JSON-LD that makes the
// pages eligible for Google's event rich results.

export type PublicEvent = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  venue: string | null;
  event_date: string | null;
  photos: string[];
  source: string;
  source_name: string | null;
  external_url: string | null;
  artist_id: string | null;
};

export const EVENT_COLUMNS =
  "id, title, description, city, venue, event_date, photos, source, source_name, external_url, artist_id";

export function citySlug(city: string): string {
  return slugify(city);
}

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function startOfTodayIso(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

export async function fetchUpcomingEvents(opts?: { city?: string; limit?: number }): Promise<PublicEvent[]> {
  const supabase = serverSupabase();
  if (!supabase) return [];
  let q = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("is_published", true)
    .gte("event_date", startOfTodayIso())
    .order("event_date", { ascending: true, nullsFirst: false })
    .limit(opts?.limit ?? 100);
  if (opts?.city) q = q.eq("city", opts.city);
  const { data } = await q;
  return (data as PublicEvent[]) || [];
}

// Every city with at least one upcoming published event, with counts,
// alphabetical. Used for the city index, slug resolution, and the sitemap.
export async function fetchEventCities(): Promise<{ city: string; count: number }[]> {
  const supabase = serverSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("events")
    .select("city")
    .eq("is_published", true)
    .gte("event_date", startOfTodayIso())
    .not("city", "is", null)
    .limit(2000);
  const counts = new Map<string, number>();
  for (const row of data || []) {
    const c = (row.city as string).trim();
    if (!c) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

export async function resolveCityFromSlug(slug: string): Promise<string | null> {
  const cities = await fetchEventCities();
  return cities.find(c => citySlug(c.city) === slug)?.city ?? null;
}

// schema.org Event objects for Google's event rich results. Every field
// Google recommends is populated, but only from real row data — the
// fallback description is assembled from actual title/venue/date, never
// invented facts.
export function eventsJsonLd(events: PublicEvent[]): object[] {
  return events
    .filter(ev => ev.title && ev.event_date)
    .map(ev => {
      const image = ev.photos?.[0];
      const url = ev.external_url || (ev.city ? `${SITE_URL}/events/${citySlug(ev.city)}` : SITE_URL);
      const when = ev.event_date
        ? new Date(ev.event_date).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome",
          })
        : "";
      const fallbackDescription = [
        ev.title,
        "— live event",
        ev.venue ? `at ${ev.venue}` : "",
        ev.city ? `in ${ev.city}` : "",
        when ? `on ${when}.` : ".",
        ev.external_url ? "Tickets available online." : "",
      ].filter(Boolean).join(" ").replace(/\s+/g, " ");
      return {
        "@context": "https://schema.org",
        "@type": "Event",
        name: ev.title,
        startDate: ev.event_date,
        // Real end times aren't published for most listings — Google accepts
        // endDate equal to startDate for single-day events.
        endDate: ev.event_date,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: ev.venue || ev.city || "Italy",
          address: {
            "@type": "PostalAddress",
            ...(ev.city ? { addressLocality: ev.city } : {}),
            addressCountry: "IT",
          },
        },
        ...(image ? { image: [image] } : {}),
        description: ev.description ? String(ev.description).slice(0, 500) : fallbackDescription,
        url,
        // Concert listings are titled by the act, so the title doubles as the
        // performer name; no price data exists, so offers carries the ticket
        // link and availability only.
        performer: { "@type": "PerformingGroup", name: ev.title },
        ...(ev.external_url
          ? {
              offers: {
                "@type": "Offer",
                url: ev.external_url,
                availability: "https://schema.org/InStock",
              },
            }
          : {}),
        organizer: {
          "@type": "Organization",
          name: ev.source_name || SITE_NAME,
          url: ev.external_url || SITE_URL,
        },
      };
    });
}

// Serialized for a <script type="application/ld+json"> tag. `<` is escaped so
// event titles can never close the script tag (XSS).
export function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function eventPageDescription(city: string, events: PublicEvent[]): string {
  const venues = [...new Set(events.map(e => e.venue).filter(Boolean))].slice(0, 3);
  const venuePart = venues.length ? ` at ${venues.join(", ")}` : "";
  return `${events.length} upcoming concert${events.length === 1 ? "" : "s"}, shows and live events in ${city}${venuePart}. Dates, venues and tickets — updated daily on ${SITE_NAME}.`;
}
