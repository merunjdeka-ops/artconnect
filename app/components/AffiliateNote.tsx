import { AFFILIATE_ACTIVE } from "@/lib/affiliate";

// Affiliate disclosure required by the Impact/Ticketmaster programme terms
// and EU consumer-transparency rules. Renders nothing until the affiliate
// template env var is configured.
export default function AffiliateNote({ className = "" }: { className?: string }) {
  if (!AFFILIATE_ACTIVE) return null;
  return (
    <p className={`text-[10px] uppercase tracking-widest text-black/40 ${className}`}>
      Ticket links are affiliate links — we may earn a commission on purchases, at no extra cost to you.
    </p>
  );
}
