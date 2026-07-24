"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
          <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2">Join Now</Link>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border border-black bg-white p-10">
          {sent ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Check your email</p>
              <h2 className="text-4xl font-black uppercase leading-none mb-6">Link<br />Sent</h2>
              <p className="text-sm text-black/60 leading-relaxed mb-8">
                If an account exists for <span className="font-bold text-black">{email}</span>, we&apos;ve sent a password reset link. Click it to choose a new password.
              </p>
              <Link
                href="/login"
                className="inline-block bg-black text-white text-xs font-bold uppercase tracking-widest px-8 py-4 hover:bg-[#E5000F] transition-colors"
              >
                Back to Login
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Forgot password</p>
              <h2 className="text-4xl font-black uppercase leading-none mb-8">Reset<br />Password</h2>

              {error && (
                <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>
              )}

              <p className="text-sm text-black/60 leading-relaxed mb-6">
                Enter the email you signed up with and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  name="email" type="email" placeholder="Email address" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                />
                <button type="submit" disabled={loading}
                  className="mt-2 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs uppercase tracking-widest text-black/40">
                Remembered it? <Link href="/login" className="text-black font-bold hover:text-[#E5000F] transition-colors">Log in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
