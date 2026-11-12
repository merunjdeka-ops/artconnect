import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from "@/lib/config";
import { jsonLdString } from "@/lib/events";
import HomeClient, { type HomeInitial } from "./home-client";

// Server-renders the homepage sections (events, open calls, blog, news, latest
// work) so they're real HTML for crawlers and link previews instead of
// "Loading..." placeholders. Same queries the components used client-side.
export const revalidate = 600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const EVENT_COLUMNS =
  "id, title, city, venue, event_date, photos, source, source_name, external_url, artist_id, artist:profiles!events_artist_id_fkey(full_name)";

async function loadHome(): Promise<HomeInitial | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;
  const db = createClient(url, key);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  try {
    const [events, cityRows, competitions, posts, news, work] = await Promise.all([
      db.from("events").select(EVENT_COLUMNS).eq("is_published", true).gte("event_date", todayIso)
        .order("event_date", { ascending: true, nullsFirst: false }).limit(24),
      db.from("events").select("city").eq("is_published", true).gte("event_date", todayIso)
        .not("city", "is", null).limit(1000),
      db.from("competitions").select("id, title, category, organizer, external_url, deadline, prize, cover_url")
        .eq("is_published", true).or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`)
        .order("deadline", { ascending: true, nullsFirst: false }).limit(6),
      db.from("posts").select("id, title, slug, category, excerpt, cover_url, published_at")
        .eq("is_published", true).order("published_at", { ascending: false }).limit(3),
      db.from("news_items").select("id, title, link, source, category, excerpt, image_url, published_at")
        .order("published_at", { ascending: false, nullsFirst: false }).limit(8),
      db.from("portfolio_items")
        .select("id, title, media_url, artist:profiles!portfolio_items_artist_id_fkey!inner(id, full_name, category, location)")
        .eq("media_type", "image").eq("artist.role", "artist").eq("artist.is_deactivated", false)
        .order("created_at", { ascending: false }).limit(8),
    ]);
    // Any failed query → let that section fetch client-side as before.
    if ([events, cityRows, competitions, posts, news, work].some(r => r.error)) return undefined;
    const cities = Array.from(new Set((cityRows.data || []).map(r => (r.city as string).trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    return {
      events: { events: (events.data ?? []) as unknown as HomeInitial["events"]["events"], cities },
      competitions: (competitions.data ?? []) as HomeInitial["competitions"],
      posts: (posts.data ?? []) as HomeInitial["posts"],
      news: (news.data ?? []) as HomeInitial["news"],
      work: (work.data ?? []) as unknown as HomeInitial["work"],
    };
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const initial = await loadHome();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/og`,
      email: CONTACT_EMAIL,
      areaServed: "IT",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "en",
    },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <HomeClient initial={initial} />
    </>
  );
}
