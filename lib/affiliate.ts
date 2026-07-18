// Ticketmaster affiliate (Impact network) link wrapping.
//
// Inert until NEXT_PUBLIC_TM_AFFILIATE_TEMPLATE is set in Vercel to the
// Impact deep-link template with a {url} placeholder, e.g.
//   https://ticketmaster.pxf.io/c/1234567/890123/12345?u={url}
// The destination URL is substituted into {url} percent-encoded.
const TEMPLATE = process.env.NEXT_PUBLIC_TM_AFFILIATE_TEMPLATE ?? "";

export const AFFILIATE_ACTIVE = TEMPLATE.includes("{url}");

// Hosts covered by the Ticketmaster affiliate programme (any TLD).
const TICKET_HOST = /(^|\.)(ticketmaster|ticketweb|universe|frontgatetickets)\.[a-z.]+$/i;

/**
 * Wrap a ticket-seller URL in the affiliate deep link. Returns the URL
 * unchanged when no template is configured, the URL is not a ticket-seller
 * host, or the URL is malformed.
 */
export function affiliateTicketUrl(url: string): string {
  if (!AFFILIATE_ACTIVE) return url;
  try {
    if (!TICKET_HOST.test(new URL(url).hostname)) return url;
  } catch {
    return url;
  }
  return TEMPLATE.replace("{url}", encodeURIComponent(url));
}

/** rel attribute for an outbound ticket link (Google wants affiliate links marked sponsored). */
export function ticketRel(rawUrl: string, href: string): string {
  return href !== rawUrl ? "sponsored noopener noreferrer" : "noopener noreferrer";
}
