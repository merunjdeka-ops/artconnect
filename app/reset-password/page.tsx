"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // The recovery link redirects here with the session tokens in the URL hash;
  // the Supabase client parses them on load. Poll briefly until the session is
  // available, otherwise treat the link as expired/invalid.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supabase = getSupabase();
      let session = (await supabase.auth.getSession()).data.session;
      for (let i = 0; i < 10 && !session; i++) {
        await new Promise(r => setTimeout(r, 400));
        session = (await supabase.auth.getSession()).data.session;
      }
      if (cancelled) return;
      setStatus(session ? "ready" : "invalid");
    }
    check();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      setStatus("done");
      setTimeout(() => router.replace("/dashboard"), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30";

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border border-black bg-white p-10">
          {status === "checking" && (
            <p className="text-xs uppercase tracking-widest text-black/40 text-center py-8">Verifying your link...</p>
          )}

          {status === "invalid" && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Link expired</p>
              <h2 className="text-4xl font-black uppercase leading-none mb-6">Invalid<br />Link</h2>
              <p className="text-sm text-black/60 leading-relaxed mb-8">
                This password reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block bg-black text-white text-xs font-bold uppercase tracking-widest px-8 py-4 hover:bg-[#E5000F] transition-colors"
              >
                Request New Link
              </Link>
            </>
          )}

          {status === "done" && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">All set</p>
              <h2 className="text-4xl font-black uppercase leading-none mb-6">Password<br />Updated</h2>
              <p className="text-sm text-black/60 leading-relaxed">
                Your password has been changed. Taking you to your dashboard...
              </p>
            </>
          )}

          {status === "ready" && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Almost done</p>
              <h2 className="text-4xl font-black uppercase leading-none mb-8">New<br />Password</h2>

              {error && (
                <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="password" placeholder="New password (min. 8 characters)" required minLength={8}
                  value={password} onChange={e => setPassword(e.target.value)} className={inputClass}
                />
                <input
                  type="password" placeholder="Confirm new password" required minLength={8}
                  value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass}
                />
                <button type="submit" disabled={saving}
                  className="mt-2 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
