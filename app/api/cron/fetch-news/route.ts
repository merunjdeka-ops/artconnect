import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Pulls creative-industry news from public RSS feeds into news_items.
// Feeds were chosen to cover the site's categories; each maps to one
// news category used by the public filter chips.
//
// Triggers:
//  - GET  with  Authorization: Bearer <CRON_SECRET>       → scheduled (Vercel Cron, daily).
//  - POST with  Authorization: Bearer <admin access token> → manual "Refresh now" in /admin/news.

export const maxDuration = 60;

type Feed = { name: string; url: string; category: string };

const FEEDS: Feed[] = [
  { name: "PetaPixel", url: "https://petapixel.com/feed/", category: "Photography" },
  { name: "Colossal", url: "https://www.thisiscolossal.com/feed/", category: "Art" },
  { name: "Dezeen", url: "https://www.dezeen.com/feed/", category: "Architecture" },
  { name: "Creative Boom", url: "https://www.creativeboom.com/feed/", category: "Design" },
  { name: "No Film School", url: "https://nofilmschool.com/rss.xml", category: "Film" },
];

const PER_FEED = 10;
const MAX_AGE_DAYS = 60;

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function unCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&nbsp;/g, " ");
}

function tagContent(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? unCdata(m[1]).trim() : null;
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function firstImage(block: string): string | null {
  const media = block.match(/<media:(?:content|thumbnail)[^>]+url="([^"]+)"/i);
  if (media) return decodeEntities(media[1]);
  const enclosure = block.match(/<enclosure\s[^>]*>/i)?.[0];
  if (enclosure && /type="image/i.test(enclosure)) {
    const url = enclosure.match(/url="([^"]+)"/i);
    if (url) return decodeEntities(url[1]);
  }
  const img = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? decodeEntities(img[1]) : null;
}

type NewsRow = {
  title: string;
  link: string;
  source: string;
  category: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
};

function parseFeed(xml: string, feed: Feed): NewsRow[] {
  const blocks = xml.split(/<item(?:\s[^>]*)?>/).slice(1).map(b => b.split("</item>")[0]);
  const rows: NewsRow[] = [];
  for (const block of blocks.slice(0, PER_FEED)) {
    const title = tagContent(block, "title");
    const link = tagContent(block, "link");
    if (!title || !link || !/^https?:\/\//.test(link)) continue;
    const pub = tagContent(block, "pubDate");
    const pubDate = pub ? new Date(pub) : null;
    const body = tagContent(block, "description") || tagContent(block, "content:encoded") || "";
    const excerpt = stripHtml(body).slice(0, 240) || null;
    rows.push({
      title: decodeEntities(stripHtml(title)),
      link: decodeEntities(link),
      source: feed.name,
      category: feed.category,
      excerpt,
      image_url: firstImage(block),
      published_at: pubDate && !isNaN(pubDate.getTime()) ? pubDate.toISOString() : null,
    });
  }
  return rows;
}

async function refreshNews() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Server not configured.", status: 500 };
  }
  const db = admin();
  const perFeed: Record<string, number | string> = {};
  let fetched = 0;

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "TheLocalArtHubBot/1.0 (+https://www.thelocalarthub.com)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) { perFeed[feed.name] = `HTTP ${res.status}`; continue; }
      const rows = parseFeed(await res.text(), feed);
      if (rows.length === 0) { perFeed[feed.name] = "no items"; continue; }
      const { error } = await db.from("news_items").upsert(rows, { onConflict: "link", ignoreDuplicates: true });
      if (error) { perFeed[feed.name] = error.message; continue; }
      perFeed[feed.name] = rows.length;
      fetched += rows.length;
    } catch (err) {
      perFeed[feed.name] = err instanceof Error ? err.message : "failed";
    }
  }

  // Keep the table small: drop items older than MAX_AGE_DAYS.
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000).toISOString();
  await db.from("news_items").delete().lt("published_at", cutoff);

  return { fetched, feeds: perFeed };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await refreshNews();
  return NextResponse.json(result, { status: (result as { status?: number }).status ?? 200 });
}

export async function POST(req: NextRequest) {
  // Manual admin trigger.
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await authClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const { data: profile } = await admin().from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const result = await refreshNews();
  return NextResponse.json(result, { status: (result as { status?: number }).status ?? 200 });
}
