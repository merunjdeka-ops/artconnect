import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  fetchVenueBySlug, eventsJsonLd, jsonLdString, citySlug, cityEnglishName, cityMonths, monthLabel,
} from "@/lib/events";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import EventCard from "../../events/event-card";
import AffiliateNote from "../../components/AffiliateNote";
import { SiteNav, SiteFooter, LinkPills, breadcrumbJsonLd } from "../../events/page-shell";

// One page per venue: "<venue> programma / eventi / concerti". Built from the
// imported events, refreshed hourly. Venues drop out (redirect) when their
// upcoming events run out, and come back when new ones are imported.
export const revalidate = 3600;

type Props = { params: Promise<{ venue: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { venue: slug } = await params;
  const data = await fetchVenueBySlug(slug);
  if (!data) return { title: "Venue", robots: { index: false } };
  const { venue, events } = data;
  const en = cityEnglishName(venue.city);
  const next = events[0]?.event_date
    ? new Date(events[0].event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Rome" })
    : "";
  return {
    title: `${venue.venue}, ${venue.city} — Programme, Upcoming Concerts & Tickets`,
    description:
      `${events.length} upcoming events at ${venue.venue} in ${en ?? venue.city}${next ? `, next on ${next}` : ""}: ` +
      `dates and ticket links. Programma ${venue.venue} ${venue.city}: concerti, spettacoli e biglietti.`,
    alternates: { canonical: `/venues/${slug}` },
    openGraph: {
      title: `${venue.venue}, ${venue.city} — Upcoming events | ${SITE_NAME}`,
      description: `${events.length} upcoming events at ${venue.venue}, ${venue.city}.`,
      ...(events[0]?.photos?.[0] ? { images: [events[0].photos[0]] } : {}),
    },
  };
}

export default async function VenuePage({ params }: Props) {
  const { venue: slug } = await params;
  const data = await fetchVenueBySlug(slug);
  if (!data || data.events.length === 0) redirect("/venues");
  const { venue, events } = data;
  const cSlug = citySlug(venue.city);
  const pageUrl = `${SITE_URL}/venues/${slug}`;

  const jsonLd = [
    ...eventsJsonLd(events),
    breadcrumbJsonLd([
      { name: "Events", url: `${SITE_URL}/events` },
      { name: venue.city, url: `${SITE_URL}/events/${cSlug}` },
      { name: venue.venue, url: pageUrl },
    ]),
  ];
  const months = cityMonths(events).map(m => ({ href: `/events/${cSlug}/${m.slug}`, label: monthLabel(m.key, "en") }));

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <SiteNav backHref={`/events/${cSlug}`} backLabel={`Events in ${venue.city}`} />

      <header className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Venue · {venue.city}</p>
        <h1 className="text-[clamp(2.25rem,6vw,5rem)] font-black uppercase leading-none">{venue.venue}</h1>
        <p className="mt-6 text-sm text-black/60 max-w-xl leading-relaxed">
          {events.length} upcoming event{events.length === 1 ? "" : "s"} at {venue.venue} in {cityEnglishName(venue.city) ?? venue.city}.
          Dates and official ticket links, updated daily.
        </p>
        <p className="mt-2 text-sm text-black/50 max-w-xl leading-relaxed" lang="it">
          Programma di {venue.venue} a {venue.city}: concerti, spettacoli, date e biglietti, aggiornati ogni giorno.
        </p>
        <LinkPills title={`More in ${venue.city}`} links={[
          { href: `/events/${cSlug}`, label: `All events in ${venue.city}` },
          { href: `/events/${cSlug}/weekend`, label: "This weekend" },
          ...months,
        ]} />
      </header>

      <section className="px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-black border border-black">
          {events.map(ev => <EventCard key={ev.id} event={ev} />)}
        </div>
        <AffiliateNote className="mt-4" />
        <p className="mt-8 text-xs text-black/50">
          Looking for other venues? <Link href="/venues" className="underline hover:text-[#E5000F]">Browse all venues</Link>.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
