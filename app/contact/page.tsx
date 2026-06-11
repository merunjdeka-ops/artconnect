"use client";

import { useState } from "react";
import Link from "next/link";

const SUBJECTS = [
  "General Enquiry",
  "I want to join as an Artist",
  "I need help finding an Artist",
  "Report a problem",
  "Partnership / Collaboration",
  "Press & Media",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send.");
      setStatus("sent");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans text-black">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>go</span><span className="uppercase">ARTCONNECT</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Browse Artists</Link>
          <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Get in Touch</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-4">Contact<br />Us</h1>
        <p className="text-sm text-black/50 mb-12 uppercase tracking-widest">We usually reply within 1–2 business days.</p>

        {status === "sent" ? (
          <div className="border border-black bg-white p-10 text-center">
            <p className="text-4xl mb-4">✅</p>
            <h2 className="text-xl font-black uppercase mb-2">Message Sent!</h2>
            <p className="text-sm text-black/50 mb-6">Thanks for reaching out. We'll get back to you at <strong>{form.email}</strong> soon.</p>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="border border-black bg-white p-8">
            {error && (
              <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest">Your Name *</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Full name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 bg-transparent"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest">Your Email *</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 bg-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest">Subject *</label>
                <div className="relative">
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-white appearance-none cursor-pointer"
                  >
                    <option value="">Select a subject…</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black text-xs">▼</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest">Message *</label>
                <textarea
                  name="message"
                  rows={6}
                  placeholder="Tell us how we can help…"
                  value={form.message}
                  onChange={handleChange}
                  required
                  className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-black/30 bg-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "sending" ? "Sending…" : "Send Message →"}
              </button>
            </form>
          </div>
        )}

        {/* Info boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-black border border-black mt-10">
          <div className="bg-[#F2EDE4] p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-1">Email</p>
            <p className="text-sm">goartconnect@gmail.com</p>
          </div>
          <div className="bg-[#F2EDE4] p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-1">Response Time</p>
            <p className="text-sm">1–2 business days</p>
          </div>
          <div className="bg-[#F2EDE4] p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-1">Based In</p>
            <p className="text-sm">Florence, Italy 🇮🇹</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>go</span><span className="uppercase">ARTCONNECT</span></span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
          <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
        </div>
      </footer>
    </main>
  );
}












