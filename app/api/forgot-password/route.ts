import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SITE_NAME } from "@/lib/config";

// Generates a password-recovery link server-side and delivers it through Resend,
// rather than relying on Supabase's rate-limited built-in email sender. To avoid
// leaking which emails have accounts, this always responds with { ok: true }
// regardless of whether the address exists.
export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const cleanEmail = email?.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    if (!serviceKey || !resendKey) {
      return NextResponse.json({ error: "Server is not configured." }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    });

    // No account for this email (or any other issue) — respond success anyway so
    // the endpoint can't be used to probe which emails are registered.
    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      if (error) console.error("Recovery link generation skipped:", error.message);
      return NextResponse.json({ ok: true });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <noreply@thelocalarthub.com>`,
        to: [cleanEmail],
        subject: "Reset your password — The Local Art Hub",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#fff;">
            <p style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#E5000F;margin:0 0 12px;">Password reset</p>
            <h1 style="font-size:30px;font-weight:900;text-transform:uppercase;margin:0 0 20px;line-height:1.1;">Reset your password.</h1>
            <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
              We received a request to reset the password for your account. Click the button below to choose a new one. If you didn't ask for this, you can safely ignore this email.
            </p>
            <a href="${actionLink}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;">
              Reset my password →
            </a>
            <p style="color:#999;font-size:12px;line-height:1.7;margin:28px 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${actionLink}" style="color:#E5000F;word-break:break-all;">${actionLink}</a>
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:36px 0 20px;">
            <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0;">
              The Local Art Hub &nbsp;·&nbsp;
              <a href="https://thelocalarthub.com" style="color:#E5000F;text-decoration:none;">thelocalarthub.com</a>
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const body = await emailRes.text();
      console.error("Resend recovery send failed:", body);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot-password error:", err);
    // Generic response — never reveal internal state to the caller.
    return NextResponse.json({ ok: true });
  }
}
