import Link from "next/link";
import { cdnUrl, lightTmUrl } from "@/lib/cloudinary";
import type { PublicEvent } from "@/lib/events";

// Server-rendered event card for the public /events pages — same visual
// language as the homepage EventsFeed cards, but crawlable HTML.

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome",
  });
}

export default function EventCard({ event }: { event: PublicEvent }) {
  const cover = event.photos?.[0];
  const href = event.external_url || (event.artist_id ? `/artists/${event.artist_id}` : null);
  const isExternal = !!event.external_url;

  const inner = (
    <>
      <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
        {cover ? (
          <img
            src={cdnUrl(lightTmUrl(cover), "w_700,c_limit,q_auto,f_auto")}
            alt={`${event.title}${event.city ? ` — ${event.city}` : ""}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-black via-[#1a0000] to-[#E5000F]/40" />
        )}
        {event.source === "external" && event.source_name && (
          <span className="absolute top-3 left-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-2 py-1">{event.source_name}</span>
        )}
      </div>
      <div className="p-5">
        {event.event_date && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#E5000F] mb-2">{formatDate(event.event_date)}</p>
        )}
        <h3 className="text-lg font-black uppercase leading-tight mb-1">{event.title}</h3>
        {(event.venue || event.city) && (
          <p className="text-xs text-black/60 flex items-center gap-1">
            <span className="text-[#E5000F]">◉</span>
            {[event.venue, event.city].filter(Boolean).join(", ")}
          </p>
        )}
        {href && (
          <span className="inline-block mt-4 text-[11px] font-bold uppercase tracking-widest border-b-2 border-black group-hover:border-[#E5000F] group-hover:text-[#E5000F] transition-colors pb-0.5">
            {isExternal ? "Get tickets →" : "View artist →"}
          </span>
        )}
      </div>
    </>
  );

  const cardClass = "bg-[#F2EDE4] group flex flex-col";

  if (href && isExternal) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cardClass}>{inner}</a>;
  }
  if (href) {
    return <Link href={href} className={cardClass}>{inner}</Link>;
  }
  return <div className={cardClass}>{inner}</div>;
}
