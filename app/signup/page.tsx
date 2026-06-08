"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Tab = "email" | "phone";
type PhoneStep = "enter" | "verify";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceArtist = searchParams.get("role") === "artist";

  const [role, setRole] = useState<"client" | "artist">(forceArtist ? "artist" : "client");
  const [tab, setTab] = useState<Tab>("email");

  // Email fields
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  // Phone fields
  const [phoneName, setPhoneName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetErrors() { setError(""); }

  // ── Email signup ──
  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setLoading(true);
    try {
      const supabase = getSupabase();

      // Check if email already exists in profiles
      const { data: existingEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email)
        .maybeSingle();

      if (existingEmail) {
        setError("An account with this email already exists. Please log in instead.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name, role } },
      });

      // Supabase returns no error for duplicate emails (sends confirmation again)
      // so catch the "already registered" case explicitly
      if (error) {
        if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already exists")) {
          setError("An account with this email already exists. Please log in instead.");
        } else {
          setError(error.message);
        }
        return;
      }
      router.push("/signup/confirm");
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
    if (!phoneName.trim()) { setError("Please enter your full name."); return; }
    if (!phone.match(/^\+?[1-9]\d{6,14}$/)) {
      setError("Enter a valid phone number with country code (e.g. +39 333 1234567).");
      return;
    }
    setLoading(true);
    try {
      // Check if phone number is already registered
      const supabase = getSupabase();
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone_number", phone)
        .maybeSingle();

      if (existing) {
        setError("This phone number is already linked to an account. Please log in instead.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { data: { full_name: phoneName, role } },
      });
      if (error) { setError(error.message); return; }
      setPhoneStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  // ── Phone: verify OTP → create profile ──
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });
      if (error) { setError(error.message); return; }

      if (data.user) {
        // Check if this auth user already has a profile (existing account)
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", data.user.id)
          .maybeSingle();

        if (existingProfile) {
          // Already registered — just send to dashboard (they're logged in)
          router.push("/dashboard");
          return;
        }

        // New user — create profile
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: phoneName,
          role,
          phone_number: phone,
        }, { onConflict: "id" });
      }

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
        <Link href="/" className="text-xl font-black tracking-tight uppercase">ArtConnect</Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
          <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2">Join Now</Link>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border border-black bg-white p-10">

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Get started</p>
          <h2 className="text-4xl font-black uppercase leading-none mb-8">Create<br />Account</h2>

          {/* Role toggle */}
          {forceArtist ? (
            <div className="flex border border-[#E5000F] mb-6">
              <div className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-center bg-[#E5000F] text-white">I am an artist</div>
            </div>
          ) : (
            <div className="flex border border-black mb-6">
              <button type="button" onClick={() => setRole("client")}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${role === "client" ? "bg-black text-white" : "text-black hover:bg-black/5"}`}>
                I need an artist
              </button>
              <button type="button" onClick={() => setRole("artist")}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest border-l border-black transition-colors ${role === "artist" ? "bg-[#E5000F] text-white" : "text-black hover:bg-black/5"}`}>
                I am an artist
              </button>
            </div>
          )}

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
            <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>
          )}

          {/* ── Email form ── */}
          {tab === "email" && (
            <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
              <input name="name" type="text" placeholder="Full name" required
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30" />
              <input name="email" type="email" placeholder="Email address" required
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30" />
              <input name="password" type="password" placeholder="Password (min. 8 characters)" required minLength={8}
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30" />
              <button type="submit" disabled={loading}
                className="mt-2 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          {/* ── Phone: enter details ── */}
          {tab === "phone" && phoneStep === "enter" && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <input type="text" placeholder="Full name" required
                value={phoneName} onChange={e => setPhoneName(e.target.value)}
                className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30" />
              <div>
                <input type="tel" placeholder="+39 333 123 4567" required
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30" />
                <p className="text-xs text-black/40 mt-2">Include country code — e.g. +39 Italy, +44 UK, +1 US/Canada</p>
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
                  type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  placeholder="6-digit code" required
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 tracking-[0.4em] text-center text-lg font-bold"
                />
                <p className="text-xs text-black/40 mt-2">Enter the 6-digit SMS code. It may take up to 30 seconds.</p>
              </div>
              <button type="submit" disabled={loading || otp.length < 6}
                className="py-4 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50">
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
              <button type="button" onClick={() => { setPhoneStep("enter"); setOtp(""); resetErrors(); }}
                className="text-xs text-black/40 uppercase tracking-widest hover:text-black transition-colors">
                ← Change number
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs uppercase tracking-widest text-black/40">
            Already have an account?{" "}
            <Link href="/login" className="text-black font-bold hover:text-[#E5000F] transition-colors">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
