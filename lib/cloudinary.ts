// Insert Cloudinary delivery transforms into a Cloudinary URL. Non-Cloudinary
// URLs (e.g. Supabase storage) pass through unchanged. `transform` is a raw
// Cloudinary transformation string, e.g. "w_800,c_limit,q_auto,f_auto".
export function cdnUrl(url: string | null | undefined, transform: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url ?? "";
  return url.replace("/upload/", `/upload/${transform}/`);
}

// Ticketmaster `_SOURCE` URLs are the full-size originals (600KB+). Every TM
// image also publishes a 640×360 variant — swap to it for feed-size rendering.
export function lightTmUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.includes("ticketm.net") && url.endsWith("_SOURCE")) {
    return url.replace(/_SOURCE$/, "_RETINA_PORTRAIT_16_9.jpg");
  }
  return url;
}
