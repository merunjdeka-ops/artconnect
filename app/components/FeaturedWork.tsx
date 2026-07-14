"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

type WorkItem = {
  id: string;
  title: string | null;
  media_url: string;
  artist: { id: string; full_name: string | null; category: string | null; location: string | null } | null;
};

export default function FeaturedWork() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("portfolio_items")
        .select("id, title, media_url, artist:profiles!portfolio_items_artist_id_fkey!inner(id, full_name, category, location)")
        .eq("media_type", "image")
        .eq("artist.role", "artist")
        .eq("artist.is_deactivated", false)
        .order("created_at", { ascending: false })
        .limit(8);
      setItems((data as unknown as WorkItem[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  // Nothing to show — hide the section entirely.
  if (!loading && items.length === 0) return null;

  return (
    <section className="px-8 py-16 border-b border-black">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-10 reveal">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Fresh on the Hub</p>
          <h2 className="text-4xl font-black uppercase leading-none">Latest<br />Work</h2>
        </div>
        <Link href="/artists" className="text-xs font-bold uppercase tracking-widest border-b-2 border-black hover:border-[#E5000F] hover:text-[#E5000F] transition-colors pb-0.5">
          Browse all artists →
        </Link>
      </div>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40 py-8">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-black border border-black">
          {items.map(item => (
            <Link
              key={item.id}
              href={item.artist ? `/artists/${item.artist.id}` : "/artists"}
              className="relative aspect-[4/3] overflow-hidden bg-[#F2EDE4] group"
            >
              <img
                src={cdnUrl(item.media_url, "w_600,c_limit,q_auto,f_auto")}
                alt={item.title || item.artist?.full_name || "Artist work"}
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
                <p className="text-sm font-black uppercase text-white leading-tight group-hover:text-[#E5000F] transition-colors">
                  {item.artist?.full_name}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-white/60 mt-1">
                  {[item.artist?.category, item.artist?.location].filter(Boolean).join(" — ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
