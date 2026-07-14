"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getSupabase } from "@/lib/supabase";

type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string | null;
  category: string | null;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("news_items")
        .select("id, title, link, source, category, excerpt, image_url, published_at")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(60);
      setItems((data as NewsItem[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];
  const visible = category === "all" ? items : items.filter(i => i.category === category);

  return (
    <div className="min-h-screen bg-[#F2EDE4] text-black">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black sticky top-0 bg-[#F2EDE4] z-40">
        <Link href="/" className="text-xl font-black tracking-tighter uppercase">the<span className="text-[#E5000F]">Local</span>Art<span className="text-[#E5000F]">Hub</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/blog" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Blog</Link>
          <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Artists</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Fresh off the wire</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-4">Creative News</h1>
        <p className="text-sm text-black/50 mb-10 max-w-lg">Photography, art, design, architecture and film news — updated automatically from the world&apos;s leading creative publications.</p>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <button onClick={() => setCategory("all")} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black transition-colors ${category === "all" ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>All</button>
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black transition-colors ${category === c ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>{c}</button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-xs uppercase tracking-widest text-black/40 py-12">Loading news...</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-black/40 py-12">No news yet. Check back soon.</p>
        ) : (
          <div className="flex flex-col gap-px bg-black border border-black">
            {visible.map(n => (
              <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="bg-[#F2EDE4] p-6 flex gap-6 items-start group hover:bg-white transition-colors">
                {n.image_url && (
                  <div className="hidden sm:block w-32 h-24 shrink-0 overflow-hidden border border-black/10 bg-black/5">
                    <img src={n.image_url} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#E5000F] mb-2">
                    {[n.category, n.source, formatDate(n.published_at)].filter(Boolean).join(" · ")}
                  </p>
                  <h2 className="text-lg font-black uppercase leading-tight mb-2 group-hover:text-[#E5000F] transition-colors">{n.title}</h2>
                  {n.excerpt && <p className="text-xs text-black/60 leading-relaxed line-clamp-2">{n.excerpt}</p>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
