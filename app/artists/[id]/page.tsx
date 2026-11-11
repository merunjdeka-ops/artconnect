import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  fetchArtist, fetchArtistExtras, artistHeadline, artistPath, artistUrl, roleNoun, isUuid,
} from "@/lib/artists";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { jsonLdString } from "@/lib/events";
import ArtistProfileClient, { type ProfileInitial } from "./profile-client";

// Server-rendered artist profile. The URL segment is the artist's slug
// ("sampada-photography-firenze"); legacy UUID links 301 to it.
export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const artist = await fetchArtist(id);
  if (!artist) return { title: "Artist not found", robots: { index: false } };

  const title = artistHeadline(artist);
  const role = roleNoun(artist.category).toLowerCase();
  const where = artist.location ? ` based in ${artist.location}` : " in Italy";
  const description = artist.bio
    ? artist.bio.replace(/\s+/g, " ").slice(0, 155) + (artist.bio.length > 155 ? "…" : "")
    : `Book ${artist.full_name}, a ${role}${where}, directly on ${SITE_NAME} — portfolio, rates and availability.`;
  // Half-finished profiles stay out of the index until they're useful.
  const complete = Boolean(artist.bio && artist.category);

  return {
    title,
    description,
    alternates: { canonical: artistPath(artist) },
    ...(complete ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      type: "profile",
      url: artistUrl(artist),
      ...(artist.avatar_url ? { images: [{ url: artist.avatar_url, alt: artist.full_name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(artist.avatar_url ? { images: [artist.avatar_url] } : {}),
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  const artist = await fetchArtist(id);
  if (!artist) notFound();

  // Old UUID links (shared before slugs existed) → the keyword URL.
  if (isUuid(id) && artist.slug) permanentRedirect(artistPath(artist));

  const extras = await fetchArtistExtras(artist.id);
  const url = artistUrl(artist);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: artist.full_name,
    jobTitle: roleNoun(artist.category),
    url,
    ...(artist.avatar_url ? { image: artist.avatar_url } : {}),
    ...(artist.bio ? { description: artist.bio.slice(0, 500) } : {}),
    ...(artist.location
      ? { address: { "@type": "PostalAddress", addressLocality: artist.location, addressCountry: "IT" } }
      : {}),
    ...([artist.instagram, artist.website].some(Boolean)
      ? {
          sameAs: [artist.instagram, artist.website]
            .filter((u): u is string => Boolean(u))
            .map(u => (u.startsWith("http") ? u : u.startsWith("@") ? `https://instagram.com/${u.slice(1)}` : `https://${u}`)),
        }
      : {}),
    memberOf: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Artists", item: `${SITE_URL}/artists` },
      { "@type": "ListItem", position: 3, name: artist.full_name, item: url },
    ],
  };

  const initial: ProfileInitial = {
    artist: artist as unknown as ProfileInitial["artist"],
    portfolio: extras.portfolio as ProfileInitial["portfolio"],
    packages: extras.packages as ProfileInitial["packages"],
    reviews: extras.reviews as unknown as ProfileInitial["reviews"],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString([jsonLd, breadcrumbs]) }} />
      <ArtistProfileClient artistId={artist.id} shareUrl={url} initial={initial} />
    </>
  );
}
