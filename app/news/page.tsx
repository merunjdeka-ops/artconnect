import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import NewsList, { type NewsListItem } from "./news-list";

// Server-rendered so every headline is crawlable, refreshed every 30 min.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Art News — Photography, Design, Architecture & Film",
  description:
    "Daily art news and creative industry headlines: photography, contemporary art, new media, design, architecture and film — curated for the local art community in Italy.",
  alternates: { canonical: "/news" },
};

export default async function NewsPage() {
  const { data } = await getSupabase()
    .from("news_items")
    .select("id, title, link, source, category, excerpt, image_url, published_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(60);
  const items = (data as NewsListItem[]) || [];

  return (
    <div className="min-h-screen bg-[#F2EDE4] text-black">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black sticky top-0 bg-[#F2EDE4] z-40">
        <Link href="/" className="text-xl font-black tracking-tighter uppercase">the<span className="text-[#E5000F]">Local</span>Art<span className="text-[#E5000F]">Hub</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/blog" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Blog</Link>
          <Link href="/events" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Events</Link>
          <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Artists</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Fresh off the wire</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-4">Creative News</h1>
        <p className="text-sm text-black/50 mb-10 max-w-lg">Photography, art, design, architecture and film news — updated automatically from the world&apos;s leading creative publications.</p>

        <NewsList items={items} />
      </div>
    </div>
  );
}
