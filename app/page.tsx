"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import GuideButton from "@/app/components/GuideButton";
import EventsFeed from "@/app/components/EventsFeed";
import BlogFeed from "@/app/components/BlogFeed";
import FeaturedWork from "@/app/components/FeaturedWork";
import AdSlot from "@/app/components/AdSlot";
import Marquee from "@/app/components/Marquee";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="border border-black bg-white px-6 py-5 inline-flex items-center gap-3">
        <span className="text-[#E5000F] font-black text-lg">✓</span>
        <p className="text-sm font-bold uppercase tracking-widest">You&apos;re on the list.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 max-w-md">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="flex-1 border border-black px-4 py-3 text-sm bg-white outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 sm:border-r-0"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50 border border-black whitespace-nowrap"
      >
        {status === "sending" ? "..." : "Notify Me"}
      </button>
      {status === "error" && (
        <p className="text-xs text-[#E5000F] mt-2 uppercase tracking-widest w-full">Something went wrong. Try again.</p>
      )}
    </form>
  );
}

const categories = [
  { name: "Photography", description: "Portrait, wedding, events, commercial and more." },
  { name: "Music", description: "Live performers, session musicians, singers and bands." },
  { name: "Makeup Artist", description: "Bridal, editorial, special effects and everyday glam." },
  { name: "Painting", description: "Custom paintings, murals, portraits and abstract art." },
  { name: "Illustration", description: "Digital and hand-drawn illustrations for any project." },
  { name: "Videography", description: "Event coverage, short films, music videos and reels." },
  { name: "DJ", description: "Events, weddings, parties and private bookings." },
  { name: "Dance", description: "Choreographers, dance instructors and performers." },
  { name: "Hair Styling", description: "Creative hairstylists for shoots, events and more." },
  { name: "Graphic Design", description: "Logos, branding, posters and visual identity." },
  { name: "Pottery & Ceramics", description: "Handcrafted ceramics, custom pieces and workshops." },
  { name: "Sculpture", description: "Custom sculptures in wood, clay, metal and stone." },
  { name: "Calligraphy", description: "Wedding invitations, signage and custom lettering." },
  { name: "Fashion Design", description: "Custom clothing, alterations and costume design." },
  { name: "Tattoo Artist", description: "Custom tattoos and body art across all styles." },
  { name: "Comedy & Stand-Up", description: "Comedians and entertainers for events and shows." },
  { name: "Poetry & Spoken Word", description: "Live performances, commissions and event pieces." },
  { name: "Acting & Theatre", description: "Actors, directors and theatre performers." },
  { name: "Jewelry Making", description: "Handcrafted custom jewelry and accessories." },
  { name: "Interior Design", description: "Artistic interior styling and space transformation." },
  { name: "Handcraft", description: "Wood, paper, textile, ceramics, leather, resin and more." },
  { name: "Florist", description: "Floral arrangements for weddings, events and gifting." },
  { name: "Mural Art", description: "Large-scale wall paintings and commissioned murals." },
  { name: "Animation", description: "2D/3D animation, motion graphics and digital storytelling." },
];

const emptySubscribe = () => () => {};

