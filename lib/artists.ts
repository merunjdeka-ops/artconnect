import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/config";

// Server-side helpers for public artist pages (list, profile, sitemap).
// Columns are an explicit allow-list: email, phone and address are never
// rendered into public HTML.

export const ARTIST_PUBLIC_COLUMNS =
  "id, full_name, category, location, bio, hourly_rate, session_rate, instagram, website, " +
  "is_available, avatar_url, daily_pic_url, daily_pic_caption, daily_pic_updated_at, " +
  "availability_schedule, role, created_at";

export type PublicArtist = {
  id: string;
  slug?: string | null;
  full_name: string;
  category: string | null;
  location: string | null;
  bio: string | null;
  hourly_rate: number | null;
  session_rate: number | null;
  instagram: string | null;
  website: string | null;
  is_available: boolean;
  avatar_url: string | null;
  daily_pic_url: string | null;
  daily_pic_caption: string | null;
  daily_pic_updated_at: string | null;
  availability_schedule: unknown;
  role: string;
  created_at: string | null;
};

// Discipline → occupation noun for titles and schema.org jobTitle.
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

export function roleNoun(category: string | null | undefined): string {
  if (!category) return "Artist";
  if (category.startsWith("Handcraft")) return "Artisan";
  return ROLE_NOUNS[category] ?? category;
}

export function artistPath(a: { id: string; slug?: string | null }): string {
  return `/artists/${a.slug || a.id}`;
}

export function artistUrl(a: { id: string; slug?: string | null }): string {
  return `${SITE_URL}${artistPath(a)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// The slug column arrives with supabase-seo-blog.sql. Until it exists, a
// select that names it errors — so retry without it and fall back to UUIDs.
async function selectWithOptionalSlug<T>(
  run: (cols: string) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T | null> {
  const withSlug = await run(`${ARTIST_PUBLIC_COLUMNS}, slug`);
  if (!withSlug.error) return withSlug.data;
  const without = await run(ARTIST_PUBLIC_COLUMNS);
  return without.error ? null : without.data;
}

// Accepts the slug or (legacy links) the UUID.
export const fetchArtist = cache(async (param: string): Promise<PublicArtist | null> => {
  const db = anon();
  if (!db) return null;
  const byId = isUuid(param);
  if (!byId) {
    const bySlug = await db.from("profiles").select(`${ARTIST_PUBLIC_COLUMNS}, slug`)
      .eq("slug", param).eq("role", "artist").maybeSingle();
    return (bySlug.data as unknown as PublicArtist) ?? null;
  }
  const row = await selectWithOptionalSlug((cols) =>
    db.from("profiles").select(cols).eq("id", param).eq("role", "artist").maybeSingle(),
  );
  return (row as unknown as PublicArtist) ?? null;
});

// Artists shown publicly: active, with a bio and a discipline (same rule as
// the /artists grid, so thin half-finished profiles aren't indexed).
export const fetchListedArtists = cache(async (): Promise<PublicArtist[]> => {
  const db = anon();
  if (!db) return [];
  const rows = await selectWithOptionalSlug((cols) =>
    db.from("profiles").select(cols)
      .eq("role", "artist").eq("is_deactivated", false)
      .not("bio", "is", null).not("category", "is", null)
      .order("created_at", { ascending: false }),
  );
  return (rows as unknown as PublicArtist[]) ?? [];
});

export async function fetchArtistExtras(artistId: string) {
  const db = anon();
  if (!db) return { portfolio: [], packages: [], reviews: [] };
  const [portfolio, packages, reviews] = await Promise.all([
    db.from("portfolio_items").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
    db.from("packages").select("*").eq("artist_id", artistId).order("price", { ascending: true }),
    db.from("reviews")
      .select("id, client_id, rating, comment, created_at, artist_reply, artist_reply_at, profiles(full_name)")
      .eq("artist_id", artistId).order("created_at", { ascending: false }),
  ]);
  return {
    portfolio: portfolio.data ?? [],
    packages: packages.data ?? [],
    reviews: reviews.data ?? [],
  };
}

// Human description line, never printing "null" for a missing field.
export function artistHeadline(a: Pick<PublicArtist, "full_name" | "category" | "location">): string {
  const role = roleNoun(a.category);
  return a.location ? `${a.full_name} — ${role} in ${a.location}` : `${a.full_name} — ${role}`;
}
