import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  resolveCityFromSlug, fetchUpcomingEvents, fetchWeekendEvents, weekendRange,
  eventsJsonLd, jsonLdString, cityEnglishName,
} from "@/lib/events";
import { SITE_NAME } from "@/lib/config";
import EventCard from "../../event-card";
import AffiliateNote from "../../../components/AffiliateNote";

// "Cosa fare a Milano questo weekend" — a recurring-search landing page per
// city, rebuilt from the events table every half hour. Kept as a 200 with the
// next upcoming events when a weekend is empty, so the URL never flaps.
export const revalidate = 1800;

type Props = { params: Promise<{ city: string }> };

function rangeLabel(locale: "en-GB" | "it-IT"): string {
  const { start, end } = weekendRange();
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { day: "numeric", month: "long", timeZone: "Europe/Rome" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await resolveCityFromSlug(slug);
  if (!city) return { title: "Weekend events" };
  const en = cityEnglishName(city);
  return {
    title: `Cosa fare a ${city} questo weekend — Events This Weekend in ${en ?? city}`,
    description:
      `Concerti, mostre ed eventi a ${city} questo weekend (${rangeLabel("it-IT")}): date, luoghi e biglietti. ` +
      `What's on in ${en ?? city} this weekend — concerts, shows and exhibitions, updated daily on ${SITE_NAME}.`,
    keywords: [
      `cosa fare a ${city} questo weekend`, `eventi ${city} weekend`, `concerti ${city} weekend`,
      `eventi ${city} oggi`, `${en ?? city} events this weekend`, `weekend ${city}`,
    ],
    alternates: { canonical: `/events/${slug}/weekend` },
  };
}

export default async function WeekendPage({ params }: Props) {
  const { city: slug } = await params;
  const city = await resolveCityFromSlug(slug);
  if (!city) notFound();

  const weekend = await fetchWeekendEvents(city);
  const fallback = weekend.length === 0 ? (await fetchUpcomingEvents({ city, limit: 12 })) : [];
  const shown = weekend.length > 0 ? weekend : fallback;
  if (shown.length === 0) notFound();

  const jsonLd = eventsJsonLd(weekend);

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      {jsonLd.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      )}

      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <Link href={`/events/${slug}`} className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">← All {city} events</Link>
      </nav>

      <header className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">{rangeLabel("en-GB")}</p>
        <h1 className="text-[clamp(2.2rem,6vw,5rem)] font-black uppercase leading-none">This Weekend<br />in {city}</h1>
        <p className="mt-6 text-sm text-black/60 max-w-xl leading-relaxed" lang="it">
          Cosa fare a {city} questo weekend: concerti, spettacoli e mostre dal venerdì alla domenica —
          date, luoghi e biglietti, aggiornati ogni giorno.
        </p>
        {weekend.length === 0 && (
          <p className="mt-4 text-sm font-bold text-black/70">
            No events listed for this weekend — here&apos;s what&apos;s coming up next in {city}.
          </p>
        )}
      </header>

      <section className="px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-black border border-black">
          {shown.map(ev => <EventCard key={ev.id} event={ev} />)}
        </div>
        <AffiliateNote className="mt-4" />
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
