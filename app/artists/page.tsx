"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import GuideButton from "@/app/components/GuideButton";

function optimizeCloudinaryUrl(url: string, width: number): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto,c_fill/`);
}

const HANDCRAFT_SUBCATEGORIES = [
  "Handcraft - Wood",
  "Handcraft - Paper & Origami",
  "Handcraft - Textile & Sewing",
  "Handcraft - Knitting & Crochet",
  "Handcraft - Embroidery",
  "Handcraft - Leather",
  "Handcraft - Ceramics & Clay",
  "Handcraft - Candles & Soap",
  "Handcraft - Resin Art",
  "Handcraft - Glass & Mosaic",
  "Handcraft - Macramé",
  "Handcraft - Jewelry Making",
  "Handcraft - Other",
];

const CATEGORIES = [
  "All", "Photography", "Music", "Makeup Artist", "Painting", "Illustration",
  "Videography", "DJ", "Dance", "Hair Styling", "Graphic Design",
  "Pottery & Ceramics", "Sculpture", "Calligraphy", "Fashion Design",
  "Tattoo Artist", "Comedy & Stand-Up", "Poetry & Spoken Word",
  "Acting & Theatre", "Handcraft", "Interior Design",
  ...HANDCRAFT_SUBCATEGORIES,
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_az", label: "Name A-Z" },
  { value: "rating", label: "Top Rated" },
];

const PRICING_TYPES = [
  { value: "all", label: "All Types" },
  { value: "hourly", label: "Per Hour" },
  { value: "session", label: "Per Session" },
  { value: "half_day", label: "Half Day" },
  { value: "full_day", label: "Full Day" },
  { value: "event", label: "Per Event" },
  { value: "fixed", label: "Fixed Price" },
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
  avg_rating?: number | null;
  avatar_url?: string | null;
};

function ArtistsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loggedIn, setLoggedIn] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get("category") || "All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Advanced filter state
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [pricingType, setPricingType] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [minRating, setMinRating] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();

      // Check if user is logged in to show correct navbar
      const { data: { user } } = await supabase.auth.getUser();
      setLoggedIn(!!user);

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, category, location, bio, hourly_rate, session_rate, is_available, avatar_url")
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

    // Category filter
    if (activeCategory !== "All") {
      if (activeCategory === "Handcraft") {
        result = result.filter(a => a.category?.startsWith("Handcraft"));
      } else {
        result = result.filter(a => a.category === activeCategory);
      }
    }

    // Text search (name, location, bio)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.full_name?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q)
      );
    }

    // Location filter
    if (locationFilter.trim()) {
      const q = locationFilter.toLowerCase();
      result = result.filter(a => a.location?.toLowerCase().includes(q));
    }

    // Availability
    if (availableOnly) {
      result = result.filter(a => a.is_available);
    }

    // Pricing type filter
    if (pricingType === "hourly") {
      result = result.filter(a => a.hourly_rate !== null);
    } else if (pricingType === "session") {
      result = result.filter(a => a.session_rate !== null);
    }

    // Price range (works across hourly + session)
    const min = minPrice !== "" ? parseFloat(minPrice) : null;
    const max = maxPrice !== "" ? parseFloat(maxPrice) : null;
    if (min !== null || max !== null) {
      result = result.filter(a => {
        const rate = pricingType === "session"
          ? (a.session_rate ?? null)
          : pricingType === "hourly"
          ? (a.hourly_rate ?? null)
          : (a.hourly_rate ?? a.session_rate ?? null);
        if (rate === null) return false;
        if (min !== null && rate < min) return false;
        if (max !== null && rate > max) return false;
        return true;
      });
    }

    // Min rating filter
    const minR = minRating !== "" ? parseFloat(minRating) : null;
    if (minR !== null) {
      result = result.filter(a => (a.avg_rating ?? 0) >= minR);
    }

    // Sort
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
    } else if (sortBy === "rating") {
      result = [...result].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    }

    return result;
  }, [artists, activeCategory, search, availableOnly, minPrice, maxPrice, sortBy, pricingType, locationFilter, minRating]);

  // Build active filter chips
  const activeFilters: { label: string; clear: () => void }[] = [];
  if (activeCategory !== "All") activeFilters.push({ label: activeCategory, clear: () => setActiveCategory("All") });
  if (availableOnly) activeFilters.push({ label: "Available Only", clear: () => setAvailableOnly(false) });
  if (pricingType !== "all") activeFilters.push({ label: PRICING_TYPES.find(p => p.value === pricingType)?.label || pricingType, clear: () => setPricingType("all") });
  if (minPrice !== "") activeFilters.push({ label: `Min €${minPrice}`, clear: () => setMinPrice("") });
  if (maxPrice !== "") activeFilters.push({ label: `Max €${maxPrice}`, clear: () => setMaxPrice("") });
  if (locationFilter !== "") activeFilters.push({ label: `📍 ${locationFilter}`, clear: () => setLocationFilter("") });
  if (minRating !== "") activeFilters.push({ label: `★ ${minRating}+`, clear: () => setMinRating("") });
  if (sortBy !== "newest") activeFilters.push({ label: SORT_OPTIONS.find(o => o.value === sortBy)?.label || sortBy, clear: () => setSortBy("newest") });

  const hasActiveFilters = activeFilters.length > 0 || search.trim() !== "";

  function clearAllFilters() {
    setActiveCategory("All");
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setAvailableOnly(false);
    setSortBy("newest");
    setPricingType("all");
    setLocationFilter("");
    setMinRating("");
  }

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"Downtown,Georgia,serif", fontWeight:"bold", fontStyle:"italic"}}>go</span><span className="uppercase">ARTCONNECT</span></Link>
        <div className="flex items-center gap-6">
          {loggedIn ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Dashboard</Link>
              <Link href="/dashboard/settings" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Settings</Link>
              <button
                onClick={async () => { await getSupabase().auth.signOut(); router.push("/"); }}
                className="text-sm font-bold uppercase tracking-widest bg-black text-white px-5 py-2 hover:bg-[#E5000F] transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
              <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
            </>
          )}
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
        {/* Main category row */}
        <div className="overflow-x-auto -mx-2 px-2 scrollbar-none mb-2">
          <div className="flex gap-2 min-w-max">
            {["All", "Photography", "Music", "Makeup Artist", "Painting", "Illustration",
              "Videography", "DJ", "Dance", "Hair Styling", "Graphic Design",
              "Pottery & Ceramics", "Sculpture", "Calligraphy", "Fashion Design",
              "Tattoo Artist", "Comedy & Stand-Up", "Poetry & Spoken Word",
              "Acting & Theatre", "Interior Design", "Handcraft",
            ].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors whitespace-nowrap ${
                  activeCategory === cat || (cat === "Handcraft" && activeCategory.startsWith("Handcraft"))
                    ? "bg-black text-white border-black"
                    : "border-black text-black hover:bg-black hover:text-white"
                }`}
              >
                {cat === "Handcraft" ? "🧵 Handcraft" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Handcraft subcategory row — shown when Handcraft is active */}
        {(activeCategory === "Handcraft" || activeCategory.startsWith("Handcraft -")) && (
          <div className="overflow-x-auto -mx-2 px-2 scrollbar-none mt-3 pt-3 border-t border-black/10">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setActiveCategory("Handcraft")}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors whitespace-nowrap ${
                  activeCategory === "Handcraft"
                    ? "bg-[#E5000F] text-white border-[#E5000F]"
                    : "border-black/40 text-black/60 hover:border-black hover:text-black"
                }`}
              >
                All Handcraft
              </button>
              {HANDCRAFT_SUBCATEGORIES.map(sub => (
                <button
                  key={sub}
                  onClick={() => setActiveCategory(sub)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors whitespace-nowrap ${
                    activeCategory === sub
                      ? "bg-[#E5000F] text-white border-[#E5000F]"
                      : "border-black/40 text-black/60 hover:border-black hover:text-black"
                  }`}
                >
                  {sub.replace("Handcraft - ", "")}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ADVANCED FILTERS ROW */}
      <section className="px-8 py-5 border-b border-black">
        <div className="flex flex-wrap gap-x-8 gap-y-4 items-end">

          {/* Pricing Type */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Pricing Type</span>
            <div className="relative">
              <select
                value={pricingType}
                onChange={e => setPricingType(e.target.value)}
                className="border border-black px-3 py-2 pr-8 bg-white text-xs font-bold uppercase tracking-widest outline-none focus:border-[#E5000F] transition-colors cursor-pointer appearance-none"
              >
                {PRICING_TYPES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black text-xs">&#9660;</span>
            </div>
          </div>

          {/* Price range */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">
              Price Range (&euro;) {pricingType !== "all" && `— ${PRICING_TYPES.find(p => p.value === pricingType)?.label}`}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" placeholder="Min"
                value={minPrice} onChange={e => setMinPrice(e.target.value)}
                className="border border-black w-20 px-3 py-2 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
              />
              <span className="text-xs font-bold text-black/40">to</span>
              <input
                type="number" min="0" placeholder="Max"
                value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                className="border border-black w-20 px-3 py-2 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
              />
            </div>
          </div>

          {/* Location filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">City / Location</span>
            <input
              type="text" placeholder="e.g. Florence, Milan…"
              value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
              className="border border-black px-3 py-2 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 w-44"
            />
          </div>


          {/* Availability */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Availability</span>
            <button
              onClick={() => setAvailableOnly(v => !v)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors whitespace-nowrap ${
                availableOnly ? "bg-[#E5000F] text-white border-[#E5000F]" : "border-black text-black hover:bg-black hover:text-white"
              }`}
            >
              {availableOnly ? "✓ Available Only" : "Available Only"}
            </button>
          </div>

          {/* Sort — pushed to right */}
          <div className="flex flex-col gap-1 ml-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Sort By</span>
            <div className="relative">
              <select
                value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="border border-black px-3 py-2 pr-8 bg-white text-xs font-bold uppercase tracking-widest outline-none focus:border-[#E5000F] transition-colors cursor-pointer appearance-none"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black text-xs">&#9660;</span>
            </div>
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
            <p className="text-xs uppercase tracking-widest text-black/40 mb-6">
              {filtered.length} artist{filtered.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(artist => (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="group block"
                >
                  {/* Cover image */}
                  <div className="relative overflow-hidden bg-black aspect-[4/3] mb-3">
                    {artist.avatar_url ? (
                      <img
                        src={optimizeCloudinaryUrl(artist.avatar_url, 600)}
                        alt={artist.full_name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black">
                        <span className="text-white font-black text-6xl opacity-20">
                          {artist.full_name?.[0]?.toUpperCase() || "A"}
                        </span>
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
                    {/* Availability dot */}
                    {artist.is_available && (
                      <div className="absolute top-3 left-3">
                        <span className="flex items-center gap-1.5 bg-black/70 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 backdrop-blur-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                          Available
                        </span>
                      </div>
                    )}
                    {/* Rate badge */}
                    {(artist.hourly_rate || artist.session_rate) && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-[#E5000F] text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                          {artist.hourly_rate ? `€${artist.hourly_rate}/hr` : `€${artist.session_rate}/session`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card footer: avatar + name / category + location */}
                  <div className="flex items-center justify-between gap-3 px-0.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Small avatar */}
                      <div className="w-8 h-8 flex-shrink-0 overflow-hidden rounded-full border border-black/20">
                        {artist.avatar_url ? (
                          <img src={optimizeCloudinaryUrl(artist.avatar_url, 64)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <span className="text-white font-black text-xs">
                              {artist.full_name?.[0]?.toUpperCase() || "A"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black uppercase text-sm leading-tight truncate">{artist.full_name}</p>
                        <p className="text-xs text-black/50 uppercase tracking-widest truncate">{artist.location}</p>
                      </div>
                    </div>
                    {/* Category tag */}
                    <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest border border-black/30 px-2 py-0.5 text-black/50 group-hover:border-[#E5000F] group-hover:text-[#E5000F] transition-colors whitespace-nowrap">
                      {artist.category?.split(" ")[0]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"Downtown,Georgia,serif", fontWeight:"bold", fontStyle:"italic"}}>go</span><span className="uppercase">ARTCONNECT</span></span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
        </div>
      </footer>

      <GuideButton
        title="Browsing Artists"
        steps={[
          { title: "Search by Name or Location", description: "Type in the search bar at the top to find artists by name, city, or keywords from their bio." },
          { title: "Filter by Category", description: "Click any category button (Photography, Music, DJ, etc.) to show only artists in that field." },
          { title: "Set a Price Range", description: "Use the Min/Max price fields to filter artists by their hourly or session rate." },
          { title: "Show Available Only", description: "Toggle 'Available Only' to hide artists who are currently busy and only show those ready to book." },
          { title: "Sort Results", description: "Use the Sort By dropdown to order results by price (low/high) or name A–Z." },
          { title: "Open an Artist Profile", description: "Click any artist card to see their full profile, portfolio, packages and send a booking request." },
        ]}
      />
    </main>
  );
}

export default function ArtistsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
      </main>
    }>
      <ArtistsPageInner />
    </Suspense>
  );
}










