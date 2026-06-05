"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire up to auth backend
    alert(`Logged in as: ${form.email}`);
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-6 border-b">
        <Link href="/" className="text-2xl font-bold">LensConnect</Link>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 rounded-xl border">Login</Link>
          <Link href="/signup" className="px-4 py-2 rounded-xl bg-black text-white">Join Now</Link>
        </div>
      </nav>

      {/* FORM */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border rounded-3xl p-10">
          <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Log in to your LensConnect account.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              value={form.password}
              onChange={handleChange}
              className="border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              className="mt-2 py-3 rounded-xl bg-black text-white font-medium text-lg"
            >
              Log in
            </button>
          </form>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-black font-medium underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
