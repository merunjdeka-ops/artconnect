import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

// Map each discipline to a proper occupation noun for SEO titles and
// schema.org jobTitle. Categories that are already role nouns (e.g.
// "Makeup Artist", "DJ") and anything unmapped fall back to the raw value.
const ROLE_NOUNS: Record<string, string> = {
  Photography: "Photographer",
  Videography: "Videographer",
  Painting: "Painter",
  Illustration: "Illustrator",
  "Graphic Design": "Graphic Designer",
  Sculpture: "Sculptor",
  Calligraphy: "Calligrapher",
  Music: "Musician",
  Dance: "Dancer",
  "Hair Styling": "Hair Stylist",
  "Pottery & Ceramics": "Ceramicist",
  "Fashion Design": "Fashion Designer",
  "Comedy & Stand-Up": "Comedian",
  "Poetry & Spoken Word": "Poet",
  "Acting & Theatre": "Actor",
  "Jewelry Making": "Jewelry Maker",
  "Interior Design": "Interior Designer",
  Handcraft: "Artisan",
  "Mural Art": "Muralist",
  Animation: "Animator",
};

function roleNoun(category: string | null): string {
  if (!category) return "Artist";
  return ROLE_NOUNS[category] ?? category;
}

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

  const role = roleNoun(artist.category);
  const title = `${artist.full_name} — ${role} in ${artist.location}`;
  const description = artist.bio
    ? artist.bio.slice(0, 155) + (artist.bio.length > 155 ? "…" : "")
    : `Book ${artist.full_name}, a ${role} based in ${artist.location}. Available on The Local Art Hub.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `https://thelocalarthub.com/artists/${id}`,
      ...(artist.avatar_url && {
        images: [{ url: artist.avatar_url, alt: artist.full_name }],
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
        jobTitle: roleNoun(artist.category),
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