function timeGreeting(): string {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "Good morning — start something creative today." :
    h >= 12 && h < 17 ? "Good afternoon — the local scene is wide awake." :
    h >= 17 && h < 23 ? "Good evening — looking for something creative tonight?" :
    "Up late? Inspiration doesn't sleep.";
}

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [catPreviews, setCatPreviews] = useState<Record<string, string>>({});
  const previewsLoaded = useRef(false);
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Empty server snapshot so the static prerender never disagrees with local time.
  const greeting = useSyncExternalStore(emptySubscribe, timeGreeting, () => "");

  async function loadCategoryPreviews() {
    if (previewsLoaded.current) return;
    previewsLoaded.current = true;
    const supabase = getSupabase();
    const { data } = await supabase
      .from("portfolio_items")
      .select("media_url, artist:profiles!portfolio_items_artist_id_fkey!inner(category)")
      .eq("media_type", "image")
      .eq("artist.role", "artist")
      .eq("artist.is_deactivated", false)
      .not("artist.category", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    const map: Record<string, string> = {};
    ((data as unknown as { media_url: string; artist: { category: string } | null }[]) || []).forEach(row => {
      let cat = row.artist?.category;
      if (!cat) return;
      if (cat.startsWith("Handcraft")) cat = "Handcraft";
      if (!map[cat]) map[cat] = row.media_url;
    });
    setCatPreviews(map);
  }

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name, is_admin").eq("id", user.id).single();
        setUserName(profile?.full_name || "");
        setIsAdmin(!!profile?.is_admin);
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  async function handleLogout() {
    await getSupabase().auth.signOut();
    setUserName(null);
  }

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">

      {/* NAVBAR — auth-aware */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none">
          <span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span>
        </Link>
        <div className="flex items-center gap-6">
          {authChecked && userName !== null ? (
            <>
              <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Browse</Link>
              <Link href="/blog" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Blog</Link>
              <Link href="/dashboard" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Dashboard</Link>
              {isAdmin && <Link href="/admin" className="text-sm font-bold uppercase tracking-widest text-[#E5000F] hover:text-black transition-colors">Admin</Link>}
              <span className="text-xs uppercase tracking-widest text-black/40 hidden md:block">{userName}</span>
              <button onClick={handleLogout} className="text-sm font-bold uppercase tracking-widest bg-black text-white px-5 py-2 hover:bg-[#E5000F] transition-colors">
                Logout
              </button>
            </>
          ) : authChecked ? (
            <>
              <Link href="/blog" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Blog</Link>
              <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
              <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
            </>
          ) : null}
        </div>
      </nav>

      {/* LIVE TICKER */}
      <Marquee />

      {/* HERO */}
      <section className="px-8 pt-20 pb-16 border-b border-black">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6 fade-in-up fade-in-up-1">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F]">
            Creative marketplace
          </p>
          {greeting && (
            <p className="text-xs uppercase tracking-widest text-black/40">{greeting}</p>
          )}
        </div>
        <h1 className="text-[clamp(3rem,10vw,9rem)] font-black uppercase leading-none tracking-tight max-w-6xl fade-in-up fade-in-up-2">
          Where Local<br />
          <span className="text-[#E5000F]">Artists</span><br />
          Get Booked.
        </h1>
        <div className="flex flex-col md:flex-row gap-6 md:gap-16 mt-12 max-w-4xl fade-in-up fade-in-up-3">
          <p className="text-base text-black/60 max-w-sm leading-relaxed">
            Photographers, musicians, makeup artists, painters and more — all in one place.
            Browse real portfolios, see real rates, and book directly. No agencies, no middlemen.
          </p>
          <div className="flex gap-4 items-start flex-wrap">
            <Link href="/artists" className="bg-black text-white text-sm font-bold uppercase tracking-widest px-6 py-3 hover:bg-[#E5000F] transition-colors">
              Find an Artist
            </Link>
            <Link href="/signup?role=artist" className="border border-black text-sm font-bold uppercase tracking-widest px-6 py-3 hover:border-[#E5000F] hover:text-[#E5000F] transition-colors">
              Join as Artist
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-black">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black">
          {[
            { num: "01", title: "Create a Profile", body: "Upload your photos, music, or videos. Set your rates — hourly, per session, or sell your work directly." },
            { num: "02", title: "Get Discovered", body: "Clients browse by category and location. Your work speaks for itself." },
            { num: "03", title: "Book & Earn", body: "Accept bookings, sell your art, and grow your local presence — on your terms." },
          ].map((step, i) => (
            <div key={step.num} className={`px-8 py-5 reveal reveal-delay-${i + 1}`}>
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-black text-[#E5000F] leading-none">{step.num}</span>
                <h3 className="text-sm font-black uppercase">{step.title}</h3>
              </div>
              <p className="text-xs text-black/50 leading-relaxed mt-1.5">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EVENTS / PERFORMANCES FEED */}
      <EventsFeed />

      {/* BLOG / JOURNAL FEED */}
      <BlogFeed />

      {/* FRESH ON THE HUB — latest portfolio work */}
      <FeaturedWork />

      {/* AD SLOT */}
      <section className="px-8 py-8 border-b border-black">
        <AdSlot slot="home" />
      </section>

      {/* CATEGORIES */}
      <section className="px-8 py-16 border-b border-black">
        <button
          onClick={() => { setShowCategories(v => !v); loadCategoryPreviews(); }}
          aria-expanded={showCategories}
          className="w-full flex items-baseline justify-between reveal cursor-pointer text-left group"
        >
          <h2 className="text-4xl font-black uppercase group-hover:text-[#E5000F] transition-colors">
            All Categories
            <span className="text-[#E5000F] ml-4 group-hover:text-black transition-colors">{showCategories ? "−" : "+"}</span>
          </h2>
          <span className="text-sm text-black/40 uppercase tracking-widest">{categories.length} disciplines</span>
        </button>
        {showCategories && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black border border-black mt-12"
            onMouseMove={e => setMouse({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHoverCat(null)}
          >
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => router.push(`/artists?category=${encodeURIComponent(cat.name)}`)}
                onMouseEnter={() => setHoverCat(cat.name)}
                onMouseLeave={() => setHoverCat(null)}
                className="bg-[#F2EDE4] p-6 hover:bg-[#E5000F] hover:text-white transition-all duration-200 cursor-pointer group text-left w-full"
              >
                <h3 className="text-base font-black uppercase">{cat.name}</h3>
                <p className="mt-2 text-xs leading-relaxed opacity-60 group-hover:opacity-80">{cat.description}</p>
              </button>
            ))}
          </div>
        )}
        {hoverCat && catPreviews[hoverCat] && (
          <img
            src={cdnUrl(catPreviews[hoverCat], "w_400,c_limit,q_auto,f_auto")}
            alt=""
            aria-hidden="true"
            className="pointer-events-none fixed z-50 w-56 aspect-square object-cover border-2 border-black shadow-xl hidden lg:block"
            style={{
              left: Math.min(mouse.x + 24, (typeof window !== "undefined" ? window.innerWidth : 1280) - 250),
              top: mouse.y - 112,
            }}
          />
        )}
      </section>

      {/* ARTIST CTA */}
      <section className="px-8 py-20 border-b border-black bg-black text-white reveal">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-6">
          Are you a local artist?
        </p>
        <h2 className="text-[clamp(2rem,6vw,6rem)] font-black uppercase leading-none max-w-4xl">
          Stop Being<br />Invisible.
        </h2>
        <p className="mt-6 text-white/50 max-w-md text-base leading-relaxed">
          Create your profile, upload your portfolio, set your own rates, and let clients
          find you. No agency fees. No commissions. Your talent, your terms.
        </p>
        <div className="flex flex-wrap gap-4 mt-10">
          <Link
            href="/signup?role=artist"
            className="inline-block bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-8 py-4 hover:bg-white hover:text-black transition-colors"
          >
            Create Free Profile →
          </Link>
          <Link
            href="/artists"
            className="inline-block border border-white/30 text-white text-sm font-bold uppercase tracking-widest px-8 py-4 hover:border-white hover:text-white transition-colors"
          >
            See How It Works
          </Link>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="px-8 py-16 border-b border-black">
        <div className="max-w-2xl reveal">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Stay in the loop</p>
          <h2 className="text-3xl font-black uppercase leading-tight mb-4">
            New Artists.<br />Straight to Your Inbox.
          </h2>
          <p className="text-sm text-black/60 mb-8 max-w-sm leading-relaxed">
            Get notified when standout new artists join. No spam — just the best new creatives.
          </p>
          <NewsletterForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
          <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
        </div>
        <span className="text-xs text-black/40 uppercase tracking-widest">© 2026. Built for local artists.</span>
      </footer>

      <GuideButton
        title="How The Local Art Hub Works"
        steps={[
          { title: "Find an Artist", description: "Browse by category using the grid below, or click 'Browse All Artists' to see everyone on the platform." },
          { title: "Filter by Category", description: "Click any category card (Photography, Music, Makeup Artist, etc.) to jump straight to artists in that field." },
          { title: "View Artist Profiles", description: "Click any artist to see their full profile, portfolio, packages, pricing and reviews." },
          { title: "Send a Booking Request", description: "On the artist's profile, select a package (or enter custom details) and send a booking request with your date and message." },
          { title: "Create an Account", description: "Click 'Join Now' to sign up as a client (to book) or as an artist (to get booked). It's free." },
        ]}
      />
    </main>
  );
}











