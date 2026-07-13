"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type MarqueeEvent = { title: string; city: string | null; event_date: string | null };
type MarqueeArtist = { full_name: string | null; category: string | null; location: string | null };

export default function Marquee() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const [{ data: events }, { data: artists }] = await Promise.all([
        supabase
          .from("events")
          .select("title, city, event_date")
          .eq("is_published", true)
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true })
          .limit(10),
        supabase
          .from("profiles")
          .select("full_name, category, location")
          .eq("role", "artist")
          .eq("is_deactivated", false)
          .not("category", "is", null)
          .not("bio", "is", null)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const list: string[] = [];
      ((artists as MarqueeArtist[]) || []).forEach(a => {
        if (!a.full_name) return;
        list.push(`New on the Hub: ${a.full_name} — ${a.category}${a.location ? ` — ${a.location}` : ""}`);
      });
      ((events as MarqueeEvent[]) || []).forEach(e => {
        const d = e.event_date ? new Date(e.event_date) : null;
        const isToday = !!d && d.toDateString() === new Date().toDateString();
        const when = !d ? "" : isToday ? "Tonight" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        list.push(`${when ? `${when}: ` : ""}${e.title}${e.city ? ` — ${e.city}` : ""}`);
      });
      setItems(list);
    }
    load();
  }, []);

  if (items.length === 0) return null;

  const strip = items.map((t, i) => (
    <span key={i} className="flex items-center whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-white pl-8">
      {t}
      <span className="text-[#E5000F] pl-8">✦</span>
    </span>
  ));

  return (
    <div className="bg-black border-b border-black overflow-hidden py-2.5" aria-hidden="true">
      <div className="flex w-max marquee-track">
        <div className="flex shrink-0">{strip}</div>
        <div className="flex shrink-0">{strip}</div>
      </div>
    </div>
  );
}
