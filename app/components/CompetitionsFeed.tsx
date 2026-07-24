"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

type Competition = {
  id: string;
  title: string;
  category: string;
  organizer: string | null;
  external_url: string | null;
  deadline: string | null;
  prize: string | null;
  cover_url: string | null;
};

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 3600 * 1000));
}

function formatDeadline(iso: string | null): string {
  if (!iso) return "Open-ended";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function CompetitionsFeed() {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("competitions")
        .select("id, title, category, organizer, external_url, deadline, prize, cover_url")
        .eq("is_published", true)
        .or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`)
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(6);
      setItems((data as Competition[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="px-8 py-16 border-b border-black">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-10 reveal">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Open calls</p>
          <h2 className="text-4xl font-black uppercase leading-none">Competitions<br />&amp; Contests</h2>
        </div>
        <Link href="/competitions" className="text-xs font-bold uppercase tracking-widest border-b-2 border-black hover:border-[#E5000F] hover:text-[#E5000F] transition-colors pb-0.5">
          All competitions →
        </Link>
      </div>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40 py-8">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black border border-black">
          {items.map(c => {
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
                  <h3 className="text-lg font-black uppercase leading-tight mb-2 group-hover:text-[#E5000F] transition-colors">{c.title}</h3>
                  {c.organizer && <p className="text-xs text-black/50 uppercase tracking-widest mb-3">by {c.organizer}</p>}
                  <p className="text-xs text-black/60 mb-1"><span className="font-bold uppercase">Deadline:</span> {formatDeadline(c.deadline)}</p>
                  {c.prize && <p className="text-xs text-black/60"><span className="font-bold uppercase">Prize:</span> {c.prize}</p>}
                  {c.external_url && (
                    <span className="inline-block mt-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-black group-hover:border-[#E5000F] group-hover:text-[#E5000F] transition-colors pb-0.5 self-start">
                      Enter →
                    </span>
                  )}
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
    </section>
  );
}
