import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

async function getArtistMeta(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("profiles")
    .select("full_name, category, location, bio, avatar_url")
    .eq("id", id)
    .eq("role", "artist")
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artist = await getArtistMeta(id);

  if (!artist) return { title: "Artist Profile" };

  const title = `${artist.full_name} — ${artist.category} in ${artist.location}`;
  const description = artist.bio
    ? artist.bio.slice(0, 155) + (artist.bio.length > 155 ? "…" : "")
    : `Book ${artist.full_name}, a ${artist.category} based in ${artist.location}. Available on The Local Art Hub.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `https://thelocalarthub.com/artists/${id}`,
      ...(artist.avatar_url && {
        images: [{ url: artist.avatar_url, width: 1200, height: 630, alt: artist.full_name }],
      }),
    },
    twitter: {
      card: artist.avatar_url ? "summary_large_image" : "summary",
      title,
      description,
      ...(artist.avatar_url && { images: [artist.avatar_url] }),
    },
  };
}

export default async function ArtistLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artist = await getArtistMeta(id);

  const jsonLd = artist
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: artist.full_name,
        jobTitle: artist.category,
        address: {
          "@type": "PostalAddress",
          addressLocality: artist.location,
          addressCountry: "IT",
        },
        url: `https://thelocalarthub.com/artists/${id}`,
        ...(artist.avatar_url && { image: artist.avatar_url }),
        worksFor: {
          "@type": "Organization",
          name: "The Local Art Hub",
          url: "https://thelocalarthub.com",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
