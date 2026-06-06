"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

const CATEGORIES = [
  "All", "Photography", "Music", "Makeup Artist", "Painting", "Illustration",
  "Videography", "DJ", "Dance", "Hair Styling", "Graphic Design",
  "Pottery & Ceramics", "Sculpture", "Calligraphy", "Fashion Design",
  "Tattoo Artist", "Comedy & Stand-Up", "Poetry & Spoken Word",
  "Acting & Theatre", "Jewelry Making", "Interior Design",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_az", label: "Name A-Z" },
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Advanced filter state
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, category, location, bio, hourly_rate, session_rate, is_available")
        .eq("role", "artist")
        .eq("is_deactivated", false)
        .not("bio", "is", null)
        .not("category", "is", null)
        .order("created_at", { ascending: false });

      setArtists(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = [...artists];

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

    if (availableOnly) {
      result = result.filter(a => a.is_available);
    }

    const min = minPrice !== "" ? parseFloat(minPrice) : null;
    const max = maxPrice !== "" ? parseFloat(maxPrice) : null;
    if (min !== null || max !== null) {
      result = result.filter(a => {
        const rate = a.hourly_rate ?? a.session_rate ?? null;
        if (rate === null) return false;
        if (min !== null && rate < min) return false;
        if (max !== null && rate > max) return false;
        return true;
      });
    }

    if (sortBy === "price_asc") {
      result = [...result].sort((a, b) => {
        const ra = a.hourly_rate ?? a.session_rate ?? Infinity;
        const rb = b.hourly_rate ?? b.session_rate ?? Infinity;
        return ra - rb;
      });
    } else if (sortBy === "price_desc") {
      result = [...result].sort((a, b) => {
        const ra = a.hourly_rate ?? a.session_rate ?? -Infinity;
        const rb = b.hourly_rate ?? b.session_rate ?? -Infinity;
        return rb - ra;
      });
    } else if (sortBy === "name_az") {
      result = [...result].sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "")
      );
    }

    return result;
  }, [artists, activeCategory, search, availableOnly, minPrice, maxPrice, sortBy]);

  // Build active filter chips (search shown inline in header, not as chip)
  const activeFilters: { label: string; clear: () => void }[] = [];
  if (activeCategory !== "All") {
    activeFilters.push({ label: activeCategory, clear: () => setActiveCategory("All") });
  }
  if (availableOnly) {
    activeFilters.push({ label: "Available Only", clear: () => setAvailableOnly(false) });
  }
  if (minPrice !== "") {
    activeFilters.push({ label: `Min €${minPrice}`, clear: () => setMinPrice("") });
  }
  if (maxPrice !== "") {
    activeFilters.push({ label: `Max €${maxPrice}`, clear: () => setMaxPrice("") });
  }
  if (sortBy !== "newest") {
    const label = SORT_OPTIONS.find(o => o.value === sortBy)?.label || sortBy;
    activeFilters.push({ label, clear: () => setSortBy("newest") });
  }

  const hasActiveFilters = activeFilters.length > 0 || search.trim() !== "";

  function clearAllFilters() {
    setActiveCategory("All");
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setAvailableOnly(false);
    setSortBy("newest");
  }

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
          <h1 className="text-6xl font-black uppercase leading-none text-black">
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

      {/* CATEGORY FILTERS — horizontal scroll on mobile */}
      <section className="px-8 py-6 border-b border-black">
        <div className="overflow-x-auto -mx-2 px-2 scrollbar-none">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-black text-white border-black"
                    : "border-black text-black hover:bg-black hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ADVANCED FILTERS ROW */}
      <section className="px-8 py-5 border-b border-black flex flex-wrap gap-6 items-end">
        {/* Price range */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-widest text-black/50">Hourly Rate (&euro;)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="border border-black w-20 px-3 py-2 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
            <span className="text-xs font-bold text-black/40">to</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="border border-black w-20 px-3 py-2 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
          </div>
        </div>

        {/* Availability toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-widest text-black/50">Availability</span>
          <button
            onClick={() => setAvailableOnly(v => !v)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors whitespace-nowrap ${
              availableOnly
                ? "bg-[#E5000F] text-white border-[#E5000F]"
                : "border-black text-black hover:bg-black hover:text-white"
            }`}
          >
            Available Only
          </button>
        </div>

        {/* Sort — pushed to right */}
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-black/50">Sort By</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border border-black px-3 py-2 pr-8 bg-white text-xs font-bold uppercase tracking-widest outline-none focus:border-[#E5000F] transition-colors cursor-pointer appearance-none"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black text-xs">&#9660;</span>
          </div>
        </div>
      </section>

      {/* ACTIVE FILTER CHIPS */}
      {activeFilters.length > 0 && (
        <section className="px-8 py-4 border-b border-black flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-black/40 mr-1">Filters:</span>
          {activeFilters.map(f => (
            <button
              key={f.label}
              onClick={f.clear}
              className="flex items-center gap-1.5 px-3 py-1 border border-black text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-[#E5000F] hover:border-[#E5000F] transition-colors"
            >
              {f.label}
              <span aria-hidden="true" className="leading-none">&times;</span>
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="ml-2 text-xs font-bold uppercase tracking-widest text-[#E5000F] hover:text-black underline transition-colors"
            >
              Clear All
            </button>
          )}
        </section>
      )}

      {/* ARTISTS GRID */}
      <section className="px-8 py-12">
        {loading ? (
          <p className="text-xs uppercase tracking-widest text-black/40 text-center py-20">Loading artists...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-black">
            <p className="text-xl font-black uppercase">No Artists Found</p>
            <p className="text-sm text-black/40 mt-2 uppercase tracking-widest">
              No artists match your current filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-6 px-6 py-3 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest text-black/40 mb-8">
              {filtered.length} artist{filtered.length !== 1 ? "s" : ""} found
            </p>
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
                      <span className="text-xs font-bold uppercase">&euro;{artist.hourly_rate}/hr</span>
                    ) : artist.session_rate ? (
                      <span className="text-xs font-bold uppercase">&euro;{artist.session_rate}/session</span>
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
