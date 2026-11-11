import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchUpcomingEvents, eventsInMonth, cityMonths, monthLabel, monthSlug, venueSlug, cityEnglishName,
  eventsJsonLd, jsonLdString, type MonthKey,
} from "@/lib/events";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import EventCard from "../event-card";
import AffiliateNote from "../../components/AffiliateNote";
import { SiteNav, SiteFooter, LinkPills, breadcrumbJsonLd } from "../page-shell";

// Monthly city page: /events/<city>/<mese>-<anno> ("eventi Firenze dicembre
// 2026"). Rendered from app/events/[city]/[event]/page.tsx when the segment is
// a month slug — event slugs always end in an 8-char id, so they never clash.

export async function loadMonth(city: string, key: MonthKey) {
  const all = await fetchUpcomingEvents({ city, limit: 300 });
  return { all, events: eventsInMonth(all, key) };
}

export function monthMetadata(city: string, cSlug: string, key: MonthKey, count: number): Metadata {
  const en = cityEnglishName(city);
  const enLabel = monthLabel(key, "en");
  const itLabel = monthLabel(key, "it");
  return {
    title: `Events in ${en ?? city}, ${enLabel} — Eventi ${city} ${itLabel}`,
    description:
      `${count} concerts, shows and live events in ${en ? `${en} (${city})` : city} in ${enLabel} — dates, venues and tickets. ` +
      `Eventi e concerti a ${city} a ${itLabel}: date, luoghi e biglietti.`,
    alternates: { canonical: `/events/${cSlug}/${monthSlug(key)}` },
    openGraph: {
      title: `Events in ${en ?? city} — ${enLabel} | ${SITE_NAME}`,
      description: `${count} upcoming events in ${city} in ${enLabel}.`,
    },
  };
}

export function MonthView({ city, cSlug, keyM, events, all }: {
  city: string; cSlug: string; keyM: MonthKey; events: Awaited<ReturnType<typeof loadMonth>>["events"]; all: Awaited<ReturnType<typeof loadMonth>>["all"];
}) {
  const enLabel = monthLabel(keyM, "en");
  const itLabel = monthLabel(keyM, "it");
  const pageUrl = `${SITE_URL}/events/${cSlug}/${monthSlug(keyM)}`;
  const jsonLd = [
    ...eventsJsonLd(events),
    breadcrumbJsonLd([
      { name: "Events", url: `${SITE_URL}/events` },
      { name: city, url: `${SITE_URL}/events/${cSlug}` },
      { name: enLabel, url: pageUrl },
    ]),
  ];
  const otherMonths = cityMonths(all)
    .filter(m => m.slug !== monthSlug(keyM))
    .map(m => ({ href: `/events/${cSlug}/${m.slug}`, label: monthLabel(m.key, "en") }));
  const venues = [...new Map(events.filter(e => e.venue).map(e => [venueSlug(e.venue!, city), e.venue!])).entries()];

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <SiteNav backHref={`/events/${cSlug}`} backLabel={`Events in ${city}`} />

      <header className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">{city} · {enLabel}</p>
        <h1 className="text-[clamp(2.5rem,7vw,6rem)] font-black uppercase leading-none">{city}<br />in {enLabel.split(" ")[0]}</h1>
        <p className="mt-6 text-sm text-black/60 max-w-xl leading-relaxed">
          {events.length} concert{events.length === 1 ? "" : "s"}, shows and live events in {cityEnglishName(city) ?? city} in {enLabel}.
          Dates, venues and ticket links, updated daily.
        </p>
        <p className="mt-2 text-sm text-black/50 max-w-xl leading-relaxed" lang="it">
          Eventi, concerti e spettacoli a {city} a {itLabel}: date, luoghi e biglietti.
        </p>
        <LinkPills title="Other months" links={otherMonths} />
        <LinkPills title="Venues this month" links={venues.map(([s, name]) => ({ href: `/venues/${s}`, label: name }))} />
      </header>

      <section className="px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-black border border-black">
          {events.map(ev => <EventCard key={ev.id} event={ev} />)}
        </div>
        <AffiliateNote className="mt-4" />
        <p className="mt-8 text-xs text-black/50">
          <Link href={`/events/${cSlug}`} className="underline hover:text-[#E5000F]">All upcoming events in {city}</Link>
          {" · "}
          <Link href={`/events/${cSlug}/weekend`} className="underline hover:text-[#E5000F]">This weekend</Link>
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
