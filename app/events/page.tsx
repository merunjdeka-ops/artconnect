import type { Metadata } from "next";
import Link from "next/link";
import { fetchUpcomingEvents, fetchEventCities, citySlug, eventsJsonLd, jsonLdString } from "@/lib/events";
import { SITE_NAME } from "@/lib/config";
import EventCard from "./event-card";
import AffiliateNote from "../components/AffiliateNote";

// Server-rendered so search engines see the full event listing, refreshed hourly.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Live Events, Concerts & Shows in Italy",
  description:
    "Upcoming concerts, live music, exhibitions and shows across Italy — Milan, Rome, Florence, Pisa and more. Dates, venues and tickets, updated daily. Eventi e concerti in Italia: date, luoghi e biglietti.",
  keywords: [
    "eventi Italia", "concerti Italia", "eventi oggi", "cosa fare questo weekend",
    "events Italy", "concerts Italy", "biglietti concerti",
  ],
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const [events, cities] = await Promise.all([
    fetchUpcomingEvents({ limit: 48 }),
    fetchEventCities(),
  ]);
  const jsonLd = eventsJsonLd(events);

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      {jsonLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      )}

      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/artists" className="hidden sm:block text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Find an Artist</Link>
          <Link href="/signup?role=artist" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
        </div>
      </nav>

      <header className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Live &amp; local</p>
        <h1 className="text-[clamp(2.5rem,7vw,6rem)] font-black uppercase leading-none">Events in<br />Italy</h1>
        <p className="mt-6 text-sm text-black/60 max-w-lg leading-relaxed">
          Concerts, live music, exhibitions and shows across the country — updated daily. Pick a city or browse everything coming up.
        </p>
      </header>

      {cities.length > 0 && (
        <section className="px-8 py-8 border-b border-black">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/40 mb-4">Browse by city</h2>
          <div className="flex flex-wrap gap-2">
            {cities.map(({ city, count }) => (
              <Link
                key={city}
                href={`/events/${citySlug(city)}`}
                className="border border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                {city} <span className="text-[#E5000F]">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-8 py-12">
        {events.length === 0 ? (
          <p className="text-sm text-black/40 py-12">No upcoming events right now — check back soon.</p>
        ) : (
          <>
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/40 mb-6">Coming up next</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-black border border-black">
              {events.map(ev => <EventCard key={ev.id} event={ev} />)}
            </div>
            <AffiliateNote className="mt-4" />
          </>
        )}
      </section>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
        </div>
        <span className="text-xs text-black/40 uppercase tracking-widest">© 2026 {SITE_NAME}.</span>
      </footer>
    </main>
  );
}
