export function cdnUrl(url: string | null | undefined, transform: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url ?? "";
  return url.replace("/image/upload/", `/image/upload/${transform}/`);
}
