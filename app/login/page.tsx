"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Tab = "email" | "phone";
type PhoneStep = "enter" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("email");

  // Email login
  const [form, setForm] = useState({ email: "", password: "" });

  // Phone login
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetErrors() { setError(""); }

  // ── Email login ──
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) { setError(error.message); return; }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ── Phone: send OTP ──
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    if (!phone.match(/^\+?[1-9]\d{6,14}$/)) {
      setError("Enter a valid phone number with country code (e.g. +39 333 1234567).");
      return;
    }
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithOtp({ phone });
      if (error) { setError(error.message); return; }
      setPhoneStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  // ── Phone: verify OTP ──
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });
      if (error) { setError(error.message); return; }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code.");
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

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Welcome back</p>
          <h2 className="text-4xl font-black uppercase leading-none mb-8">Log<br />In</h2>

          
            <span className="text-xs uppercase tracking-widest text-black/40">or</span>
            <span className="flex-1 h-px bg-black/20" />
          </div>

          {/* Method tabs */}
          <div className="flex border border-black mb-8">
            <button
              onClick={() => { setTab("email"); resetErrors(); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === "email" ? "bg-black text-white" : "text-black hover:bg-black/5"}`}
            >
              Email
            </button>
            <button
              onClick={() => { setTab("phone"); resetErrors(); setPhoneStep("enter"); }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest border-l border-black transition-colors ${tab === "phone" ? "bg-black text-white" : "text-black hover:bg-black/5"}`}
            >
              Phone
            </button>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">
              {error}
            </div>
          )}

          {/* ── Email form ── */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
              <input
                name="email" type="email" placeholder="Email address" required
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
              />
              <input
                name="password" type="password" placeholder="Password" required
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
              />
              <button type="submit" disabled={loading}
                className="mt-2 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
          )}

          {/* ── Phone: enter number ── */}
          {tab === "phone" && phoneStep === "enter" && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+39 333 123 4567"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                />
                <p className="text-xs text-black/40 mt-2">Include your country code (e.g. +39 for Italy, +1 for US)</p>
              </div>
              <button type="submit" disabled={loading}
                className="py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          )}

          {/* ── Phone: enter OTP ── */}
          {tab === "phone" && phoneStep === "verify" && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="px-4 py-3 bg-black/5 border border-black/10 text-xs uppercase tracking-widest text-black/50">
                Code sent to {phone}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="6-digit code"
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 tracking-[0.4em] text-center text-lg font-bold"
                />
              </div>
              <button type="submit" disabled={loading || otp.length < 6}
                className="py-4 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50">
                {loading ? "Verifying..." : "Verify & Log In"}
              </button>
              <button type="button" onClick={() => { setPhoneStep("enter"); setOtp(""); resetErrors(); }}
                className="text-xs text-black/40 uppercase tracking-widest hover:text-black transition-colors">
                ← Change number
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs uppercase tracking-widest text-black/40">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-black font-bold hover:text-[#E5000F] transition-colors">Sign up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}











