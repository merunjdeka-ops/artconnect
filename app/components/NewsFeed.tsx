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
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("news_items")
        .select("id, title, link, source, category, excerpt, image_url, published_at")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(8);
      setItems((data as NewsItem[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="px-8 py-16 border-b border-black bg-black text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-10 reveal">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Fresh off the wire</p>
          <h2 className="text-4xl font-black uppercase leading-none">Creative<br />News</h2>
        </div>
        <Link href="/news" className="text-xs font-bold uppercase tracking-widest border-b-2 border-white hover:border-[#E5000F] hover:text-[#E5000F] transition-colors pb-0.5">
          All news →
        </Link>
      </div>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-white/40 py-8">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/20 border border-white/20">
          {items.map(n => (
            <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="bg-black group flex flex-col p-6 hover:bg-[#111] transition-colors">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#E5000F] mb-3">
                {[n.category, formatDate(n.published_at)].filter(Boolean).join(" · ")}
              </p>
              <h3 className="text-base font-black uppercase leading-tight mb-3 group-hover:text-[#E5000F] transition-colors">{n.title}</h3>
              {n.excerpt && <p className="text-xs text-white/50 leading-relaxed line-clamp-3 mb-4">{n.excerpt}</p>}
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-auto">{n.source} →</p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
