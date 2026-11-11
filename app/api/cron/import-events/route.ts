import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { importTicketmasterEvents, normaliseCities } from "@/lib/ticketmaster";

// Daily Ticketmaster refresh (Vercel Cron, see vercel.json). Before this the
// import only ran when someone pressed the admin button, so the events feed —
// and the daily event roundups built from it — slowly ran dry.
export const maxDuration = 60;

// Always covered, plus every city we've imported for before.
const CORE_CITIES = [
  "Firenze", "Milano", "Roma", "Bologna", "Torino", "Napoli", "Venezia",
  "Verona", "Padova", "Genova", "Bari", "Palermo", "Catania", "Pisa",
];
const MAX_CITIES = 40;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tmKey = process.env.TICKETMASTER_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!tmKey || !serviceKey) {
    return NextResponse.json({ error: "TICKETMASTER_API_KEY or SUPABASE_SERVICE_ROLE_KEY missing." }, { status: 500 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: owner } = await admin.from("profiles").select("id").eq("is_admin", true).limit(1).maybeSingle();
  if (!owner?.id) return NextResponse.json({ error: "No admin profile to attribute imports to." }, { status: 500 });

  const { data: rows } = await admin
    .from("events").select("city").eq("source", "ticketmaster").not("city", "is", null).limit(5000);
  const known = [...new Set((rows || []).map(r => (r.city as string).trim()))];
  const cities = normaliseCities([...CORE_CITIES, ...known]).slice(0, MAX_CITIES);

  try {
    const result = await importTicketmasterEvents(admin, cities, owner.id, tmKey);
    return NextResponse.json({ cities: cities.length, ...result });
  } catch (err) {
    console.error("Cron Ticketmaster import error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed." }, { status: 502 });
  }
}
