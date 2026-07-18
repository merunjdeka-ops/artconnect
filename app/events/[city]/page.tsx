import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchUpcomingEvents, resolveCityFromSlug, eventsJsonLd, jsonLdString, eventPageDescription, cityEnglishName,
} from "@/lib/events";
import { SITE_NAME } from "@/lib/config";
import EventCard from "../event-card";
import AffiliateNote from "../../components/AffiliateNote";

// One landing page per city ("events in Milan", "concerti Pisa", …) —
// server-rendered with schema.org Event markup, refreshed hourly.
export const revalidate = 3600;

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await resolveCityFromSlug(slug);
  if (!city) return { title: "Events" };
  const events = await fetchUpcomingEvents({ city, limit: 100 });
  const en = cityEnglishName(city);
  const titleCity = en ? `${en} (${city})` : city;
  return {
    title: `Events in ${titleCity} — Concerts, Shows & Live Music`,
    description: eventPageDescription(city, events),
    alternates: { canonical: `/events/${slug}` },
    openGraph: {
      title: `Events in ${titleCity} — Concerts, Shows & Live Music | ${SITE_NAME}`,
      description: eventPageDescription(city, events),
      ...(events[0]?.photos?.[0] ? { images: [events[0].photos[0]] } : {}),
    },
  };
}

export default async function CityEventsPage({ params }: Props) {
  const { city: slug } = await params;
  const city = await resolveCityFromSlug(slug);
  if (!city) notFound();

  const events = await fetchUpcomingEvents({ city, limit: 100 });
  if (events.length === 0) notFound();

  const jsonLd = eventsJsonLd(events);
  const venues = [...new Set(events.map(e => e.venue).filter(Boolean))] as string[];

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      {jsonLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      )}

      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <Link href="/events" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">← All events</Link>
      </nav>

      <header className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Live &amp; local</p>
        <h1 className="text-[clamp(2.5rem,7vw,6rem)] font-black uppercase leading-none">Events in<br />{city}</h1>
        <p className="mt-6 text-sm text-black/60 max-w-xl leading-relaxed">
          {events.length} upcoming event{events.length === 1 ? "" : "s"} in {city}
          {venues.length > 0 && <> — including {venues.slice(0, 3).join(", ")}</>}.
          Dates, venues and ticket links, updated daily.
        </p>
      </header>

      <section className="px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-black border border-black">
          {events.map(ev => <EventCard key={ev.id} event={ev} />)}
        </div>
        <AffiliateNote className="mt-4" />

        <div className="mt-12 border border-black bg-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase">Performing in {city}?</p>
            <p className="text-xs text-black/50 leading-relaxed mt-1">Create a free artist profile and get booked by locals.</p>
          </div>
          <Link href="/signup?role=artist" className="shrink-0 bg-black text-white text-xs font-bold uppercase tracking-widest px-5 py-3 hover:bg-[#E5000F] transition-colors text-center">
            Join Free →
          </Link>
        </div>
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
