import type { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import CompetitionsClient, { type Competition } from "./competitions-client";

// Server-rendered list of open calls so it's crawlable (artists search for
// "open call", "art competition Italy 2027" and share these pages).
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Open Calls & Art Competitions — Photography, Art, Music",
  description:
    "Open calls, art competitions, photography contests and residencies for creatives — deadlines, prizes and entry details in one place.",
  alternates: { canonical: "/competitions" },
};

async function load(): Promise<Competition[] | undefined> {
  try {
    const { data, error } = await getSupabase()
      .from("competitions")
      .select("id, title, description, category, organizer, external_url, deadline, prize, entry_fee, cover_url")
      .eq("is_published", true)
      .or(`deadline.is.null,deadline.gte.${new Date().toISOString()}`)
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(60);
    return error ? undefined : ((data as Competition[]) ?? []);
  } catch {
    return undefined;
  }
}

export default async function CompetitionsPage() {
  return <CompetitionsClient initial={await load()} />;
}
