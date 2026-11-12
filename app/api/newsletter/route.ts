import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json() as { email?: string; name?: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key);

    // Plain insert rather than upsert with ignoreDuplicates: an
    // "INSERT ... ON CONFLICT DO NOTHING" requires a SELECT policy under RLS
    // (so Postgres can see the conflicting row), which we deliberately don't
    // grant — that would expose the whole subscriber list through the public
    // anon key. Instead we insert and treat a duplicate (unique violation,
    // 23505) as success, keeping signups idempotent and the list private.
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: email.toLowerCase().trim(), name: name?.trim() || null });

    if (error && error.code !== "23505") throw error;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "The Local Art Hub <noreply@thelocalarthub.com>",
          to: [email],
          subject: "You're in — welcome to The Local Art Hub",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#fff;">
              <p style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#E5000F;margin:0 0 12px;">Welcome</p>
              <h1 style="font-size:30px;font-weight:900;text-transform:uppercase;margin:0 0 20px;line-height:1.1;">You&apos;re on the list.</h1>
              <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
                Hi${name ? " " + name : ""},<br><br>
                Thanks for joining The Local Art Hub newsletter. We&apos;ll let you know when exceptional new artists join the platform and share inspiration from Italy&apos;s local creative scene.
              </p>
              <a href="https://thelocalarthub.com/artists" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;">
                Browse Artists →
              </a>
              <hr style="border:none;border-top:1px solid #eee;margin:36px 0 20px;">
              <p style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0;">
                The Local Art Hub &nbsp;·&nbsp;
                <a href="https://thelocalarthub.com" style="color:#E5000F;text-decoration:none;">thelocalarthub.com</a>
              </p>
            </div>
          `,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Newsletter subscribe error:", err);
    return NextResponse.json({ error: "Failed to subscribe." }, { status: 500 });
  }
}
