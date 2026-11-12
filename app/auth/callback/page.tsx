"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  const [status, setStatus] = useState<"loading" | "choose-role" | "error">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Backfill profile fields the OAuth trigger can't know, then route onwards
  async function completeProfile(u: User, role: "artist" | "client") {
    const supabase = getSupabase();
    const fullName =
      (u.user_metadata?.full_name as string) ||
      (u.user_metadata?.name as string) ||
      u.email?.split("@")[0] ||
      "";
    await supabase
      .from("profiles")
      .upsert({ id: u.id, full_name: fullName, role, email: u.email ?? null }, { onConflict: "id" });
    router.replace("/dashboard");
  }

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const supabase = getSupabase();

      // The client parses the OAuth tokens from the URL on creation; poll briefly
      // until the session is available.
      let session = (await supabase.auth.getSession()).data.session;
      for (let i = 0; i < 10 && !session; i++) {
        await new Promise(r => setTimeout(r, 400));
        session = (await supabase.auth.getSession()).data.session;
      }
      if (cancelled) return;
      if (!session) { setStatus("error"); return; }

      const u = session.user;
      setUser(u);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", u.id)
        .maybeSingle();
      if (cancelled) return;

      if (profile?.role === "artist" || profile?.role === "client") {
        // Existing user — backfill email/name if the trigger left them empty, then go
        if (!profile.email || !profile.full_name) {
          await supabase.from("profiles").update({
            email: profile.email || u.email || null,
            full_name: profile.full_name || (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || null,
          }).eq("id", u.id);
        }
        router.replace("/dashboard");
        return;
      }

      // New OAuth user with no role yet
      if (roleParam === "artist" || roleParam === "client") {
        await completeProfile(u, roleParam);
      } else {
        setStatus("choose-role");
      }
    }

    resolve();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chooseRole(role: "artist" | "client") {
    if (!user || saving) return;
    setSaving(true);
    await completeProfile(user, role);
  }

  return (
    <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center px-6">
      {status === "loading" && (
        <p className="text-xs uppercase tracking-widest text-black/40">Signing you in...</p>
      )}

      {status === "error" && (
        <div className="border border-black bg-white p-10 max-w-md w-full text-center">
          <p className="font-black uppercase text-[#E5000F] mb-2">Sign-in failed</p>
          <p className="text-sm text-black/60 mb-6">We couldn&apos;t complete the sign-in. Please try again.</p>
          <button
            onClick={() => router.replace("/login")}
            className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors"
          >
            Back to Login
          </button>
        </div>
      )}

      {status === "choose-role" && (
        <div className="border border-black bg-white p-10 max-w-md w-full">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Almost there</p>
          <h1 className="text-3xl font-black uppercase leading-none mb-2">How will you<br />use The Local Art Hub?</h1>
          <p className="text-sm text-black/50 mb-8">You can&apos;t change this later, so pick the one that fits.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => chooseRole("client")}
              disabled={saving}
              className="border border-black p-5 text-left hover:bg-black hover:text-white transition-colors disabled:opacity-50 group"
            >
              <p className="font-black uppercase text-sm mb-1">I&apos;m a Client</p>
              <p className="text-xs text-black/50 group-hover:text-white/60">I want to discover and book artists for my events.</p>
            </button>
            <button
              onClick={() => chooseRole("artist")}
              disabled={saving}
              className="border border-[#E5000F] p-5 text-left hover:bg-[#E5000F] hover:text-white transition-colors disabled:opacity-50 group"
            >
              <p className="font-black uppercase text-sm mb-1 text-[#E5000F] group-hover:text-white">I&apos;m an Artist</p>
              <p className="text-xs text-black/50 group-hover:text-white/70">I want to showcase my work and get booked by clients.</p>
            </button>
          </div>
          {saving && <p className="text-xs uppercase tracking-widest text-black/40 mt-4 text-center">Setting up your account...</p>}
        </div>
      )}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-black/40">Signing you in...</p>
      </main>
    }>
      <CallbackInner />
    </Suspense>
  );
}

