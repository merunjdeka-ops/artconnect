"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GuideButton from "@/app/components/GuideButton";
import { getSupabase } from "@/lib/supabase";

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
];

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        setUserName(profile?.full_name || "");
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
          <span className="text-[#E5000F]" style={{fontFamily:"Downtown,Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>go</span><span className="uppercase">ARTCONNECT</span>
        </Link>
        <div className="flex items-center gap-6">
          {authChecked && userName !== null ? (
            <>
              <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Browse</Link>
              <Link href="/dashboard" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Dashboard</Link>
              <span className="text-xs uppercase tracking-widest text-black/40 hidden md:block">{userName}</span>
              <button onClick={handleLogout} className="text-sm font-bold uppercase tracking-widest bg-black text-white px-5 py-2 hover:bg-[#E5000F] transition-colors">
                Logout
              </button>
            </>
          ) : authChecked ? (
            <>
              <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
              <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
            </>
          ) : null}
        </div>
      </nav>

      {/* HERO */}
      <section className="px-8 pt-20 pb-16 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-6 fade-in-up fade-in-up-1">
          For local artists & creatives
        </p>
        <h1 className="text-[clamp(3rem,10vw,9rem)] font-black uppercase leading-none tracking-tight max-w-6xl fade-in-up fade-in-up-2">
          Where Local<br />
          <span className="text-[#E5000F]">Artists</span><br />
          Get Found.
        </h1>
        <div className="flex flex-col md:flex-row gap-6 md:gap-16 mt-12 max-w-4xl fade-in-up fade-in-up-3">
          <p className="text-base text-black/60 max-w-sm leading-relaxed">
            goArtConnect is a platform for every kind of creative — photographers, musicians,
            makeup artists, painters, and more — to showcase their work, sell, and get booked.
          </p>
          <div className="flex gap-4 items-start">
            <Link href="/artists" className="bg-black text-white text-sm font-bold uppercase tracking-widest px-6 py-3 hover:bg-[#E5000F] transition-colors">
              Find an Artist
            </Link>
            <Link href="/signup?role=artist" className="border border-black text-sm font-bold uppercase tracking-widest px-6 py-3 hover:border-[#E5000F] hover:text-[#E5000F] transition-colors">
              Share Your Work
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
            <div key={step.num} className={`px-8 py-12 reveal reveal-delay-${i + 1}`}>
              <span className="text-5xl font-black text-[#E5000F] leading-none">{step.num}</span>
              <h3 className="text-xl font-black uppercase mt-4 mb-3">{step.title}</h3>
              <p className="text-sm text-black/60 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-8 py-16 border-b border-black">
        <div className="flex items-baseline justify-between mb-12 reveal">
          <h2 className="text-4xl font-black uppercase">All Categories</h2>
          <span className="text-sm text-black/40 uppercase tracking-widest">{categories.length} disciplines</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black border border-black">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => router.push(`/artists?category=${encodeURIComponent(cat.name)}`)}
              className="bg-[#F2EDE4] p-6 hover:bg-[#E5000F] hover:text-white transition-all duration-200 cursor-pointer group text-left w-full"
            >
              <h3 className="text-base font-black uppercase">{cat.name}</h3>
              <p className="mt-2 text-xs leading-relaxed opacity-60 group-hover:opacity-80">{cat.description}</p>
            </button>
          ))}
        </div>
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
          Create your profile, upload your work, set your own rates, and let clients
          find you. No middlemen. Your talent, your terms.
        </p>
        <Link
          href="/signup"
          className="inline-block mt-10 bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-8 py-4 hover:bg-white hover:text-black transition-colors"
        >
          Join as an Artist
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"Downtown,Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>go</span><span className="uppercase">ARTCONNECT</span></span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
          <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
        </div>
        <span className="text-xs text-black/40 uppercase tracking-widest">© 2026. Built for local artists.</span>
      </footer>

      <GuideButton
        title="How goArtConnect Works"
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







