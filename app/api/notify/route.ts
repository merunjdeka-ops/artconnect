import { NextRequest, NextResponse } from "next/server";

type NotifyPayload = {
  type: "booking_request" | "booking_accepted" | "booking_declined";
  to: string;
  artistName?: string;
  clientName?: string;
  date?: string;
  message?: string;
};

function bookingRequestHtml(artistName: string, clientName: string, date: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Booking Request — ArtConnect</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #000;background:#ffffff;">
          <tr>
            <td style="background:#000;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;">ArtConnect</span>
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
                    <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${message}</p>
                  </td>
                </tr>` : ""}
              </table>

              <p style="margin:0 0 32px;font-size:14px;color:#555;line-height:1.6;">Log in to your ArtConnect dashboard to review and respond to this booking request.</p>

              <a href="https://artconnect.vercel.app/dashboard" style="display:inline-block;background:#000;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:14px 28px;text-decoration:none;">View Dashboard</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #000;background:#F2EDE4;">
              <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.15em;">ArtConnect — Connecting Artists with the World</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function bookingAcceptedHtml(artistName: string, clientName: string, date: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Accepted — ArtConnect</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #000;background:#ffffff;">
          <tr>
            <td style="background:#000;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;">ArtConnect</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.25em;color:#16a34a;">Booking Accepted</p>
              <h1 style="margin:0 0 32px;font-size:28px;font-weight:900;text-transform:uppercase;color:#000;">Your booking was accepted</h1>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px;border-bottom:1px solid #e5e5e5;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Artist</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${artistName}</p>
                  </td>
                </tr>
                ${date ? `<tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#666;">Date</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#000;">${date}</p>
                  </td>
                </tr>` : ""}
              </table>

              <p style="margin:0 0 32px;font-size:14px;color:#555;line-height:1.6;">
                Great news, ${clientName}. ${artistName} has accepted your booking request. You can coordinate further details through your dashboard.
              </p>

              <a href="https://artconnect.vercel.app/dashboard" style="display:inline-block;background:#000;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:14px 28px;text-decoration:none;">View Dashboard</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #000;background:#F2EDE4;">
              <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.15em;">ArtConnect — Connecting Artists with the World</p>
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
  <title>Booking Declined — ArtConnect</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #000;background:#ffffff;">
          <tr>
            <td style="background:#000;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;">ArtConnect</span>
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
                Unfortunately, ${artistName} is unable to take your booking at this time. Browse other talented artists on ArtConnect and find the perfect match for your project.
              </p>

              <a href="https://artconnect.vercel.app/artists" style="display:inline-block;background:#000;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;padding:14px 28px;text-decoration:none;">Browse Artists</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #000;background:#F2EDE4;">
              <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.15em;">ArtConnect — Connecting Artists with the World</p>
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
    const body: NotifyPayload = await req.json();
    const { type, to, artistName = "", clientName = "", date = "", message = "" } = body;

    if (!type || !to) {
      return NextResponse.json({ error: "Missing required fields: type, to" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    let subject: string;
    let html: string;

    if (type === "booking_request") {
      subject = `New booking request from ${clientName} — ArtConnect`;
      html = bookingRequestHtml(artistName, clientName, date, message);
    } else if (type === "booking_accepted") {
      subject = `Your booking with ${artistName} was accepted — ArtConnect`;
      html = bookingAcceptedHtml(artistName, clientName, date);
    } else if (type === "booking_declined") {
      subject = `Update on your booking request — ArtConnect`;
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
        from: "ArtConnect <noreply@artconnect.com>",
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
