import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Escape user-supplied values before interpolating into email HTML (prevents HTML/script injection)
function esc(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type NotifyPayload = {
  type: "booking_request" | "booking_accepted" | "booking_declined";
  to: string;
  artistName?: string;
  clientName?: string;
  date?: string;
  message?: string;
  packageName?: string;
  packagePrice?: number;
  durationHours?: number;
  otherPhone?: string;
};

function bookingRequestHtml(artistName: string, clientName: string, date: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Booking Request — The Local Art Hub</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #000;background:#ffffff;">
          <tr>
            <td style="background:#000;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;">The Local Art Hub</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.25em;color:#E5000F;">New Booking Request</p>
              <h1 style="margin:0 0 32px;font-size:28px;font-weight:900;text-transform:uppercase;color:#000;">You have a new booking request</h1>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #e5e5e5;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">From</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${clientName}</p>
                  </td>
                </tr>
                ${date ? `<tr>
                  <td style="padding:16px;border-bottom:1px solid #e5e5e5;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Requested Date</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${date}</p>
                  </td>
                </tr>` : ""}
                ${message ? `<tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Message</p>
                    <p style="margin:0;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${message}</p>
                  </td>
                </tr>` : ""}
              </table>

              <p style="margin:0 0 32px;font-size:14px;color:#555;line-height:1.6;">Log in to your dashboard on The Local Art Hub to review and respond to this booking request.</p>

              <a href="https://thelocalarthub.com/dashboard" style="display:inline-block;background:#000;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:14px 28px;text-decoration:none;">View Dashboard</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #000;background:#F2EDE4;">
              <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.15em;">The Local Art Hub — Connecting Artists with the World</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function bookingAcceptedHtml(
  artistName: string, clientName: string, date: string,
  packageName?: string, packagePrice?: number, durationHours?: number, otherPhone?: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmed — The Local Art Hub</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #000;background:#ffffff;">
          <tr>
            <td style="background:#000;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;">The Local Art Hub</span>
            </td>
          </tr>
          <!-- Green confirmation banner -->
          <tr>
            <td style="background:#16a34a;padding:20px 32px;">
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.25em;color:#ffffff;">✓ Booking Confirmed</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;text-transform:uppercase;color:#000;">You're all set, ${clientName}!</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#555;line-height:1.6;">
                <strong>${artistName}</strong> has accepted your booking. Here's a summary of what was agreed. Reach out through your dashboard to coordinate any final details.
              </p>

              <!-- Booking details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #e5e5e5;background:#f9f9f9;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Artist</p>
                    <p style="margin:0;font-size:16px;font-weight:900;color:#000;text-transform:uppercase;">${artistName}</p>
                  </td>
                </tr>
                ${date ? `<tr>
                  <td style="padding:16px;border-bottom:1px solid #e5e5e5;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Date</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${date}</p>
                  </td>
                </tr>` : ""}
                ${durationHours ? `<tr>
                  <td style="padding:16px;border-bottom:1px solid #e5e5e5;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Duration</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${durationHours} hour${durationHours !== 1 ? "s" : ""}</p>
                  </td>
                </tr>` : ""}
                ${packageName ? `<tr>
                  <td style="padding:16px;border-bottom:1px solid #e5e5e5;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Package</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${packageName}</p>
                  </td>
                </tr>` : ""}
                ${packagePrice ? `<tr>
                  <td style="padding:16px;background:#000;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#888;">Total</p>
                    <p style="margin:0;font-size:22px;font-weight:900;color:#E5000F;">€${packagePrice}</p>
                  </td>
                </tr>` : ""}
                ${otherPhone ? `<tr>
                  <td style="padding:16px;background:#f0fdf4;border-top:2px solid #16a34a;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#16a34a;">📞 Contact Number</p>
                    <p style="margin:0;font-size:18px;font-weight:900;color:#000;">${otherPhone}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#666;">Reach out directly to coordinate your session.</p>
                  </td>
                </tr>` : ""}
              </table>

              <p style="margin:0 0 32px;font-size:13px;color:#888;line-height:1.6;">
                Questions? Reply to this email or contact ${artistName} directly through your dashboard on The Local Art Hub.
              </p>

              <a href="https://thelocalarthub.com/dashboard" style="display:inline-block;background:#E5000F;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:16px 32px;text-decoration:none;">View My Bookings</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #000;background:#F2EDE4;">
              <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.15em;">The Local Art Hub — Connecting Artists with the World</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function bookingDeclinedHtml(artistName: string, clientName: string, date: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Declined — The Local Art Hub</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #000;background:#ffffff;">
          <tr>
            <td style="background:#000;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;">The Local Art Hub</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.25em;color:#E5000F;">Booking Update</p>
              <h1 style="margin:0 0 32px;font-size:28px;font-weight:900;text-transform:uppercase;color:#000;">Booking not available</h1>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #e5e5e5;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Artist</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${artistName}</p>
                  </td>
                </tr>
                ${date ? `<tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Requested Date</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${date}</p>
                  </td>
                </tr>` : ""}
              </table>

              <p style="margin:0 0 32px;font-size:14px;color:#555;line-height:1.6;">
                Unfortunately, ${artistName} is unable to take your booking at this time. Browse other talented artists on The Local Art Hub and find the perfect match for your project.
              </p>

              <a href="https://thelocalarthub.com/artists" style="display:inline-block;background:#000;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:14px 28px;text-decoration:none;">Browse Artists</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #000;background:#F2EDE4;">
              <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.15em;">The Local Art Hub — Connecting Artists with the World</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    // Require a valid logged-in Supabase session — prevents anonymous abuse of this endpoint
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: NotifyPayload = await req.json();
    const { type, to } = body;
    // Escape all user-supplied values before they reach the HTML templates
    const artistName = esc(body.artistName);
    const clientName = esc(body.clientName);
    const date = esc(body.date);
    const message = esc(body.message);
    const packageName = body.packageName ? esc(body.packageName) : undefined;
    const packagePrice = body.packagePrice;
    const durationHours = body.durationHours;
    const otherPhone = body.otherPhone ? esc(body.otherPhone) : undefined;

    if (!type || !to) {
      return NextResponse.json({ error: "Missing required fields: type, to" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to)) || String(to).length > 254) {
      return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    let subject: string;
    let html: string;

    if (type === "booking_request") {
      subject = `New booking request from ${body.clientName || "a client"} — The Local Art Hub`;
      html = bookingRequestHtml(artistName, clientName, date, message);
    } else if (type === "booking_accepted") {
      subject = `✓ Booking confirmed with ${body.artistName || "your artist"} — The Local Art Hub`;
      html = bookingAcceptedHtml(artistName, clientName, date, packageName, packagePrice, durationHours, otherPhone);
    } else if (type === "booking_declined") {
      subject = `Update on your booking request — The Local Art Hub`;
      html = bookingDeclinedHtml(artistName, clientName, date);
    } else {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Local Art Hub <noreply@thelocalarthub.com>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", err);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}




