import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Refresh the sitemap hourly so new artists appear without a redeploy
export const revalidate = 3600;

const BASE_URLS: MetadataRoute.Sitemap = [
  { url: "https://goartconnect.com", lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: "https://goartconnect.com/artists", lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Never crash the build/request if Supabase is unavailable — fall back to base URLs
  if (!url || !key) return BASE_URLS;

  try {
    const supabase = createClient(url, key);
    const { data: artists } = await supabase
      .from("profiles")
      .select("id, updated_at")
      .eq("role", "artist")
      .eq("is_deactivated", false);

    const artistUrls: MetadataRoute.Sitemap = (artists ?? []).map((a) => ({
      url: `https://goartconnect.com/artists/${a.id}`,
      lastModified: new Date(a.updated_at ?? Date.now()),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...BASE_URLS, ...artistUrls];
  } catch {
    return BASE_URLS;
  }
}
