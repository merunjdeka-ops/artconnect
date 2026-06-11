import { NextRequest, NextResponse } from "next/server";

// Escape user-supplied values before interpolating into email HTML (prevents HTML/script injection)
function esc(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();

    if (!raw.name || !raw.email || !raw.message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!EMAIL_RE.test(String(raw.email)) || String(raw.email).length > 254) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (String(raw.name).length > 100 || String(raw.message).length > 5000 || String(raw.subject || "").length > 200) {
      return NextResponse.json({ error: "Input too long." }, { status: 400 });
    }

    const name = esc(raw.name);
    const email = esc(raw.email);
    const subject = esc(raw.subject);
    const message = esc(raw.message);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured." }, { status: 500 });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New Contact Message</title></head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #000;background:#fff;">
          <tr>
            <td style="background:#000;padding:24px 32px;">
              <span style="color:#fff;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;">The Local Art Hub</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#E5000F;margin:0 0 12px;">New Contact Message</p>
              <h2 style="font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 24px;color:#000;">${subject || "General Enquiry"}</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px;background:#F2EDE4;border:1px solid #000;">
                    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#000;margin:0 0 4px;">From</p>
                    <p style="font-size:15px;font-weight:700;color:#000;margin:0;">${name}</p>
                    <p style="font-size:13px;color:#666;margin:4px 0 0;"><a href="mailto:${email}" style="color:#E5000F;">${email}</a></p>
                  </td>
                </tr>
              </table>
              <div style="border:1px solid #000;padding:20px;background:#F2EDE4;">
                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#000;margin:0 0 12px;">Message</p>
                <p style="font-size:14px;color:#333;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
              </div>
              <p style="font-size:12px;color:#999;margin:24px 0 0;">Reply directly to this email to respond to ${name}.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#000;padding:16px 32px;text-align:center;">
              <span style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;">goartconnect.com</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "The Local Art Hub <onboarding@resend.dev>",
        to: ["goartconnect@gmail.com"],
        reply_to: raw.email,
        subject: `[Contact] ${raw.subject || "New message from " + raw.name}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message || "Failed to send." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}



