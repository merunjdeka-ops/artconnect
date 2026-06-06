"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

const CATEGORIES = [
  "All", "Photography", "Music", "Makeup Artist", "Painting", "Illustration",
  "Videography", "DJ", "Dance", "Hair Styling", "Graphic Design",
  "Pottery & Ceramics", "Sculpture", "Calligraphy", "Fashion Design",
  "Tattoo Artist", "Comedy & Stand-Up", "Poetry & Spoken Word",
  "Acting & Theatre", "Jewelry Making", "Interior Design",
];

type Artist = {
  id: string;
  full_name: string;
  category: string;
  location: string;
  bio: string;
  hourly_rate: number | null;
  session_rate: number | null;
  is_available: boolean;
};

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [filtered, setFiltered] = useState<Artist[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, category, location, bio, hourly_rate, session_rate, is_available")
        .eq("role", "artist")
        .not("bio", "is", null)
        .not("category", "is", null)
        .order("created_at", { ascending: false });

      setArtists(data || []);
      setFiltered(data || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    let result = artists;
    if (activeCategory !== "All") {
      result = result.filter(a => a.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.full_name?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [activeCategory, search, artists]);

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight uppercase">ArtConnect</Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
          <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
        </div>
      </nav>

      {/* HEADER */}
      <section className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Discover</p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h1 className="text-6xl font-black uppercase leading-none">
            Local<br />Artists
          </h1>
          <input
            type="text"
            placeholder="Search by name, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-black px-5 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 w-full md:w-72"
          />
        </div>
      </section>

      {/* CATEGORY FILTERS */}
      <section className="px-8 py-6 border-b border-black overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-black text-white border-black"
                  : "border-black hover:bg-black hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ARTISTS GRID */}
      <section className="px-8 py-12">
        {loading ? (
          <p className="text-xs uppercase tracking-widest text-black/40 text-center py-20">Loading artists...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl font-black uppercase">No artists found.</p>
            <p className="text-sm text-black/40 mt-2">Try a different category or search term.</p>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest text-black/40 mb-8">{filtered.length} artist{filtered.length !== 1 ? "s" : ""} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-black border border-black">
              {filtered.map(artist => (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="bg-[#F2EDE4] p-6 hover:bg-black hover:text-white transition-colors group block"
                >
                  {/* Avatar placeholder */}
                  <div className="w-12 h-12 bg-black group-hover:bg-white mb-4 flex items-center justify-center">
                    <span className="text-white group-hover:text-black font-black text-lg">
                      {artist.full_name?.[0]?.toUpperCase() || "A"}
                    </span>
                  </div>

                  <h3 className="font-black uppercase text-base leading-tight">{artist.full_name}</h3>
                  <p className="text-xs text-[#E5000F] group-hover:text-white font-bold uppercase tracking-widest mt-1">
                    {artist.category}
                  </p>
                  <p className="text-xs text-black/50 group-hover:text-white/60 mt-1 uppercase tracking-widest">
                    {artist.location}
                  </p>

                  {artist.bio && (
                    <p className="text-xs mt-3 text-black/60 group-hover:text-white/70 leading-relaxed line-clamp-2">
                      {artist.bio}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    {artist.hourly_rate ? (
                      <span className="text-xs font-bold uppercase">€{artist.hourly_rate}/hr</span>
                    ) : artist.session_rate ? (
                      <span className="text-xs font-bold uppercase">€{artist.session_rate}/session</span>
                    ) : (
                      <span className="text-xs text-black/30 group-hover:text-white/30 uppercase">Rate on request</span>
                    )}
                    <span className={`text-xs font-bold uppercase ${artist.is_available ? "text-green-700 group-hover:text-green-300" : "text-black/30 group-hover:text-white/30"}`}>
                      {artist.is_available ? "Available" : "Busy"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
        <span className="text-sm font-black uppercase tracking-tight">ArtConnect</span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
        </div>
      </footer>
    </main>
  );
}
