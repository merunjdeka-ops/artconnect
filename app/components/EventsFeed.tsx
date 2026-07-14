"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl, lightTmUrl } from "@/lib/cloudinary";

type EventItem = {
  id: string;
  title: string;
  city: string | null;
  venue: string | null;
  event_date: string | null;
  photos: string[];
  source: string;
  source_name: string | null;
  external_url: string | null;
  artist_id: string | null;
  artist: { full_name: string | null } | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

const EVENT_COLUMNS = "id, title, city, venue, event_date, photos, source, source_name, external_url, artist_id, artist:profiles!events_artist_id_fkey(full_name)";

export default function EventsFeed() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("all");
  const [search, setSearch] = useState("");
  const [searchedCity, setSearchedCity] = useState("");
  const [searchResults, setSearchResults] = useState<EventItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("is_published", true)
        .gte("event_date", today.toISOString())
        .order("event_date", { ascending: true, nullsFirst: false })
        .limit(24);
      setEvents((data as unknown as EventItem[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  // The feed only loads the 24 nearest events, so the dropdown can miss
  // cities that do have events further out — the search asks the DB directly.
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = search.trim();
    if (!term) { clearSearch(); return; }
    setSearching(true);
    const supabase = getSupabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("is_published", true)
      .gte("event_date", today.toISOString())
      .ilike("city", `%${term}%`)
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(24);
    setSearchResults((data as unknown as EventItem[]) || []);
    setSearchedCity(term);
    setCity("all");
    setSearching(false);
  }

  function clearSearch() {
    setSearch("");
    setSearchedCity("");
    setSearchResults(null);
  }

  const cities = Array.from(new Set(events.map(e => e.city).filter(Boolean))) as string[];
  const visible = searchResults ?? (city === "all" ? events : events.filter(e => e.city === city));

  function scroll(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  }

  // Nothing to show and nothing loading — hide the section entirely.
  if (!loading && events.length === 0) return null;

  return (
    <section className="px-8 py-16 border-b border-black">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3 reveal">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Live &amp; local</p>
          <h2 className="text-4xl font-black uppercase leading-none">Upcoming<br />Performances</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="search"
              placeholder="Search any city..."
              value={search}
              onChange={e => { setSearch(e.target.value); if (!e.target.value.trim()) clearSearch(); }}
              className="w-40 sm:w-48 border border-black border-r-0 bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 placeholder:normal-case placeholder:font-normal"
            />
            <button type="submit" disabled={searching} aria-label="Search city" className="px-4 py-2 border border-black bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] hover:border-[#E5000F] transition-colors disabled:opacity-50">
              {searching ? "..." : "Go"}
            </button>
          </form>
          {cities.length > 0 && (
            <select
              value={searchResults ? "all" : city}
              onChange={e => { clearSearch(); setCity(e.target.value); }}
              className="border border-black bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:border-[#E5000F] transition-colors cursor-pointer"
            >
              <option value="all">All cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div className="hidden md:flex gap-2">
            <button onClick={() => scroll(-1)} aria-label="Previous" className="w-10 h-10 border border-black flex items-center justify-center text-lg hover:bg-black hover:text-white transition-colors">‹</button>
            <button onClick={() => scroll(1)} aria-label="Next" className="w-10 h-10 border border-black flex items-center justify-center text-lg hover:bg-black hover:text-white transition-colors">›</button>
          </div>
        </div>
      </div>

      <p className="text-sm text-black/50 mb-8 max-w-md">Swipe to discover live art, gigs and shows happening near you.</p>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40 py-12">Loading events...</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-black/40 py-12">
          No upcoming events in {searchResults ? `"${searchedCity}"` : city} yet. Try another city.
        </p>
      ) : (
        <div
          ref={scroller}
          className="flex gap-px bg-black border border-black overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
          style={{ scrollbarWidth: "none" }}
        >
          {visible.map(ev => {
            const cover = ev.photos?.[0];
            const href = ev.external_url || (ev.artist_id ? `/artists/${ev.artist_id}` : null);
            const isExternal = !!ev.external_url;
            const inner = (
              <>
                <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
                  {cover ? (
                    <img src={cdnUrl(lightTmUrl(cover), "w_700,c_limit,q_auto,f_auto")} alt={ev.title} decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-black via-[#1a0000] to-[#E5000F]/40" />
                  )}
                  {ev.source === "external" && ev.source_name && (
                    <span className="absolute top-3 left-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-2 py-1">{ev.source_name}</span>
                  )}
                  {ev.photos?.length > 1 && (
                    <span className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">{ev.photos.length} photos</span>
                  )}
                </div>
                <div className="p-5">
                  {ev.event_date && (
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#E5000F] mb-2">{formatDate(ev.event_date)}</p>
                  )}
                  <h3 className="text-lg font-black uppercase leading-tight mb-1">{ev.title}</h3>
                  {ev.artist?.full_name && (
                    <p className="text-xs text-black/50 uppercase tracking-widest mb-2">by {ev.artist.full_name}</p>
                  )}
                  {(ev.venue || ev.city) && (
                    <p className="text-xs text-black/60 flex items-center gap-1">
                      <span className="text-[#E5000F]">◉</span>
                      {[ev.venue, ev.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {href && (
                    <span className="inline-block mt-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-black group-hover:border-[#E5000F] group-hover:text-[#E5000F] transition-colors pb-0.5">
                      {isExternal ? "Get tickets →" : "View artist →"}
                    </span>
                  )}
                </div>
              </>
            );

            const cardClass = "snap-start shrink-0 w-[85%] sm:w-[340px] bg-[#F2EDE4] group";

            if (href && isExternal) {
              return (
                <a key={ev.id} href={href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                  {inner}
                </a>
              );
            }
            if (href) {
              return <Link key={ev.id} href={href} className={cardClass}>{inner}</Link>;
            }
            return <div key={ev.id} className={cardClass}>{inner}</div>;
          })}
        </div>
      )}
    </section>
  );
}
