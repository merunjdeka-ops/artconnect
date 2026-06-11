"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import GuideButton from "@/app/components/GuideButton";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import StarRating from "@/app/components/StarRating";
import ReviewForm from "@/app/components/ReviewForm";
import CommentSection from "@/app/components/CommentSection";

type AvailabilityPeriod = {
  id: string;
  start_date: string;
  end_date: string;
  hours_from: string;
  hours_to: string;
  days_of_week: number[];
  note: string;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Event types tailored to each artist category
const CATEGORY_EVENT_TYPES: Record<string, string[]> = {
  "Photography": ["Wedding", "Portrait Session", "Corporate Event", "Concert / Live Event", "Fashion / Editorial", "Product Photography", "Real Estate", "Birthday / Party", "Documentary", "Other"],
  "Videography": ["Wedding", "Corporate Event", "Concert / Live Event", "Fashion / Editorial", "Product Video", "Real Estate Tour", "Birthday / Party", "Documentary", "Short Film", "Music Video", "Other"],
  "Music": ["Wedding", "Birthday / Party", "Corporate Event", "Concert / Live Event", "Private Event", "Festival", "Club / Bar Night", "Ceremony", "Other"],
  "DJ": ["Wedding", "Birthday / Party", "Corporate Event", "Club / Bar Night", "Festival", "Private Event", "Concert / Live Event", "Other"],
  "Dance": ["Wedding", "Corporate Event", "Festival", "Birthday / Party", "Theatre Performance", "Private Event", "Workshop", "Other"],
  "Makeup Artist": ["Wedding", "Fashion / Editorial", "Film / TV Production", "Birthday / Party", "Corporate Event", "Special Effects", "Portrait Session", "Other"],
  "Hair Styling": ["Wedding", "Fashion / Editorial", "Film / TV Production", "Birthday / Party", "Portrait Session", "Corporate Event", "Other"],
  "Painting": ["Commission — Portrait", "Commission — Landscape", "Commission — Abstract", "Live Event Painting", "Mural", "Workshop", "Corporate Art", "Other"],
  "Illustration": ["Book / Editorial", "Commission — Portrait", "Commission — Custom", "Corporate Branding", "Children's Art", "Product Illustration", "Other"],
  "Graphic Design": ["Logo & Branding", "Poster / Print", "Social Media Content", "Packaging Design", "Web Design", "Event Branding", "Other"],
  "Pottery & Ceramics": ["Custom Commission", "Workshop", "Home Décor", "Gift Set", "Corporate Gift", "Other"],
  "Sculpture": ["Custom Commission", "Public Art", "Home Décor", "Corporate Art", "Workshop", "Other"],
  "Calligraphy": ["Wedding Invitations", "Event Signage", "Corporate Stationery", "Custom Lettering", "Workshop", "Other"],
  "Fashion Design": ["Custom Garment", "Alterations", "Costume Design", "Wedding Attire", "Event Styling", "Other"],
  "Tattoo Artist": ["Custom Tattoo", "Cover-Up", "Touch-Up", "Flash Design", "Other"],
  "Comedy & Stand-Up": ["Corporate Event", "Birthday / Party", "Private Event", "Festival", "Club / Bar Night", "Wedding", "Other"],
  "Poetry & Spoken Word": ["Wedding", "Corporate Event", "Festival", "Private Event", "Workshop", "Commission", "Other"],
  "Acting & Theatre": ["Theatre Performance", "Corporate Event", "Private Event", "Film / TV", "Workshop", "Other"],
  "Jewelry Making": ["Custom Commission", "Wedding Jewelry", "Corporate Gift", "Workshop", "Other"],
  "Interior Design": ["Home Styling", "Commercial Space", "Event Décor", "Consultation", "Other"],
  "Handcraft": ["Custom Commission", "Workshop", "Home Décor", "Corporate Gift", "Wedding Décor", "Other"],
};

const DEFAULT_EVENT_TYPES = ["Private Event", "Corporate Event", "Wedding", "Birthday / Party", "Festival", "Workshop", "Commission", "Other"];

function getEventTypes(category: string): string[] {
  return CATEGORY_EVENT_TYPES[category] ?? DEFAULT_EVENT_TYPES;
}

type Artist = {
  id: string;
  full_name: string;
  category: string;
  location: string;
  bio: string;
  hourly_rate: number | null;
  session_rate: number | null;
  instagram: string | null;
  website: string | null;
  is_available: boolean;
  email: string | null;
  avatar_url: string | null;
  daily_pic_url: string | null;
  daily_pic_caption: string | null;
  daily_pic_updated_at: string | null;
  availability_schedule: AvailabilityPeriod[] | null;
};

type Package = {
  id: string;
  name: string;
  price: number;
  pricing_type: string | null;
  duration_hours: number | null;
  description: string | null;
  includes: string | null;
};

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: string;
};

