"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"client" | "artist">("client");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          role: role,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/signup/confirm");
    }
  }

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans flex flex-col">

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight uppercase">ArtConnect</Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">
            Login
          </Link>
          <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2">
            Join Now
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border border-black bg-white p-10">

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Get started</p>
          <h2 className="text-4xl font-black uppercase leading-none mb-8">Create<br />Account</h2>

          {/* Role toggle */}
          <div className="flex border border-black mb-8">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                role === "client" ? "bg-black text-white" : "text-black hover:bg-black/5"
              }`}
            >
              I need an artist
            </button>
            <button
              type="button"
              onClick={() => setRole("artist")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-l border-black ${
                role === "artist" ? "bg-[#E5000F] text-white" : "text-black hover:bg-black/5"
              }`}
            >
              I am an artist
            </button>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              name="name"
              type="text"
              placeholder="Full name"
              required
              value={form.name}
              onChange={handleChange}
              className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
            <input
              name="email"
              type="email"
              placeholder="Email address"
              required
              value={form.email}
              onChange={handleChange}
              className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
            <input
              name="password"
              type="password"
              placeholder="Password (min. 8 characters)"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs uppercase tracking-widest text-black/40">
            Already have an account?{" "}
            <Link href="/login" className="text-black font-bold hover:text-[#E5000F] transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
