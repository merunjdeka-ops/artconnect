"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [role, setRole] = useState<"client" | "photographer">("client");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire up to auth backend
    alert(`Signed up as ${role}: ${form.email}`);
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-6 border-b">
        <Link href="/" className="text-2xl font-bold">ArtConnect</Link>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 rounded-xl border">Login</Link>
          <Link href="/signup" className="px-4 py-2 rounded-xl bg-black text-white">Join Now</Link>
        </div>
      </nav>

      {/* FORM */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border rounded-3xl p-10">
          <h2 className="text-3xl font-bold mb-2">Create your account</h2>
          <p className="text-gray-500 mb-8">Join ArtConnect and connect with top photographers.</p>

          {/* Role toggle */}
          <div className="flex rounded-xl overflow-hidden border mb-8">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                role === "client" ? "bg-black text-white" : "text-gray-600"
              }`}
            >
              I need a photographer
            </button>
            <button
              type="button"
              onClick={() => setRole("photographer")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                role === "photographer" ? "bg-black text-white" : "text-gray-600"
              }`}
            >
              I am a photographer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              name="name"
              type="text"
              placeholder="Full name"
              required
              value={form.name}
              onChange={handleChange}
              className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            />
            <input
              name="email"
              type="email"
              placeholder="Email address"
              required
              value={form.email}
              onChange={handleChange}
              className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              className="mt-2 py-3 rounded-xl bg-black text-white font-medium text-lg"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-black font-medium underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
