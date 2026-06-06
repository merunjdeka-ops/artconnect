"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import { getSupabase } from "@/lib/supabase";

const CATEGORIES = [
  "Photography", "Music", "Makeup Artist", "Painting", "Illustration",
  "Videography", "DJ", "Dance", "Hair Styling", "Graphic Design",
  "Pottery & Ceramics", "Sculpture", "Calligraphy", "Fashion Design",
  "Tattoo Artist", "Comedy & Stand-Up", "Poetry & Spoken Word",
  "Acting & Theatre", "Jewelry Making", "Interior Design",
];

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [form, setForm] = useState({
    bio: "",
    category: "",
    location: "",
    hourly_rate: "",
    session_rate: "",
    instagram: "",
    website: "",
    is_available: true,
  });

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "artist") { router.push("/dashboard"); return; }

      setUserName(profile.full_name || "");
      setForm({
        bio: profile.bio || "",
        category: profile.category || "",
        location: profile.location || "",
        hourly_rate: profile.hourly_rate?.toString() || "",
        session_rate: profile.session_rate?.toString() || "",
        instagram: profile.instagram || "",
        website: profile.website || "",
        is_available: profile.is_available ?? true,
      });
      setLoading(false);
    }
    load();
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          bio: form.bio,
          category: form.category,
          location: form.location,
          hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
          session_rate: form.session_rate ? parseFloat(form.session_rate) : null,
          instagram: form.instagram,
          website: form.website,
          is_available: form.is_available,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans">
      <NavbarAuth userName={userName} />

      <div className="max-w-2xl mx-auto px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Artist Setup</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-10">Your<br />Profile</h1>

        {error && (
          <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 px-4 py-3 border border-green-600 text-green-700 text-xs uppercase tracking-widest">
            Profile saved! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Your Category *</label>
            <select
              name="category"
              required
              value={form.category}
              onChange={handleChange}
              className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors"
            >
              <option value="">Select your discipline</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Bio *</label>
            <textarea
              name="bio"
              required
              rows={5}
              placeholder="Tell clients about yourself, your style, your experience..."
              value={form.bio}
              onChange={handleChange}
              className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-black/30"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Location *</label>
            <input
              name="location"
              type="text"
              required
              placeholder="City, Country (e.g. Milan, Italy)"
              value={form.location}
              onChange={handleChange}
              className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
          </div>

          {/* Rates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2">Hourly Rate (€)</label>
              <input
                name="hourly_rate"
                type="number"
                min="0"
                placeholder="e.g. 80"
                value={form.hourly_rate}
                onChange={handleChange}
                className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2">Session Rate (€)</label>
              <input
                name="session_rate"
                type="number"
                min="0"
                placeholder="e.g. 300"
                value={form.session_rate}
                onChange={handleChange}
                className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
              />
            </div>
          </div>

          {/* Social links */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Instagram Handle</label>
            <input
              name="instagram"
              type="text"
              placeholder="@yourhandle"
              value={form.instagram}
              onChange={handleChange}
              className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Website</label>
            <input
              name="website"
              type="url"
              placeholder="https://yourwebsite.com"
              value={form.website}
              onChange={handleChange}
              className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
          </div>

          {/* Availability toggle */}
          <div className="flex items-center gap-4 border border-black p-4">
            <input
              type="checkbox"
              name="is_available"
              id="is_available"
              checked={form.is_available}
              onChange={handleChange}
              className="w-4 h-4 accent-black"
            />
            <label htmlFor="is_available" className="text-sm font-bold uppercase tracking-widest cursor-pointer">
              I am currently available for bookings
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          <Link href="/dashboard" className="text-center text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors">
            ← Back to Dashboard
          </Link>
        </form>
      </div>
    </main>
  );
}
