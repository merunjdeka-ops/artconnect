// ─── Central site configuration ───────────────────────────────────────────────
// Change these values here and they update everywhere on the site automatically.

export const SITE_NAME = "The Local Art Hub";

export const CONTACT_EMAIL = "goartconnect@gmail.com";
export const PRIVACY_EMAIL = "goartconnect@gmail.com";
export const LEGAL_EMAIL   = "goartconnect@gmail.com";
export const DMCA_EMAIL    = "goartconnect@gmail.com";

export const SITE_URL = "https://www.thelocalarthub.com";

// Google AdSense publisher ID (ca-pub-XXXXXXXXXXXXXXXX). Leave unset until the
// AdSense account is created and approved — ad slots fall back to house ads.
// The script tag and meta tag need the "ca-pub-…" form, but AdSense shows the
// ID as "pub-…" in several places — accept either and normalise here.
const rawAdsenseClient = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "").trim();
export const ADSENSE_CLIENT =
  rawAdsenseClient && !rawAdsenseClient.startsWith("ca-") ? `ca-${rawAdsenseClient}` : rawAdsenseClient;



