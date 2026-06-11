import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: artist } = await supabase
    .from("profiles")
    .select("full_name, category, location, bio, avatar_url")
    .eq("id", id)
    .single();

  if (!artist) {
    return { title: "Artist — goArtConnect" };
  }

  const name = artist.full_name ?? "Artist";
  const cat = artist.category ?? "Artist";
  const loc = artist.location ?? "Italy";
  const title = `${name} — ${cat} in ${loc} | goArtConnect`;
  const description =
    artist.bio?.replace(/<[^>]+>/g, "").slice(0, 155) ||
    `Book ${name}, a ${cat} based in ${loc}. View portfolio and request a booking on goArtConnect.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://goartconnect.com/artists/${id}`,
      siteName: "goArtConnect",
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
