import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { fetchEventCities, fetchUpcomingEvents, citySlug, eventSlug } from "@/lib/events";
import { SITE_URL } from "@/lib/config";

// Refresh the sitemap hourly so new artists appear without a redeploy
export const revalidate = 3600;

const BASE_URLS: MetadataRoute.Sitemap = [
  { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/artists`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/events`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${SITE_URL}/news`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
];

// Listed only while at least one open call exists — an empty competitions page
// shouldn't be offered to crawlers.
const COMPETITIONS_URL: MetadataRoute.Sitemap[number] = {
  url: `${SITE_URL}/competitions`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7,
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Never crash the build/request if Supabase is unavailable — fall back to base URLs
  if (!url || !key) return BASE_URLS;

  try {
    const supabase = createClient(url, key);
    const { data: artists } = await supabase
      .from("profiles")
      .select("id, created_at")
      .eq("role", "artist")
      .eq("is_deactivated", false);

    const artistUrls: MetadataRoute.Sitemap = (artists ?? []).map((a) => ({
      url: `${SITE_URL}/artists/${a.id}`,
      lastModified: new Date(a.created_at ?? Date.now()),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const { count: competitionCount } = await supabase
      .from("competitions")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`);

    // One landing page per city with upcoming events ("events in Milan", …),
    // plus its weekend roundup ("cosa fare a Milano questo weekend").
    const cities = await fetchEventCities();
    const cityUrls: MetadataRoute.Sitemap = cities.flatMap(({ city }) => [
      {
        url: `${SITE_URL}/events/${citySlug(city)}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      {
        url: `${SITE_URL}/events/${citySlug(city)}/weekend`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.6,
      },
    ]);

    // One page per upcoming event — the long-tail "<act> <city> biglietti" URLs.
    const events = await fetchUpcomingEvents({ limit: 500 });
    const eventUrls: MetadataRoute.Sitemap = events
      .filter(ev => ev.city && ev.title)
      .map(ev => ({
        url: `${SITE_URL}/events/${citySlug(ev.city!)}/${eventSlug(ev)}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    const { data: posts } = await supabase
      .from("posts")
      .select("slug, published_at")
      .eq("is_published", true);
    const postUrls: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.published_at ?? Date.now()),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [
      ...BASE_URLS,
      ...(competitionCount ? [COMPETITIONS_URL] : []),
      ...cityUrls,
      ...eventUrls,
      ...postUrls,
      ...artistUrls,
    ];
  } catch {
    return BASE_URLS;
  }
}

