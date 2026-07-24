import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SITE_NAME } from "@/lib/config";

// Supabase's built-in email sender is heavily rate-limited and not intended for
// production, so confirmation emails silently fail to arrive once past a couple
// of signups. Instead we generate the confirmation link server-side with the
// service-role key and deliver it ourselves through Resend (the same provider
// and verified sender the newsletter already uses).
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, ref } = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
      ref?: string;
    };

    const cleanEmail = email?.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (role !== "artist" && role !== "client") {
      return NextResponse.json({ error: "Please choose whether you're an artist or a client." }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "Server is not configured for signups." }, { status: 500 });
    }
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "Email service is not configured." }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Creates the (unconfirmed) auth user with the metadata our handle_new_user
    // trigger reads, and returns a one-time confirmation link.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name?.trim() || "",
          role,
          ...(ref ? { referred_by: ref } : {}),
        },
        redirectTo: `${SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in instead." },
          { status: 409 }
        );
      }
      throw error;
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) throw new Error("Could not generate a confirmation link.");

    const greetingName = name?.trim() ? " " + name.trim().split(" ")[0] : "";
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <noreply@thelocalarthub.com>`,
        to: [cleanEmail],
        subject: "Confirm your email — The Local Art Hub",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#fff;">
            <p style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#E5000F;margin:0 0 12px;">Almost there</p>
            <h1 style="font-size:30px;font-weight:900;text-transform:uppercase;margin:0 0 20px;line-height:1.1;">Confirm your email.</h1>
            <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Hi${greetingName},<br><br>
              Welcome to The Local Art Hub. Click the button below to activate your account and get started.
            </p>
            <a href="${actionLink}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;">
              Confirm my email →
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
      console.error("Resend confirmation send failed:", body);
      throw new Error("Could not send the confirmation email.");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong creating your account. Please try again." },
      { status: 500 }
    );
  }
}
