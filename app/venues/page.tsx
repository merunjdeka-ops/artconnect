import type { Metadata } from "next";
import Link from "next/link";
import { fetchVenues, cityEnglishName } from "@/lib/events";
import { SiteNav, SiteFooter } from "../events/page-shell";

// Index of every venue with upcoming events, grouped by city.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Concert Venues & Theatres in Italy — Upcoming Programmes",
  description:
    "Upcoming concerts and shows at Italy's venues, arenas and theatres — programme, dates and tickets for each venue. Programmi di teatri e locali in Italia.",
  alternates: { canonical: "/venues" },
};

export default async function VenuesIndex() {
  const venues = await fetchVenues();
  const byCity = new Map<string, typeof venues>();
  for (const v of venues) byCity.set(v.city, [...(byCity.get(v.city) ?? []), v]);

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <SiteNav backHref="/events" backLabel="All events" />
      <header className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Venues</p>
        <h1 className="text-[clamp(2.5rem,7vw,6rem)] font-black uppercase leading-none">Venues in<br />Italy</h1>
        <p className="mt-6 text-sm text-black/60 max-w-xl leading-relaxed">
          {venues.length} venues with upcoming concerts and shows. Pick one to see its programme.
        </p>
      </header>
      <section className="px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {[...byCity.entries()].map(([city, list]) => (
          <div key={city}>
            <h2 className="text-lg font-black uppercase border-b border-black pb-2 mb-3">
              {city}{cityEnglishName(city) ? <span className="text-black/40 font-normal normal-case"> · {cityEnglishName(city)}</span> : null}
            </h2>
            <ul className="flex flex-col gap-2">
              {list.map(v => (
                <li key={v.slug}>
                  <Link href={`/venues/${v.slug}`} className="text-sm hover:text-[#E5000F] transition-colors">
                    {v.venue} <span className="text-black/40">({v.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {venues.length === 0 && <p className="text-sm text-black/50">No venues with upcoming events right now.</p>}
      </section>
      <SiteFooter />
    </main>
  );
}
