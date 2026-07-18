"use client";

import { useState } from "react";

// Category filter + article list. Items arrive as props from the server page,
// so every headline is in the initial HTML; filtering happens client-side.

export type NewsListItem = {
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
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });
}

export default function NewsList({ items }: { items: NewsListItem[] }) {
  const [category, setCategory] = useState("all");

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];
  const visible = category === "all" ? items : items.filter(i => i.category === category);

  return (
    <>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-10">
          <button onClick={() => setCategory("all")} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black transition-colors ${category === "all" ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>All</button>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black transition-colors ${category === c ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>{c}</button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-black/40 py-12">No news yet. Check back soon.</p>
      ) : (
        <div className="flex flex-col gap-px bg-black border border-black">
          {visible.map(n => (
            <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="bg-[#F2EDE4] p-6 flex gap-6 items-start group hover:bg-white transition-colors">
              {n.image_url && (
                <div className="w-24 h-20 sm:w-44 sm:h-32 shrink-0 overflow-hidden border border-black/10 bg-black/5">
                  <img src={n.image_url} alt="" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
    </>
  );
}
