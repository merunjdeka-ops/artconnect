"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import GuideButton from "@/app/components/GuideButton";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import StarRating from "@/app/components/StarRating";
import ReviewForm from "@/app/components/ReviewForm";
import CommentSection from "@/app/components/CommentSection";

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
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [booking, setBooking] = useState({ event_date: "", duration_hours: "1", message: "" });
  const [bookingStatus, setBookingStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [bookingError, setBookingError] = useState("");
  const bookingRef = useRef<HTMLDivElement>(null);

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
      const { error } = await supabase.from("bookings").insert({
        artist_id: artist?.id,
        client_id: currentUser.id,
        event_date: booking.event_date || null,
        duration_hours: selectedPkg?.duration_hours ?? parseFloat(booking.duration_hours),
        message: booking.message,
        status: "pending",
        package_name: selectedPkg?.name ?? null,
        package_price: selectedPkg?.price ?? null,
      });

      if (error) throw error;

      // Fire-and-forget email notification to artist
      if (artist?.email) {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "booking_request",
            to: artist.email,
            artistName: artist.full_name,
            clientName: currentUser.name,
            date: booking.event_date,
            message: booking.message,
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

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return (
    <main className="min-h-screen bg-black font-sans text-white">

      {/* ── HERO BANNER ── */}
      <div className="relative w-full h-[60vh] min-h-[400px] overflow-hidden">
        {/* Background photo */}
        {artist.avatar_url ? (
          <img
            src={artist.avatar_url}
            alt={artist.full_name}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 bg-[#1a0000]" />
        )}

        {/* Dark gradient overlay — heavy at bottom, light at top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
        {/* Red tint on sides */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#E5000F]/20 via-transparent to-black/40" />

        {/* Floating navbar on top of hero */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5">
          <Link href="/" className="text-xl font-black tracking-tight uppercase text-white drop-shadow">ArtConnect</Link>
          <div className="flex items-center gap-6">
            <Link href="/artists" className="text-sm font-medium uppercase tracking-widest text-white/70 hover:text-white transition-colors">← All Artists</Link>
            {currentUser ? (
              <Link href="/dashboard" className="text-sm font-bold uppercase tracking-widest bg-white text-black px-5 py-2 hover:bg-[#E5000F] hover:text-white transition-colors">Dashboard</Link>
            ) : (
              <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-white hover:text-black transition-colors">Join Now</Link>
            )}
          </div>
        </nav>

        {/* Hero content — name + meta at bottom left */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-10 max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">
            ✦ {artist.category}
          </p>
          <h1 className="text-[clamp(3rem,9vw,8rem)] font-black uppercase leading-none tracking-tight text-white">
            {artist.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-6 mt-4">
            <span className="text-sm text-white/60 uppercase tracking-widest">{artist.location}</span>
            {avgRating !== null && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size="sm" />
                <span className="text-xs text-white/50 uppercase tracking-widest">
                  {avgRating.toFixed(1)} ({reviews.length})
                </span>
              </div>
            )}
            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 border ${artist.is_available ? "border-green-400 text-green-400" : "border-[#E5000F] text-[#E5000F]"}`}>
              {artist.is_available ? "● Available" : "● Busy"}
            </span>
          </div>
        </div>
      </div>

      {/* ── ACTION BAR ── */}
      <div className="bg-[#0d0000] border-b border-white/10 px-8 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-4">
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
              className="text-xs font-bold uppercase tracking-widest border border-white/30 text-white/70 px-5 py-3 hover:border-white hover:text-white transition-colors">
              Instagram
            </a>
          )}
          {artist.website && (
            <a href={artist.website} target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-widest border border-white/30 text-white/70 px-5 py-3 hover:border-white hover:text-white transition-colors">
              Website
            </a>
          )}
          {isOwnProfile && (
            <Link href="/dashboard/setup"
              className="text-xs font-bold uppercase tracking-widest border border-[#E5000F] text-[#E5000F] px-5 py-3 hover:bg-[#E5000F] hover:text-white transition-colors">
              Edit Profile
            </Link>
          )}
          <div className="ml-auto flex gap-6">
            {artist.hourly_rate && (
              <div className="text-right">
                <p className="text-xs text-white/30 uppercase tracking-widest">Hourly</p>
                <p className="font-black text-xl text-white">€{artist.hourly_rate}</p>
              </div>
            )}
            {artist.session_rate && (
              <div className="text-right">
                <p className="text-xs text-white/30 uppercase tracking-widest">Session</p>
                <p className="font-black text-xl text-white">€{artist.session_rate}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Left: Bio + Portfolio + Reviews */}
        <div className="lg:col-span-2">

          {/* Bio */}
          <div className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">About</h2>
            <p className="text-base leading-relaxed text-white/70">{artist.bio}</p>
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
                    <div key={pkg.id} className={`p-6 flex flex-col transition-all ${isLast ? "bg-[#E5000F]" : "bg-[#111]"} ${isSelected ? "ring-4 ring-inset ring-white" : ""}`}>
                      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isLast ? "text-white/70" : "text-white/30"}`}>
                        {pkg.name}{isLast && packages.length > 1 ? " — Best" : ""}
                      </p>
                      <p className="text-3xl font-black mb-0 text-white">€{pkg.price}</p>
                      <p className={`text-xs uppercase tracking-widest mb-3 ${isLast ? "text-white/60" : "text-white/30"}`}>
                        {priceLabel}{pkg.duration_hours ? ` · ${pkg.duration_hours}h` : ""}
                      </p>
                      {pkg.description && (
                        <p className="text-sm leading-relaxed mb-4 text-white/60">{pkg.description}</p>
                      )}
                      {includesList.length > 0 && (
                        <ul className={`flex-1 flex flex-col gap-1.5 mb-5 text-xs border-t pt-4 ${isLast ? "border-white/30 text-white/70" : "border-white/10 text-white/40"}`}>
                          {includesList.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="font-black shrink-0 text-[#E5000F]">✓</span>
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
                              ? "bg-white text-black"
                              : isLast
                              ? "bg-black/20 text-white hover:bg-white hover:text-black"
                              : "border border-white/30 text-white hover:bg-white hover:text-black"
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

          {/* Daily Pic */}
          {artist.daily_pic_url && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Today&apos;s Photo</h2>
                {artist.daily_pic_updated_at && (
                  <span className="text-xs text-white/20 uppercase tracking-widest">
                    {new Date(artist.daily_pic_updated_at).toLocaleDateString("en-IT", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <div className="border border-white/10 overflow-hidden">
                <img src={artist.daily_pic_url} alt="Daily photo" className="w-full object-cover max-h-[480px]" />
                {artist.daily_pic_caption && (
                  <div className="px-5 py-4 border-t border-white/10 bg-[#111]">
                    <p className="text-sm text-white/60 leading-relaxed">{artist.daily_pic_caption}</p>
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
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">Portfolio</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10 border border-white/10 mb-10">
                    {portfolio.filter(i => i.media_type === "image").map(item => (
                      <div key={item.id} className="bg-[#111] p-4">
                        <img src={item.media_url} alt={item.title} className="w-full h-48 object-cover mb-3" />
                        <h3 className="font-black uppercase text-sm text-white">{item.title}</h3>
                        {item.description && <p className="text-xs text-white/40 mt-1">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {portfolio.filter(i => i.media_type === "video").map(item => (
                <div key={item.id} className="bg-[#111] border border-white/10 p-4 mb-4">
                  <video src={item.media_url} controls className="w-full h-48 object-cover mb-3" />
                  <h3 className="font-black uppercase text-sm text-white">{item.title}</h3>
                  {item.description && <p className="text-xs text-white/40 mt-1">{item.description}</p>}
                </div>
              ))}

              {portfolio.filter(i => ["soundcloud", "spotify", "youtube", "audio"].includes(i.media_type)).length > 0 && (
                <>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">Music Samples</h2>
                  <div className="flex flex-col gap-px bg-white/10 border border-white/10">
                    {portfolio.filter(i => ["soundcloud", "spotify", "youtube", "audio"].includes(i.media_type)).map(item => (
                      <div key={item.id} className="bg-[#111] p-5">
                        <h3 className="font-black uppercase text-sm mb-1 text-white">{item.title}</h3>
                        {item.description && <p className="text-xs text-white/40 mb-3">{item.description}</p>}
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">
              Reviews{reviews.length > 0 ? ` (${reviews.length})` : ""}
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-white/30 uppercase tracking-widest">No reviews yet.</p>
            ) : (
              <div className="flex flex-col gap-px bg-white/10 border border-white/10">
                {reviews.map(review => (
                  <div key={review.id} className="bg-[#111] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white">
                          {(Array.isArray(review.profiles) ? review.profiles[0]?.full_name : review.profiles?.full_name) ?? "Anonymous"}
                        </span>
                      </div>
                      <span className="text-xs text-white/20 uppercase tracking-widest">
                        {new Date(review.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm text-white/50 leading-relaxed mt-2">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentUser && !isOwnProfile && (
            <ReviewForm artistId={artist.id} clientId={currentUser.id} onReviewSubmitted={fetchReviews} />
          )}
        </div>

        {/* Right: Booking form */}
        {!isOwnProfile && (
          <div ref={bookingRef}>
            <div className="border border-white/10 bg-[#111] p-6 sticky top-6">
              <h2 className="text-lg font-black uppercase mb-5 text-white">Book {artist.full_name?.split(" ")[0]}</h2>

              {bookingStatus === "sent" ? (
                <div className="text-center py-6">
                  <p className="font-black uppercase text-green-400 mb-2">Request Sent!</p>
                  <p className="text-xs text-white/40">The artist will get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="flex flex-col gap-4">
                  {selectedPkg ? (
                    <div className="bg-[#E5000F] p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-widest mb-0.5">Package Selected</p>
                        <p className="font-black uppercase text-sm text-white">{selectedPkg.name}</p>
                        <p className="text-white font-black text-lg">€{selectedPkg.price}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedPkg(null)} className="text-white/60 hover:text-white text-lg leading-none transition-colors">✕</button>
                    </div>
                  ) : packages.length > 0 ? (
                    <p className="text-xs text-white/30 uppercase tracking-widest border border-dashed border-white/10 p-3 text-center">
                      ↑ Select a package above or fill in custom details below
                    </p>
                  ) : null}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-white/50">Date</label>
                    <input type="date" value={booking.event_date} onChange={e => setBooking(p => ({ ...p, event_date: e.target.value }))}
                      className="w-full border border-white/20 bg-black/50 text-white px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors" />
                  </div>

                  {!selectedPkg && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-white/50">Duration (hours)</label>
                      <input type="number" min="1" max="24" value={booking.duration_hours} onChange={e => setBooking(p => ({ ...p, duration_hours: e.target.value }))}
                        className="w-full border border-white/20 bg-black/50 text-white px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-white/50">Message *</label>
                    <textarea required rows={4} placeholder="Describe your project or event..." value={booking.message}
                      onChange={e => setBooking(p => ({ ...p, message: e.target.value }))}
                      className="w-full border border-white/20 bg-black/50 text-white px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-white/20" />
                  </div>

                  {bookingError && <p className="text-xs text-[#E5000F] uppercase tracking-widest">{bookingError}</p>}

                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/30 uppercase text-xs tracking-widest">Estimated Total</span>
                      <span className="font-black text-white">
                        {selectedPkg ? `€${selectedPkg.price}` : artist.hourly_rate && booking.duration_hours ? `€${(artist.hourly_rate * parseFloat(booking.duration_hours)).toFixed(0)}` : "To be agreed"}
                      </span>
                    </div>
                  </div>

                  {!currentUser ? (
                    <Link href="/login" className="block text-center py-4 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                      Login to Book
                    </Link>
                  ) : (
                    <button type="submit" disabled={bookingStatus === "sending"}
                      className="py-4 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50">
                      {bookingStatus === "sending" ? "Sending..." : "Send Booking Request"}
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        <CommentSection artistId={artist.id} currentUser={currentUser} dark />

      </div>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-white/10">
        <span className="text-sm font-black uppercase tracking-tight text-white">ArtConnect</span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-white/30">
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-white transition-colors">DMCA</Link>
        </div>
      </footer>

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
