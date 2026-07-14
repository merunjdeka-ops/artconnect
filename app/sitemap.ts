import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Refresh the sitemap hourly so new artists appear without a redeploy
export const revalidate = 3600;

const BASE_URLS: MetadataRoute.Sitemap = [
  { url: "https://thelocalarthub.com", lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: "https://thelocalarthub.com/artists", lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: "https://thelocalarthub.com/news", lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
];

// Listed only while at least one open call exists — an empty competitions page
// shouldn't be offered to crawlers.
const COMPETITIONS_URL: MetadataRoute.Sitemap[number] = {
  url: "https://thelocalarthub.com/competitions", lastModified: new Date(), changeFrequency: "daily", priority: 0.7,
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
      url: `https://thelocalarthub.com/artists/${a.id}`,
      lastModified: new Date(a.created_at ?? Date.now()),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const { count: competitionCount } = await supabase
      .from("competitions")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`);

    return [
      ...BASE_URLS,
      ...(competitionCount ? [COMPETITIONS_URL] : []),
      ...artistUrls,
    ];
  } catch {
    return BASE_URLS;
  }
}

