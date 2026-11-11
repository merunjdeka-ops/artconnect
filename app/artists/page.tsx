import type { Metadata } from "next";
import { fetchListedArtists, artistUrl, roleNoun } from "@/lib/artists";
import { SITE_URL } from "@/lib/config";
import { jsonLdString } from "@/lib/events";
import ArtistsBrowser from "./artists-browser";

// Server-rendered directory: crawlers and link previews get the full artist
// grid as HTML instead of a "Loading..." shell.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Book Local Artists in Italy — Photographers, Musicians, Makeup Artists & More",
  description:
    "Browse real portfolios and rates from local photographers, musicians, DJs, makeup artists, painters and more across Italy. Book directly — no agencies, no commission.",
  alternates: { canonical: "/artists" },
  openGraph: {
    title: "Book Local Artists in Italy",
    description: "Real portfolios, real rates, direct booking — no agencies, no commission.",
    url: `${SITE_URL}/artists`,
  },
};

type Props = { searchParams: Promise<{ category?: string }> };

export default async function ArtistsPage({ searchParams }: Props) {
  const [{ category }, artists] = await Promise.all([searchParams, fetchListedArtists()]);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Local artists on The Local Art Hub",
    itemListElement: artists.slice(0, 50).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: artistUrl(a),
      name: `${a.full_name} — ${roleNoun(a.category)}`,
    })),
  };

  return (
    <>
      {artists.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(itemList) }} />
      )}
      <ArtistsBrowser
        initialArtists={artists.map(a => ({
          id: a.id,
          slug: a.slug ?? null,
          full_name: a.full_name,
          category: a.category ?? "",
          location: a.location ?? "",
          bio: a.bio ?? "",
          hourly_rate: a.hourly_rate,
          session_rate: a.session_rate,
          is_available: a.is_available,
          avatar_url: a.avatar_url,
        }))}
        initialCategory={category ?? "All"}
      />
    </>
  );
}
