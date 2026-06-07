"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import GuideButton from "@/app/components/GuideButton";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import StarRating from "@/app/components/StarRating";
import ReviewForm from "@/app/components/ReviewForm";

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
    <main className="min-h-screen bg-[#F2EDE4] font-sans">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight uppercase">ArtConnect</Link>
        <div className="flex items-center gap-6">
          <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">← All Artists</Link>
          {currentUser ? (
            <Link href="/dashboard" className="text-sm font-bold uppercase tracking-widest bg-black text-white px-5 py-2 hover:bg-[#E5000F] transition-colors">Dashboard</Link>
          ) : (
            <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="px-8 pt-16 pb-12 border-b border-black">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">{artist.category}</p>
            <h1 className="text-6xl font-black uppercase leading-none">{artist.full_name}</h1>
            <p className="text-sm text-black/50 uppercase tracking-widest mt-3">{artist.location}</p>

            {avgRating !== null && (
              <div className="flex items-center gap-3 mt-4">
                <StarRating rating={avgRating} size="md" />
                <span className="text-xs text-black/50 uppercase tracking-widest">
                  {avgRating.toFixed(1)} &mdash; {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>
            )}

            <div className="flex gap-6 mt-6">
              {artist.hourly_rate && (
                <div>
                  <p className="text-xs text-black/40 uppercase tracking-widest">Hourly</p>
                  <p className="font-black text-xl">€{artist.hourly_rate}</p>
                </div>
              )}
              {artist.session_rate && (
                <div>
                  <p className="text-xs text-black/40 uppercase tracking-widest">Session</p>
                  <p className="font-black text-xl">€{artist.session_rate}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-black/40 uppercase tracking-widest">Status</p>
                <p className={`font-black text-sm uppercase mt-1 ${artist.is_available ? "text-green-700" : "text-[#E5000F]"}`}>
                  {artist.is_available ? "Available" : "Currently Busy"}
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              {artist.instagram && (
                <a href={`https://instagram.com/${artist.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold uppercase tracking-widest border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors">
                  Instagram
                </a>
              )}
              {artist.website && (
                <a href={artist.website} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold uppercase tracking-widest border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors">
                  Website
                </a>
              )}
              {isOwnProfile && (
                <Link href="/dashboard/setup"
                  className="text-xs font-bold uppercase tracking-widest bg-[#E5000F] text-white px-4 py-2 hover:bg-black transition-colors">
                  Edit Profile
                </Link>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div className="w-32 h-32 bg-black flex items-center justify-center shrink-0">
            <span className="text-white font-black text-5xl">
              {artist.full_name?.[0]?.toUpperCase()}
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Left: Bio + Portfolio + Reviews */}
        <div className="lg:col-span-2">
          {/* Bio */}
          <div className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">About</h2>
            <p className="text-base leading-relaxed text-black/80">{artist.bio}</p>
          </div>

          {/* Packages */}
          {packages.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Service Packages</h2>
              <div className={`grid gap-px bg-black border border-black ${packages.length === 1 ? "grid-cols-1" : packages.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
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
                      <p className={`text-sm leading-relaxed mb-4 ${isLast ? "text-white/70" : "text-black/60"}`}>
                        {pkg.description}
                      </p>
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
                          if (!isSelected) {
                            setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                          }
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

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <div className="mb-12">
              {/* Images */}
              {portfolio.filter(i => i.media_type === "image").length > 0 && (
                <>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Portfolio</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-black border border-black mb-10">
                    {portfolio.filter(i => i.media_type === "image").map(item => (
                      <div key={item.id} className="bg-[#F2EDE4] p-4">
                        <img src={item.media_url} alt={item.title} className="w-full h-48 object-cover mb-3" />
                        <h3 className="font-black uppercase text-sm">{item.title}</h3>
                        {item.description && <p className="text-xs text-black/50 mt-1">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Video */}
              {portfolio.filter(i => i.media_type === "video").map(item => (
                <div key={item.id} className="bg-[#F2EDE4] border border-black p-4 mb-4">
                  <video src={item.media_url} controls className="w-full h-48 object-cover mb-3" />
                  <h3 className="font-black uppercase text-sm">{item.title}</h3>
                  {item.description && <p className="text-xs text-black/50 mt-1">{item.description}</p>}
                </div>
              ))}

              {/* Music embeds */}
              {portfolio.filter(i => ["soundcloud", "spotify", "youtube", "audio"].includes(i.media_type)).length > 0 && (
                <>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Music Samples</h2>
                  <div className="flex flex-col gap-px bg-black border border-black">
                    {portfolio.filter(i => ["soundcloud", "spotify", "youtube", "audio"].includes(i.media_type)).map(item => (
                      <div key={item.id} className="bg-[#F2EDE4] p-5">
                        <h3 className="font-black uppercase text-sm mb-1">{item.title}</h3>
                        {item.description && <p className="text-xs text-black/50 mb-3">{item.description}</p>}
                        {item.media_type === "soundcloud" && (
                          <iframe
                            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(item.media_url)}&color=%23E5000F&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`}
                            width="100%" height="120" frameBorder="0"
                            allow="autoplay" className="block"
                          />
                        )}
                        {item.media_type === "spotify" && (() => {
                          const m = item.media_url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
                          return m ? (
                            <iframe
                              src={`https://open.spotify.com/embed/${m[1]}/${m[2]}`}
                              width="100%" height="80" frameBorder="0"
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                              className="block"
                            />
                          ) : null;
                        })()}
                        {item.media_type === "youtube" && (() => {
                          const m = item.media_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                          return m ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${m[1]}`}
                              width="100%" height="200" frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen className="block"
                            />
                          ) : null;
                        })()}
                        {item.media_type === "audio" && (
                          <audio src={item.media_url} controls className="w-full" />
                        )}
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
                    {review.comment && (
                      <p className="text-sm text-black/70 leading-relaxed mt-2">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review form — shown only to logged-in non-artists */}
          {currentUser && !isOwnProfile && (
            <ReviewForm
              artistId={artist.id}
              clientId={currentUser.id}
              onReviewSubmitted={fetchReviews}
            />
          )}
        </div>

        {/* Right: Booking form */}
        {!isOwnProfile && (
          <div ref={bookingRef}>
            <div className="border border-black bg-white p-6 sticky top-6">
              <h2 className="text-lg font-black uppercase mb-5">Book {artist.full_name?.split(" ")[0]}</h2>

              {bookingStatus === "sent" ? (
                <div className="text-center py-6">
                  <p className="font-black uppercase text-green-700 mb-2">Request Sent!</p>
                  <p className="text-xs text-black/50">The artist will get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="flex flex-col gap-4">

                  {/* Selected package badge */}
                  {selectedPkg ? (
                    <div className="bg-black text-white p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Package Selected</p>
                        <p className="font-black uppercase text-sm">{selectedPkg.name}</p>
                        <p className="text-[#E5000F] font-black text-lg">€{selectedPkg.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPkg(null)}
                        className="text-white/40 hover:text-white text-lg leading-none transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : packages.length > 0 ? (
                    <p className="text-xs text-black/40 uppercase tracking-widest border border-dashed border-black/20 p-3 text-center">
                      ↑ Select a package above or fill in custom details below
                    </p>
                  ) : null}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Date</label>
                    <input
                      type="date"
                      value={booking.event_date}
                      onChange={e => setBooking(p => ({ ...p, event_date: e.target.value }))}
                      className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent"
                    />
                  </div>

                  {/* Only show duration if no package selected (package has its own duration) */}
                  {!selectedPkg && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2">Duration (hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={booking.duration_hours}
                        onChange={e => setBooking(p => ({ ...p, duration_hours: e.target.value }))}
                        className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Message *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Describe your project or event..."
                      value={booking.message}
                      onChange={e => setBooking(p => ({ ...p, message: e.target.value }))}
                      className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-black/30 bg-transparent"
                    />
                  </div>

                  {bookingError && (
                    <p className="text-xs text-[#E5000F] uppercase tracking-widest">{bookingError}</p>
                  )}

                  {/* Price estimate */}
                  <div className="border-t border-black/10 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-black/50 uppercase text-xs tracking-widest">Estimated Total</span>
                      <span className="font-black">
                        {selectedPkg
                          ? `€${selectedPkg.price}`
                          : artist.hourly_rate && booking.duration_hours
                          ? `€${(artist.hourly_rate * parseFloat(booking.duration_hours)).toFixed(0)}`
                          : "To be agreed"}
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
                      className="py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
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

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
        <span className="text-sm font-black uppercase tracking-tight">ArtConnect</span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
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
