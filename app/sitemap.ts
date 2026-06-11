import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  return [
    { url: "https://goartconnect.com", lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: "https://goartconnect.com/artists", lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ...artistUrls,
  ];
}

