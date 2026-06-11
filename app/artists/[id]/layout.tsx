import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = { title: "Artist — The Local Art Hub" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Metadata must never take the page down — fall back to a generic title
  if (!url || !key) return fallback;

  let artist;
  try {
    const supabase = createClient(url, key);
    ({ data: artist } = await supabase
      .from("profiles")
      .select("full_name, category, location, bio, avatar_url")
      .eq("id", id)
      .single());
  } catch {
    return fallback;
  }

  if (!artist) {
    return fallback;
  }

  const name = artist.full_name ?? "Artist";
  const cat = artist.category ?? "Artist";
  const loc = artist.location ?? "Italy";
  const title = `${name} — ${cat} in ${loc} | The Local Art Hub`;
  const description =
    artist.bio?.replace(/<[^>]+>/g, "").slice(0, 155) ||
    `Book ${name}, a ${cat} based in ${loc}. View portfolio and request a booking on The Local Art Hub.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://thelocalarthub.com/artists/${id}`,
      siteName: "The Local Art Hub",
      images: artist.avatar_url ? [{ url: artist.avatar_url }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: artist.avatar_url ? [artist.avatar_url] : [],
    },
  };
}

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