type Review = {
  id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

export default function ArtistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; title: string; index: number } | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  function handleShare() {
    const url = `https://goartconnect.com/artists/${id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: artist?.full_name ?? "Artist", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  }

  function isVideo(url: string) {
    return url.match(/\.(mp4|mov|webm|m4v)$/i) !== null || url.includes("/video/upload/");
  }

  useEffect(() => {
    if (!lightbox) return;
    const images = portfolio.filter(i => i.media_type === "image");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox(lb => lb ? { url: images[(lb.index + 1) % images.length].media_url, title: images[(lb.index + 1) % images.length].title, index: (lb.index + 1) % images.length } : null);
      if (e.key === "ArrowLeft") setLightbox(lb => lb ? { url: images[(lb.index - 1 + images.length) % images.length].media_url, title: images[(lb.index - 1 + images.length) % images.length].title, index: (lb.index - 1 + images.length) % images.length } : null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, portfolio]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [booking, setBooking] = useState({
    start_date: "",
    end_date: "",
    hours_per_day: "4",
    event_type: "",
    location: "",
    message: "",
  });
  const [bookingStatus, setBookingStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [bookingError, setBookingError] = useState("");
  const bookingRef = useRef<HTMLDivElement>(null);

  // Derived booking values
  const bookingDays = (() => {
    if (!booking.start_date) return 1;
    const end = booking.end_date || booking.start_date;
    const diff = Math.round((new Date(end).getTime() - new Date(booking.start_date).getTime()) / 86400000);
    return Math.max(1, diff + 1);
  })();
  const totalHours = bookingDays * parseFloat(booking.hours_per_day || "1");
  const estimatedTotal = selectedPkg
    ? selectedPkg.price
    : artist && artist.hourly_rate
    ? artist.hourly_rate * totalHours
    : null;

  const fetchReviews = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("reviews")
      .select("id, client_id, rating, comment, created_at, profiles(full_name)")
      .eq("artist_id", id)
      .order("created_at", { ascending: false });
    setReviews((data as Review[]) || []);
  }, [id]);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();

      const [{ data: artistData }, { data: portfolioData }, { data: pkgData }, { data: { user } }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("portfolio_items").select("*").eq("artist_id", id).order("created_at", { ascending: false }),
        supabase.from("packages").select("*").eq("artist_id", id).order("price", { ascending: true }),
        supabase.auth.getUser(),
      ]);

      if (!artistData || artistData.role !== "artist") {
        router.push("/artists");
        return;
      }

      setArtist(artistData);
      setPortfolio(portfolioData || []);
      setPackages(pkgData || []);

      if (user) {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setCurrentUser({ id: user.id, name: clientProfile?.full_name || "" });
      }

      setLoading(false);
    }
    load();
    fetchReviews();
  }, [id, router, fetchReviews]);

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) { router.push("/login"); return; }
    if (currentUser.id === artist?.id) {
      setBookingError("You cannot book yourself.");
      return;
    }

    setBookingStatus("sending");
    setBookingError("");

    try {
      const supabase = getSupabase();
      const durationHours = selectedPkg?.duration_hours ?? totalHours;
      const fullMessage = [
        booking.event_type ? `Event type: ${booking.event_type}` : "",
        booking.location ? `Location: ${booking.location}` : "",
        booking.end_date && booking.end_date !== booking.start_date
          ? `Date range: ${booking.start_date} → ${booking.end_date} (${bookingDays} day${bookingDays > 1 ? "s" : ""}, ${booking.hours_per_day}h/day)`
          : "",
        booking.message,
      ].filter(Boolean).join("\n");

      const { error } = await supabase.from("bookings").insert({
        artist_id: artist?.id,
        client_id: currentUser.id,
        event_date: booking.start_date || null,
        duration_hours: durationHours,
        message: fullMessage,
        status: "pending",
        package_name: selectedPkg?.name ?? null,
        package_price: selectedPkg?.price ?? estimatedTotal,
      });

      if (error) throw error;

      // Fire-and-forget email notification to artist
      if (artist?.email) {
        const { data: { session } } = await supabase.auth.getSession();
        fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            type: "booking_request",
            to: artist.email,
            artistName: artist.full_name,
            clientName: currentUser.name,
            date: booking.start_date,
            message: fullMessage,
          }),
        }).catch(() => {});
      }

      setBookingStatus("sent");
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Failed to send booking request.");
      setBookingStatus("error");
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
      <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
    </main>
  );

  if (!artist) return null;

  const isOwnProfile = currentUser?.id === artist.id;

  // Daily pic expires after 24 hours (like an Instagram story)
  const dailyPicActive = (() => {
    if (!artist.daily_pic_url || !artist.daily_pic_updated_at) return false;
    const age = Date.now() - new Date(artist.daily_pic_updated_at).getTime();
    return age < 24 * 60 * 60 * 1000;
  })();

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans text-black">

      {/* ── HERO BANNER ── */}
      <div className="relative w-full h-[65vh] min-h-[420px] overflow-hidden">
        {/* Full photo — avatar first, active daily pic as fallback, then gradient */}
        {(artist.avatar_url || dailyPicActive) ? (
          <img
            src={artist.avatar_url || artist.daily_pic_url!}
            alt={artist.full_name}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1a0000] to-[#E5000F]/30" />
        )}

        {/* Thin gradient ONLY at the very bottom so text is readable */}
        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/90 to-transparent" />

        {/* Floating navbar */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5 bg-gradient-to-b from-black/60 to-transparent">
          <Link href="/" className="text-xl font-black tracking-tight leading-none text-white drop-shadow">
            <span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>go</span><span className="uppercase">ARTCONNECT</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/artists" className="text-sm font-medium uppercase tracking-widest text-white/80 hover:text-white transition-colors drop-shadow">← All Artists</Link>
            {currentUser ? (
              <Link href="/dashboard" className="text-sm font-bold uppercase tracking-widest bg-black text-white px-5 py-2 hover:bg-[#E5000F] transition-colors">Dashboard</Link>
            ) : (
              <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
            )}
          </div>
        </nav>

        {/* Name + meta pinned to bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-2 drop-shadow">
            ✦ {artist.category}
          </p>
          <h1 className="text-[clamp(2.8rem,8vw,7rem)] font-black uppercase leading-none tracking-tight text-white drop-shadow-lg">
            {artist.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-5 mt-3">
            <span className="text-sm text-white/70 uppercase tracking-widest drop-shadow">{artist.location}</span>
            {avgRating !== null && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size="sm" />
                <span className="text-xs text-white/60 uppercase tracking-widest">{avgRating.toFixed(1)} ({reviews.length})</span>
              </div>
            )}
            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 ${artist.is_available ? "bg-black text-green-400 border border-green-400" : "bg-black text-[#E5000F] border border-[#E5000F]"}`}>
              {artist.is_available ? "● Available" : "● Busy"}
            </span>
          </div>
        </div>
      </div>

      {/* ── ACTION BAR ── */}
      <div className="bg-black border-b border-white/10 px-8 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {!isOwnProfile && (
            <button
              onClick={() => bookingRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-8 py-3 hover:bg-white hover:text-black transition-colors"
            >
              Book Now
            </button>
          )}
          {artist.instagram && (
            <a href={`https://instagram.com/${artist.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-widest border border-white/40 text-white px-5 py-3 hover:border-[#E5000F] hover:text-[#E5000F] transition-colors">
              Instagram
            </a>
          )}
          {artist.website && (
            <a href={artist.website} target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-widest border border-white/40 text-white px-5 py-3 hover:border-[#E5000F] hover:text-[#E5000F] transition-colors">
              Website
            </a>
          )}
          {isOwnProfile && (
            <Link href="/dashboard/setup"
              className="text-xs font-bold uppercase tracking-widest border border-[#E5000F] text-[#E5000F] px-5 py-3 hover:bg-[#E5000F] hover:text-white transition-colors">
              Edit Profile
            </Link>
          )}
          <button
            onClick={handleShare}
            className="text-xs font-bold uppercase tracking-widest border border-white/40 text-white px-5 py-3 hover:border-white hover:text-white transition-colors ml-auto"
          >
            {shareCopied ? "✓ Link Copied!" : "↗ Share Profile"}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="px-8 lg:px-16 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12 xl:gap-20">

        {/* Left: Bio + Portfolio + Reviews */}
        <div className="lg:col-span-2 min-w-0">

          {/* Bio */}
          <div className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">About</h2>
            <p className="text-base leading-relaxed text-black/80">{artist.bio}</p>
          </div>

          {/* Packages */}
          {packages.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">Service Packages</h2>
              <div className={`grid gap-px bg-white/10 border border-white/10 ${packages.length === 1 ? "grid-cols-1" : packages.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
                {packages.map((pkg, i) => {
                  const isLast = i === packages.length - 1;
                  const isSelected = selectedPkg?.id === pkg.id;
                  const includesList = pkg.includes?.split("\n").map(s => s.trim()).filter(Boolean) || [];
                  const pricingLabel: Record<string, string> = {
                    hourly: "/hr", session: "/session", half_day: " half day",
                    full_day: " full day", event: "/event", fixed: " fixed price",
                  };
                  const priceLabel = pricingLabel[pkg.pricing_type || "session"] || "/session";
                  return (
                    <div key={pkg.id} className={`p-6 flex flex-col transition-all ${isLast ? "bg-black text-white" : "bg-[#F2EDE4]"} ${isSelected ? "ring-4 ring-inset ring-[#E5000F]" : ""}`}>
                      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isLast ? "text-[#E5000F]" : "text-black/40"}`}>
                        {pkg.name}{isLast && packages.length > 1 ? " — Best" : ""}
                      </p>
                      <p className="text-3xl font-black mb-0">€{pkg.price}</p>
                      <p className={`text-xs uppercase tracking-widest mb-3 ${isLast ? "text-white/50" : "text-black/40"}`}>
                        {priceLabel}{pkg.duration_hours ? ` · ${pkg.duration_hours}h` : ""}
                      </p>
                      {pkg.description && (
                        <p className={`text-sm leading-relaxed mb-4 ${isLast ? "text-white/70" : "text-black/60"}`}>{pkg.description}</p>
                      )}
                      {includesList.length > 0 && (
                        <ul className={`flex-1 flex flex-col gap-1.5 mb-5 text-xs border-t pt-4 ${isLast ? "border-white/20 text-white/60" : "border-black/10 text-black/50"}`}>
                          {includesList.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className={`font-black shrink-0 ${isLast ? "text-[#E5000F]" : "text-black"}`}>✓</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                      {!isOwnProfile && (
                        <button
                          onClick={() => {
                            setSelectedPkg(isSelected ? null : pkg);
                            if (!isSelected) setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                          }}
                          className={`mt-auto py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                            isSelected
                              ? "bg-[#E5000F] text-white"
                              : isLast
                              ? "bg-white text-black hover:bg-[#E5000F] hover:text-white"
                              : "border border-black hover:bg-black hover:text-white"
                          }`}
                        >
                          {isSelected ? "✓ Selected" : "Select Package"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Story — only shown within 24h of upload */}
          {dailyPicActive && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-black/40">
                  {isVideo(artist.daily_pic_url!) ? "Today's Video" : "Today's Photo"}
                </h2>
                {artist.daily_pic_updated_at && (
                  <span className="text-xs text-black/30 uppercase tracking-widest">
                    {new Date(artist.daily_pic_updated_at).toLocaleDateString("en-IT", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <div className="border border-black overflow-hidden group">
                {isVideo(artist.daily_pic_url!) ? (
                  /* Video story — click to open fullscreen */
                  <div className="relative cursor-pointer" onClick={() => setStoryOpen(true)}>
                    <video
                      src={artist.daily_pic_url!}
                      className="w-full object-cover max-h-[480px]"
                      muted playsInline
                      onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                      onMouseLeave={e => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0; }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-black/60 group-hover:bg-[#E5000F] flex items-center justify-center transition-colors">
                        <span className="text-white text-2xl ml-1">▶</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Photo story — click to open fullscreen */
                  <div className="relative cursor-zoom-in" onClick={() => setStoryOpen(true)}>
                    <img src={artist.daily_pic_url!} alt="Daily story" className="w-full object-cover max-h-[480px] transition-transform duration-300 group-hover:scale-[1.02]" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-4">
                      <span className="text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">⤢</span>
                    </div>
                  </div>
                )}
                {artist.daily_pic_caption && (
                  <div className="px-5 py-4 border-t border-black bg-white">
                    <div className="text-sm text-black/70 leading-relaxed rich-caption" dangerouslySetInnerHTML={{ __html: artist.daily_pic_caption }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <div className="mb-12">
              {portfolio.filter(i => i.media_type === "image").length > 0 && (
                <>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Portfolio</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-black border border-black mb-10">
                    {portfolio.filter(i => i.media_type === "image").map((item, idx) => (
                      <div key={item.id} className="bg-[#F2EDE4] p-4 group">
                        <div
                          className="relative cursor-zoom-in overflow-hidden mb-3"
                          onClick={() => setLightbox({ url: item.media_url, title: item.title, index: idx })}
                        >
                          <img src={item.media_url} alt={item.title} className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">⤢</span>
                          </div>
                        </div>
                        <h3 className="font-black uppercase text-sm">{item.title}</h3>
                        {item.description && <p className="text-xs text-black/50 mt-1">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {portfolio.filter(i => i.media_type === "video").map(item => (
                <div key={item.id} className="bg-[#F2EDE4] border border-black p-4 mb-4">
                  <video src={item.media_url} controls className="w-full h-48 object-cover mb-3" />
                  <h3 className="font-black uppercase text-sm">{item.title}</h3>
                  {item.description && <p className="text-xs text-black/50 mt-1">{item.description}</p>}
                </div>
              ))}

              {portfolio.filter(i => ["soundcloud", "spotify", "youtube", "audio"].includes(i.media_type)).length > 0 && (
                <>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Music Samples</h2>
                  <div className="flex flex-col gap-px bg-black border border-black">
                    {portfolio.filter(i => ["soundcloud", "spotify", "youtube", "audio"].includes(i.media_type)).map(item => (
                      <div key={item.id} className="bg-[#F2EDE4] p-5">
                        <h3 className="font-black uppercase text-sm mb-1">{item.title}</h3>
                        {item.description && <p className="text-xs text-black/50 mb-3">{item.description}</p>}
                        {item.media_type === "soundcloud" && (
                          <iframe src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(item.media_url)}&color=%23E5000F&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`} width="100%" height="120" frameBorder="0" allow="autoplay" className="block" />
                        )}
                        {item.media_type === "spotify" && (() => {
                          const m = item.media_url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
                          return m ? <iframe src={`https://open.spotify.com/embed/${m[1]}/${m[2]}`} width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="block" /> : null;
                        })()}
                        {item.media_type === "youtube" && (() => {
                          const m = item.media_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                          return m ? <iframe src={`https://www.youtube.com/embed/${m[1]}`} width="100%" height="200" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="block" /> : null;
                        })()}
                        {item.media_type === "audio" && <audio src={item.media_url} controls className="w-full" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reviews */}
          <div className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">
              Reviews{reviews.length > 0 ? ` (${reviews.length})` : ""}
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-black/40 uppercase tracking-widest">No reviews yet.</p>
            ) : (
              <div className="flex flex-col gap-px bg-black border border-black">
                {reviews.map(review => (
                  <div key={review.id} className="bg-[#F2EDE4] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs font-bold uppercase tracking-widest">
                          {(Array.isArray(review.profiles) ? review.profiles[0]?.full_name : review.profiles?.full_name) ?? "Anonymous"}
                        </span>
                      </div>
                      <span className="text-xs text-black/30 uppercase tracking-widest">
                        {new Date(review.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm text-black/70 leading-relaxed mt-2">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentUser && !isOwnProfile && (
            <ReviewForm artistId={artist.id} clientId={currentUser.id} onReviewSubmitted={fetchReviews} />
          )}

          {/* Comments — always public; hide form on own profile */}
          <CommentSection artistId={artist.id} currentUser={isOwnProfile ? null : currentUser} />

        </div>

        {/* Right: Booking form OR own-profile panel */}
        <div ref={bookingRef} className="h-fit">
        {isOwnProfile ? (
          <div className="flex flex-col gap-4 sticky top-6">
            {/* Profile summary card */}
            <div className="border border-black bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Your Profile</p>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-black/10 pb-3">
                  <span className="text-xs uppercase tracking-widest text-black/50">Category</span>
                  <span className="text-xs font-bold uppercase">{artist.category}</span>
                </div>
                <div className="flex justify-between items-center border-b border-black/10 pb-3">
                  <span className="text-xs uppercase tracking-widest text-black/50">Location</span>
                  <span className="text-xs font-bold uppercase">{artist.location || "—"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-black/10 pb-3">
                  <span className="text-xs uppercase tracking-widest text-black/50">Status</span>
                  <span className={`text-xs font-bold uppercase ${artist.is_available ? "text-green-700" : "text-[#E5000F]"}`}>
                    {artist.is_available ? "● Available" : "● Busy"}
                  </span>
                </div>
                {artist.hourly_rate && (
                  <div className="flex justify-between items-center border-b border-black/10 pb-3">
                    <span className="text-xs uppercase tracking-widest text-black/50">Hourly Rate</span>
                    <span className="text-xs font-bold uppercase text-[#E5000F]">€{artist.hourly_rate}/hr</span>
                  </div>
                )}
                {artist.session_rate && (
                  <div className="flex justify-between items-center border-b border-black/10 pb-3">
                    <span className="text-xs uppercase tracking-widest text-black/50">Session Rate</span>
                    <span className="text-xs font-bold uppercase text-[#E5000F]">€{artist.session_rate}/session</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-b border-black/10 pb-3">
                  <span className="text-xs uppercase tracking-widest text-black/50">Portfolio</span>
                  <span className="text-xs font-bold uppercase">{portfolio.length} item{portfolio.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-widest text-black/50">Reviews</span>
                  <span className="text-xs font-bold uppercase">
                    {reviews.length > 0 ? `${avgRating?.toFixed(1)} ★ (${reviews.length})` : "None yet"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="border border-black bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Quick Actions</p>
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/setup" className="block text-center py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors">
                  Edit Profile
                </Link>
                <Link href="/dashboard/portfolio" className="block text-center py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                  Manage Portfolio
                </Link>
                <Link href="/dashboard/availability" className="block text-center py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                  Set Availability
                </Link>
                <Link href="/dashboard/bookings" className="block text-center py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                  View Bookings
                </Link>
                <Link href="/dashboard" className="block text-center py-3 border border-black/30 text-xs font-bold uppercase tracking-widest text-black/50 hover:border-black hover:text-black transition-colors">
                  ← Dashboard
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="sticky top-6">
            <div className="border border-black bg-white p-6">
              <h2 className="text-lg font-black uppercase mb-5">Book {artist.full_name?.split(" ")[0]}</h2>

              {bookingStatus === "sent" ? (
                <div className="text-center py-6">
                  <p className="font-black uppercase text-green-700 mb-2">Request Sent!</p>
                  <p className="text-xs text-black/50">The artist will get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="flex flex-col gap-4">

                  {/* Package banner */}
                  {selectedPkg ? (
                    <div className="bg-black text-white p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Package Selected</p>
                        <p className="font-black uppercase text-sm">{selectedPkg.name}</p>
                        <p className="text-[#E5000F] font-black text-lg">€{selectedPkg.price}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedPkg(null)} className="text-white/40 hover:text-white text-lg leading-none transition-colors">✕</button>
                    </div>
                  ) : packages.length > 0 ? (
                    <p className="text-xs text-black/40 uppercase tracking-widest border border-dashed border-black/20 p-3 text-center">
                      ↑ Select a package above or fill in custom details below
                    </p>
                  ) : null}

                  {/* Availability windows */}
                  {artist.availability_schedule && artist.availability_schedule.length > 0 && (
                    <div className="border border-black/20 bg-black/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest mb-3 text-black/50">When {artist.full_name?.split(" ")[0]} Is Available</p>
                      <div className="flex flex-col gap-2">
                        {artist.availability_schedule.map(p => {
                          const start = new Date(p.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                          const end = p.end_date && p.end_date !== p.start_date
                            ? new Date(p.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                            : null;
                          const days = p.days_of_week.length === 7 ? "Every day"
                            : JSON.stringify(p.days_of_week) === JSON.stringify([1,2,3,4,5]) ? "Mon–Fri"
                            : JSON.stringify(p.days_of_week) === JSON.stringify([0,6]) ? "Weekends"
                            : p.days_of_week.map((d: number) => DAY_LABELS[d]).join(", ");
                          return (
                            <div key={p.id} className="flex items-start gap-2">
                              <span className="text-[#E5000F] font-black text-xs mt-0.5 shrink-0">●</span>
                              <div>
                                <p className="text-xs font-bold">
                                  {end ? `${start} → ${end}` : start}
                                </p>
                                <p className="text-xs text-black/40">{days} · {p.hours_from}–{p.hours_to}{p.note ? ` · ${p.note}` : ""}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Event type */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Event Type</label>
                    <select
                      value={booking.event_type}
                      onChange={e => setBooking(p => ({ ...p, event_type: e.target.value }))}
                      className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-white appearance-none cursor-pointer"
                    >
                      <option value="">— Select type —</option>
                      {getEventTypes(artist.category).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date range */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Start Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={booking.start_date}
                      onChange={e => setBooking(p => ({
                        ...p,
                        start_date: e.target.value,
                        end_date: p.end_date && p.end_date < e.target.value ? e.target.value : p.end_date,
                      }))}
                      className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">
                      End Date <span className="text-black/30 normal-case font-normal">— leave blank for single day</span>
                    </label>
                    <input
                      type="date"
                      min={booking.start_date || new Date().toISOString().split("T")[0]}
                      value={booking.end_date}
                      onChange={e => setBooking(p => ({ ...p, end_date: e.target.value }))}
                      className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent"
                    />
                  </div>

                  {/* Duration summary badge */}
                  {booking.start_date && (
                    <div className="bg-black text-white px-4 py-2 flex items-center justify-between text-xs uppercase tracking-widest">
                      <span className="text-white/50">Duration</span>
                      <span className="font-black">
                        {bookingDays} day{bookingDays > 1 ? "s" : ""}
                        {" · "}{totalHours}h total
                      </span>
                    </div>
                  )}

                  {/* Hours per day */}
                  {!selectedPkg && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2">
                        Hours per Day
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["2", "4", "6", "8"].map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setBooking(p => ({ ...p, hours_per_day: h }))}
                            className={`py-2.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                              booking.hours_per_day === h
                                ? "bg-black text-white border-black"
                                : "border-black hover:bg-black/5"
                            }`}
                          >
                            {h}h
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-black/40 uppercase tracking-widest">Custom:</span>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={booking.hours_per_day}
                          onChange={e => setBooking(p => ({ ...p, hours_per_day: e.target.value }))}
                          className="w-20 border border-black px-3 py-1.5 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent text-center"
                        />
                        <span className="text-xs text-black/40">hrs</span>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Location / Venue</label>
                    <input
                      type="text"
                      placeholder="City, venue, or address…"
                      value={booking.location}
                      onChange={e => setBooking(p => ({ ...p, location: e.target.value }))}
                      className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent placeholder:text-black/30"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Message *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe your project, style preferences, special requests…"
                      value={booking.message}
                      onChange={e => setBooking(p => ({ ...p, message: e.target.value }))}
                      className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-black/30 bg-transparent"
                    />
                  </div>

                  {bookingError && <p className="text-xs text-[#E5000F] uppercase tracking-widest">{bookingError}</p>}

                  {/* Cost breakdown */}
                  <div className="border border-black/10 bg-white p-4 flex flex-col gap-2">
                    {!selectedPkg && artist.hourly_rate && (
                      <>
                        <div className="flex justify-between text-xs text-black/40 uppercase tracking-widest">
                          <span>Rate</span>
                          <span>€{artist.hourly_rate}/hr</span>
                        </div>
                        <div className="flex justify-between text-xs text-black/40 uppercase tracking-widest">
                          <span>{bookingDays} day{bookingDays > 1 ? "s" : ""} × {booking.hours_per_day}h</span>
                          <span>{totalHours}h</span>
                        </div>
                        <div className="border-t border-black/10 pt-2 mt-1" />
                      </>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-widest">Estimated Total</span>
                      <span className="font-black text-xl text-[#E5000F]">
                        {estimatedTotal != null ? `€${Math.round(estimatedTotal)}` : "To be agreed"}
                      </span>
                    </div>
                  </div>

                  {!currentUser ? (
                    <Link href="/login" className="block text-center py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors">
                      Login to Book
                    </Link>
                  ) : (
                    <button
                      type="submit"
                      disabled={bookingStatus === "sending"}
                      className="py-4 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50"
                    >
                      {bookingStatus === "sending" ? "Sending..." : "Send Booking Request"}
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
        </div>


      </div>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
        <span className="text-sm font-black tracking-tight leading-none">
          <span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>go</span><span className="uppercase">ARTCONNECT</span>
        </span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
        </div>
      </footer>

      {/* ── STORY FULLSCREEN ── */}
      {storyOpen && dailyPicActive && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setStoryOpen(false)}
        >
          <button onClick={() => setStoryOpen(false)} className="absolute top-5 right-6 text-white/60 hover:text-white text-3xl font-black leading-none transition-colors z-10">✕</button>
          <div className="max-w-4xl max-h-[90vh] mx-8 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            {isVideo(artist.daily_pic_url!) ? (
              <video src={artist.daily_pic_url!} controls autoPlay className="max-h-[80vh] max-w-full" />
            ) : (
              <img src={artist.daily_pic_url!} alt="Story" className="max-h-[80vh] max-w-full object-contain" />
            )}
            {artist.daily_pic_caption && (
              <div className="text-white/70 text-sm text-center max-w-xl rich-caption" dangerouslySetInnerHTML={{ __html: artist.daily_pic_caption }} />
            )}
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightbox && (() => {
        const images = portfolio.filter(i => i.media_type === "image");
        const prev = () => setLightbox({ url: images[(lightbox.index - 1 + images.length) % images.length].media_url, title: images[(lightbox.index - 1 + images.length) % images.length].title, index: (lightbox.index - 1 + images.length) % images.length });
        const next = () => setLightbox({ url: images[(lightbox.index + 1) % images.length].media_url, title: images[(lightbox.index + 1) % images.length].title, index: (lightbox.index + 1) % images.length });
        return (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-5 right-6 text-white/60 hover:text-white text-3xl font-black leading-none transition-colors z-10"
            >
              ✕
            </button>

            {/* Prev */}
            {images.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl font-black transition-colors z-10 px-4 py-2"
              >
                ‹
              </button>
            )}

            {/* Image */}
            <div className="max-w-5xl max-h-[90vh] mx-12 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
              <img
                src={lightbox.url}
                alt={lightbox.title}
                className="max-h-[80vh] max-w-full object-contain"
              />
              <div className="flex items-center gap-4">
                <p className="text-white font-black uppercase text-sm tracking-widest">{lightbox.title}</p>
                {images.length > 1 && (
                  <span className="text-white/30 text-xs uppercase tracking-widest">{lightbox.index + 1} / {images.length}</span>
                )}
              </div>
            </div>

            {/* Next */}
            {images.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl font-black transition-colors z-10 px-4 py-2"
              >
                ›
              </button>
            )}
          </div>
        );
      })()}

      <GuideButton
        title="Artist Profile Guide"
        steps={[
          { title: "View the Portfolio", description: "Scroll down to see the artist's portfolio — photos, videos or audio samples of their past work." },
          { title: "Check Service Packages", description: "Packages show what the artist offers at different price points. Each card lists what's included." },
          { title: "Select a Package", description: "Click 'Select Package' on any package card — it highlights in red and pre-fills the booking form on the right." },
          { title: "Send a Booking Request", description: "Fill in your preferred date, add a message describing your project, then click 'Send Booking Request'." },
          { title: "No Package? No Problem", description: "You can skip selecting a package and just fill in the date, hours, and message for a custom request." },
          { title: "Read Reviews", description: "Scroll down to see reviews left by previous clients. After your booking you can leave one too." },
          { title: "Login Required to Book", description: "You need a free account to send a booking request. Click 'Login to Book' if you aren't signed in yet." },
        ]}
      />
    </main>
  );
}
