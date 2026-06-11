import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Escape user-supplied values before interpolating into email HTML
function esc(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, reason } = await req.json();
    if (!bookingId || !reason || String(reason).trim().length === 0) {
      return NextResponse.json({ error: "Missing booking or reason" }, { status: 400 });
    }
    if (String(reason).length > 2000) {
      return NextResponse.json({ error: "Reason too long" }, { status: 400 });
    }

    // Fetch the booking as the requesting user — RLS ensures they can only see their own
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, event_date, status, package_name, package_price, artist_id, client_id, artist:artist_id(full_name, email), client:client_id(full_name, email)")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const artist: any = Array.isArray(booking.artist) ? booking.artist[0] : booking.artist;
    const client: any = Array.isArray(booking.client) ? booking.client[0] : booking.client;
    const requesterRole = user.id === booking.artist_id ? "Artist" : "Client";
    const dateStr = booking.event_date
      ? new Date(booking.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "TBD";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Cancellation Request</title></head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #000;background:#fff;">
        <tr><td style="background:#000;padding:24px 32px;">
          <span style="color:#fff;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;">The Local Art Hub</span>
        </td></tr>
        <tr><td style="background:#E5000F;padding:16px 32px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.25em;color:#fff;">Cancellation Request</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000;margin-bottom:24px;">
            <tr><td style="padding:14px;border-bottom:1px solid #e5e5e5;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Booking ID</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#000;">${esc(booking.id)}</p>
            </td></tr>
            <tr><td style="padding:14px;border-bottom:1px solid #e5e5e5;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Requested By</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#000;">${esc(requesterRole)} — ${esc(user.email)}</p>
            </td></tr>
            <tr><td style="padding:14px;border-bottom:1px solid #e5e5e5;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Artist</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#000;">${esc(artist?.full_name)} ${artist?.email ? `(${esc(artist.email)})` : ""}</p>
            </td></tr>
            <tr><td style="padding:14px;border-bottom:1px solid #e5e5e5;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Client</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#000;">${esc(client?.full_name)} ${client?.email ? `(${esc(client.email)})` : ""}</p>
            </td></tr>
            <tr><td style="padding:14px;${booking.package_name || booking.package_price ? "border-bottom:1px solid #e5e5e5;" : ""}">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Event Date</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#000;">${esc(dateStr)}</p>
            </td></tr>
            ${booking.package_name ? `<tr><td style="padding:14px;${booking.package_price ? "border-bottom:1px solid #e5e5e5;" : ""}">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Package</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#000;">${esc(booking.package_name)}</p>
            </td></tr>` : ""}
            ${booking.package_price ? `<tr><td style="padding:14px;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Price</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#E5000F;">€${esc(booking.package_price)}</p>
            </td></tr>` : ""}
          </table>
          <div style="border:1px solid #000;padding:18px;background:#F2EDE4;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#000;">Reason</p>
            <p style="margin:0;font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap;">${esc(reason)}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "The Local Art Hub <onboarding@resend.dev>",
        to: ["goartconnect@gmail.com"],
        reply_to: user.email,
        subject: `Cancellation Request — Booking #${String(booking.id).slice(0, 8).toUpperCase()}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend API error:", await res.text());
      return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

