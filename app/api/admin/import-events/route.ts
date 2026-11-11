import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { importTicketmasterEvents, normaliseCities } from "@/lib/ticketmaster";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

    // Verify the caller and confirm they are an admin.
    const authClient = createClient(url, anon);
    const { data: { user }, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!profile?.is_admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

    // Accept one or more comma-separated cities, e.g. "Lucca, Firenze, Pisa".
    const { city } = (await req.json()) as { city?: string };
    const cities = normaliseCities((city ?? "").split(","));
    if (cities.length === 0) return NextResponse.json({ error: "City is required." }, { status: 400 });
    if (cities.length > 10) return NextResponse.json({ error: "Up to 10 cities per import." }, { status: 400 });

    const tmKey = process.env.TICKETMASTER_API_KEY;
    if (!tmKey) {
      return NextResponse.json(
        { error: "Ticketmaster is not configured. Add TICKETMASTER_API_KEY to your environment." },
        { status: 500 }
      );
    }

    try {
      return NextResponse.json(await importTicketmasterEvents(admin, cities, user.id, tmKey));
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Ticketmaster request failed")) {
        return NextResponse.json({ error: e.message }, { status: 502 });
      }
      throw e;
    }
  } catch (err) {
    console.error("Ticketmaster import error:", err);
    return NextResponse.json({ error: "Import failed." }, { status: 500 });
  }
}
