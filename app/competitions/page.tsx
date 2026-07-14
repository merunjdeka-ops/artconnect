"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

type Competition = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  organizer: string | null;
  external_url: string | null;
  deadline: string | null;
  prize: string | null;
  entry_fee: string | null;
  cover_url: string | null;
};

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000));
}

function formatDeadline(iso: string | null): string {
  if (!iso) return "Open-ended";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function CompetitionsPage() {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("competitions")
        .select("id, title, description, category, organizer, external_url, deadline, prize, entry_fee, cover_url")
        .eq("is_published", true)
        .or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`)
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(60);
      setItems((data as Competition[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
  const visible = category === "all" ? items : items.filter(i => i.category === category);

  return (
    <div className="min-h-screen bg-[#F2EDE4] text-black">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black sticky top-0 bg-[#F2EDE4] z-40">
        <Link href="/" className="text-xl font-black tracking-tighter uppercase">the<span className="text-[#E5000F]">Local</span>Art<span className="text-[#E5000F]">Hub</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/news" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">News</Link>
          <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Artists</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Open calls</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-4">Competitions &amp; Contests</h1>
        <p className="text-sm text-black/50 mb-10 max-w-lg">Photography contests, poster and design awards, art prizes, architecture competitions and film festivals — open for entries now.</p>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <button onClick={() => setCategory("all")} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black transition-colors ${category === "all" ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>All</button>
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black transition-colors ${category === c ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>{c}</button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-xs uppercase tracking-widest text-black/40 py-12">Loading competitions...</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-black/40 py-12">No open competitions right now. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black border border-black">
            {visible.map(c => {
              const left = daysLeft(c.deadline);
              const card = (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                    {c.cover_url ? (
                      <img src={cdnUrl(c.cover_url, "w_800,c_limit,q_auto,f_auto")} alt={c.title} decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-black via-[#1a0000] to-[#E5000F]/40" />
                    )}
                    <span className="absolute top-3 left-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-2 py-1">{c.category}</span>
                    {left !== null && left >= 0 && left <= 14 && (
                      <span className="absolute top-3 right-3 bg-[#E5000F] text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                        {left === 0 ? "Closes today" : `${left} day${left === 1 ? "" : "s"} left`}
                      </span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h2 className="text-lg font-black uppercase leading-tight mb-2 group-hover:text-[#E5000F] transition-colors">{c.title}</h2>
                    {c.organizer && <p className="text-xs text-black/50 uppercase tracking-widest mb-3">by {c.organizer}</p>}
                    {c.description && <p className="text-xs text-black/60 leading-relaxed line-clamp-3 mb-3">{c.description}</p>}
                    <div className="mt-auto">
                      <p className="text-xs text-black/60 mb-1"><span className="font-bold uppercase">Deadline:</span> {formatDeadline(c.deadline)}</p>
                      {c.prize && <p className="text-xs text-black/60 mb-1"><span className="font-bold uppercase">Prize:</span> {c.prize}</p>}
                      {c.entry_fee && <p className="text-xs text-black/60"><span className="font-bold uppercase">Entry:</span> {c.entry_fee}</p>}
                      {c.external_url && (
                        <span className="inline-block mt-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-black group-hover:border-[#E5000F] group-hover:text-[#E5000F] transition-colors pb-0.5">
                          Enter →
                        </span>
                      )}
                    </div>
                  </div>
                </>
              );
              const cardClass = "bg-[#F2EDE4] group flex flex-col";
              return c.external_url ? (
                <a key={c.id} href={c.external_url} target="_blank" rel="noopener noreferrer" className={cardClass}>{card}</a>
              ) : (
                <div key={c.id} className={cardClass}>{card}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
