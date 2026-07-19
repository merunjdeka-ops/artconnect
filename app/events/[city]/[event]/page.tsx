import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolveCityFromSlug, findEventBySlug, fetchUpcomingEvents, eventSlug, citySlug,
  eventsJsonLd, jsonLdString, cityEnglishName,
} from "@/lib/events";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { affiliateTicketUrl, ticketRel } from "@/lib/affiliate";
import { cdnUrl, lightTmUrl } from "@/lib/cloudinary";
import EventCard from "../../event-card";
import AffiliateNote from "../../../components/AffiliateNote";

// One page per imported event — the long-tail landing pages ("<act> <city>
// biglietti") that the card grids link into. Bilingual copy on one URL:
// locals search in Italian, the site reads in English.
export const revalidate = 3600;

type Props = { params: Promise<{ city: string; event: string }> };

function dateLabel(iso: string, locale: "en-GB" | "it-IT"): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: cSlug, event: eSlug } = await params;
  const city = await resolveCityFromSlug(cSlug);
  if (!city) return { title: "Event" };
  const ev = await findEventBySlug(city, eSlug);
  if (!ev) return { title: "Event" };
  const year = ev.event_date ? new Date(ev.event_date).getFullYear() : "";
  const en = cityEnglishName(city);
  return {
    title: `${ev.title} — ${city} ${year} — Tickets, Date & Venue`,
    description:
      `${ev.title} in ${en ?? city}${ev.venue ? ` at ${ev.venue}` : ""}` +
      `${ev.event_date ? ` on ${dateLabel(ev.event_date, "en-GB")}` : ""}. ` +
      `Biglietti, data e informazioni per ${ev.title} a ${city}. Tickets and info on ${SITE_NAME}.`,
    keywords: [
      `${ev.title} ${city}`, `${ev.title} biglietti`, `${ev.title} tickets`,
      `concerti ${city}`, `eventi ${city}`,
    ],
    alternates: { canonical: `/events/${citySlug(city)}/${eventSlug(ev)}` },
    openGraph: {
      title: `${ev.title} — ${city} ${year}`,
      description: `${ev.venue ? `${ev.venue}, ` : ""}${city}${ev.event_date ? ` — ${dateLabel(ev.event_date, "en-GB")}` : ""}`,
      ...(ev.photos?.[0] ? { images: [ev.photos[0]] } : {}),
    },
  };
}

export default async function EventPage({ params }: Props) {
  const { city: cSlug, event: eSlug } = await params;
  const city = await resolveCityFromSlug(cSlug);
  if (!city) notFound();

  const ev = await findEventBySlug(city, eSlug);
  if (!ev) notFound();

  const canonicalSlug = eventSlug(ev);
  const pageUrl = `${SITE_URL}/events/${citySlug(city)}/${canonicalSlug}`;
  // Same rich-result markup as the list pages, but pointing at this page.
  const jsonLd = eventsJsonLd([ev]).map(o => ({ ...o, url: pageUrl }));

  const ticketHref = ev.external_url ? affiliateTicketUrl(ev.external_url) : null;
  const cover = ev.photos?.[0];
  const others = (await fetchUpcomingEvents({ city, limit: 9 }))
    .filter(e => e.id !== ev.id)
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      {jsonLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      )}

      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <Link href={`/events/${citySlug(city)}`} className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">← Events in {city}</Link>
      </nav>

      <article>
        <header className="px-8 pt-16 pb-10 border-b border-black">
          {ev.event_date && (
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">
              {dateLabel(ev.event_date, "en-GB")}
            </p>
          )}
          <h1 className="text-[clamp(2rem,6vw,4.5rem)] font-black uppercase leading-none">{ev.title}</h1>
          <p className="mt-6 text-sm text-black/60 flex items-center gap-1">
            <span className="text-[#E5000F]">◉</span>
            {[ev.venue, ev.city].filter(Boolean).join(", ")}
          </p>
        </header>

        <div className="px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start border-b border-black">
          <div className="bg-black/5 border border-black overflow-hidden">
            {cover ? (
              <img
                src={cdnUrl(lightTmUrl(cover), "w_1000,c_limit,q_auto,f_auto")}
                alt={`${ev.title}${ev.city ? ` — ${ev.city}` : ""}`}
                decoding="async"
                className="w-full h-auto object-cover"
              />
            ) : (
              <div className="w-full aspect-[16/9] bg-gradient-to-br from-black via-[#1a0000] to-[#E5000F]/40" />
            )}
          </div>

          <div className="flex flex-col gap-6">
            {ev.description && (
              <p className="text-sm leading-relaxed text-black/80">{String(ev.description).slice(0, 1200)}</p>
            )}
            <p className="text-sm leading-relaxed text-black/80">
              {ev.title} live{ev.venue ? ` at ${ev.venue}` : ""} in {cityEnglishName(city) ?? city}
              {ev.event_date ? ` on ${dateLabel(ev.event_date, "en-GB")}` : ""}.
              {" "}Find the date, venue and official ticket link below.
            </p>
            <p className="text-sm leading-relaxed text-black/60" lang="it">
              {ev.title} a {city}{ev.venue ? `, ${ev.venue}` : ""}
              {ev.event_date ? ` — ${dateLabel(ev.event_date, "it-IT")}` : ""}.
              {" "}Data, luogo e biglietti ufficiali qui sotto.
            </p>

            <dl className="border border-black divide-y divide-black text-sm">
              {ev.event_date && (
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="font-bold uppercase tracking-widest text-xs">Date / Data</dt>
                  <dd className="text-right">{dateLabel(ev.event_date, "en-GB")}</dd>
                </div>
              )}
              {ev.venue && (
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="font-bold uppercase tracking-widest text-xs">Venue / Luogo</dt>
                  <dd className="text-right">{ev.venue}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="font-bold uppercase tracking-widest text-xs">City / Città</dt>
                <dd className="text-right">{city}</dd>
              </div>
              {ev.source === "external" && ev.source_name && (
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="font-bold uppercase tracking-widest text-xs">Tickets by</dt>
                  <dd className="text-right">{ev.source_name}</dd>
                </div>
              )}
            </dl>

            {ticketHref && (
              <div>
                <a
                  href={ticketHref}
                  target="_blank"
                  rel={ticketRel(ev.external_url!, ticketHref)}
                  className="inline-block bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-8 py-4 hover:bg-black transition-colors"
                >
                  Get Tickets / Biglietti →
                </a>
                <AffiliateNote className="mt-3" />
              </div>
            )}
          </div>
        </div>
      </article>

      {others.length > 0 && (
        <section className="px-8 py-12">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-black/40 mb-6">More events in {city}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-black border border-black">
            {others.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </section>
      )}

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
