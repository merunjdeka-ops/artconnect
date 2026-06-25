// Insert Cloudinary delivery transforms into a Cloudinary URL. Non-Cloudinary
// URLs (e.g. Supabase storage) pass through unchanged. `transform` is a raw
// Cloudinary transformation string, e.g. "w_800,c_limit,q_auto,f_auto".
export function cdnUrl(url: string | null | undefined, transform: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url ?? "";
  return url.replace("/upload/", `/upload/${transform}/`);
}
