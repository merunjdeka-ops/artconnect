export const POST_CATEGORIES = [
  { value: "guide", label: "Guide" },
  { value: "feature", label: "Artist Feature" },
  { value: "concert", label: "Concert" },
  { value: "show", label: "Show" },
  { value: "event", label: "Event" },
  { value: "review", label: "Review" },
  { value: "news", label: "News" },
] as const;

export function categoryLabel(value: string): string {
  return POST_CATEGORIES.find(c => c.value === value)?.label ?? value;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70)
    .replace(/^-|-$/g, "");
}
