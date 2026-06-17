"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceArtist = searchParams.get("role") === "artist";

  const [role, setRole] = useState<"client" | "artist">(forceArtist ? "artist" : "client");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetErrors() { setError(""); }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setLoading(true);
    try {
      const supabase = getSupabase();

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

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Get started</p>
          <h2 className="text-4xl font-black uppercase leading-none mb-8">Create<br />Account</h2>

          {forceArtist ? (
            <div className="flex border border-[#E5000F] mb-8">
              <div className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-center bg-[#E5000F] text-white">I am an artist</div>
            </div>
          ) : (
            <div className="flex border border-black mb-8">
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

          {