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

const PRICING_TYPES = [
  { value: "hourly",   label: "Per Hour" },
  { value: "session",  label: "Per Session" },
  { value: "half_day", label: "Half Day" },
  { value: "full_day", label: "Full Day" },
  { value: "event",    label: "Per Event" },
  { value: "fixed",    label: "Fixed Price" },
];

const TIER_PRESETS = [
  ["Essential", "Standard", "Premium"],
  ["Bronze", "Silver", "Gold"],
  ["Bronze", "Silver", "Gold", "Platinum"],
  ["Basic", "Pro", "Elite"],
];

type Package = {
  name: string;
  pricing_type: string;
  price: string;
  duration: string;
  description: string;
  includes: string;
};

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [packages, setPackages] = useState<Package[]>([]);
  const [form, setForm] = useState({
    bio: "",
    category: "",
    location: "",
    hourly_rate: "",
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
      setUserId(user.id);
      setForm({
        bio: profile.bio || "",
        category: profile.category || "",
        location: profile.location || "",
        hourly_rate: profile.hourly_rate?.toString() || "",
        instagram: profile.instagram || "",
        website: profile.website || "",
        is_available: profile.is_available ?? true,
      });

      // Load existing packages
      const { data: pkgs } = await supabase
        .from("packages")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: true });

      if (pkgs && pkgs.length > 0) {
        setPackages(pkgs.map((p: any) => ({
          name: p.name,
          pricing_type: p.pricing_type || "session",
          price: p.price?.toString() || "",
          duration: p.duration_hours?.toString() || "",
          description: p.description || "",
          includes: p.includes || "",
        })));
      }

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

  function handlePackageChange(index: number, field: keyof Package, value: string) {
    setPackages(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          bio: form.bio,
          category: form.category,
          location: form.location,
          hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
          instagram: form.instagram,
          website: form.website,
          is_available: form.is_available,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Save packages — delete existing and re-insert
      await supabase.from("packages").delete().eq("artist_id", user.id);

      const pkgsToInsert = packages
        .filter(p => p.price !== "" && p.name !== "")
        .map((p, i) => ({
          artist_id: user.id,
          name: p.name,
          pricing_type: p.pricing_type || "session",
          price: parseFloat(p.price),
          duration_hours: p.duration ? parseFloat(p.duration) : null,
          description: p.description || null,
          includes: p.includes || null,
          sort_order: i,
        }));

      if (pkgsToInsert.length > 0) {
        const { error: pkgError } = await supabase.from("packages").insert(pkgsToInsert);
        if (pkgError) throw pkgError;
      }

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
    <main className="min-h-screen bg-[#F2EDE4] font-sans text-black">
      <NavbarAuth userName={userName} />

      <div className="max-w-2xl mx-auto px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3 fade-in-up">Artist Setup</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-10 fade-in-up fade-in-up-1">Your<br />Profile</h1>

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
          <div className="fade-in-up fade-in-up-2">
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
          <div className="fade-in-up fade-in-up-2">
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
          <div className="fade-in-up fade-in-up-3">
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

          {/* Hourly rate */}
          <div className="fade-in-up fade-in-up-3">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Hourly Rate (€) — optional</label>
            <input
              name="hourly_rate"
              type="number"
              min="0"
              placeholder="e.g. 80"
              value={form.hourly_rate}
              onChange={handleChange}
              className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
            <p className="text-xs text-black/40 mt-1">Set this if you charge per hour in addition to packages.</p>
          </div>

          {/* PACKAGES */}
          <div className="fade-in-up fade-in-up-4">
            <div className="border-t border-black pt-8 mb-6">
              <h2 className="text-lg font-black uppercase mb-1">Service Packages</h2>
              <p className="text-xs text-black/50 mb-5">Add the packages you offer. Name them anything — Essential/Standard/Premium, Bronze/Gold/Platinum, or fully custom.</p>

              {/* Quick preset buttons */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Quick add tiers:</p>
                <div className="flex flex-wrap gap-2">
                  {TIER_PRESETS.map(preset => (
                    <button
                      key={preset.join("/")}
                      type="button"
                      onClick={() => setPackages(preset.map(name => ({ name, pricing_type: "session", price: "", duration: "", description: "", includes: "" })))}
                      className="text-xs border border-black px-3 py-1.5 font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                    >
                      {preset.join(" / ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {packages.map((pkg, i) => (
                <div key={i} className="border border-black bg-white p-6">
                  {/* Package header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-black text-white text-xs flex items-center justify-center font-black shrink-0">{i + 1}</span>
                      <input
                        type="text"
                        placeholder="Package name"
                        value={pkg.name}
                        onChange={e => handlePackageChange(i, "name", e.target.value)}
                        className="border-b-2 border-black bg-transparent text-sm font-black uppercase outline-none focus:border-[#E5000F] transition-colors px-1 py-0.5 w-44 placeholder:text-black/30 placeholder:font-normal placeholder:normal-case"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPackages(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-xs text-[#E5000F] font-bold uppercase tracking-widest hover:text-black transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-black/50">Pricing Type</label>
                      <select
                        value={pkg.pricing_type}
                        onChange={e => handlePackageChange(i, "pricing_type", e.target.value)}
                        className="w-full border border-black px-3 py-2 text-sm bg-[#F2EDE4] outline-none focus:border-[#E5000F] transition-colors"
                      >
                        {PRICING_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-black/50">Price (€)</label>
                      <input
                        type="number" min="0"
                        placeholder="e.g. 250"
                        value={pkg.price}
                        onChange={e => handlePackageChange(i, "price", e.target.value)}
                        className="w-full border border-black px-3 py-2 text-sm bg-[#F2EDE4] outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-black/50">
                      {pkg.pricing_type === "hourly" ? "Min. Hours" : "Duration (hours)"}
                    </label>
                    <input
                      type="number" min="0" step="0.5"
                      placeholder={pkg.pricing_type === "half_day" ? "4" : pkg.pricing_type === "full_day" ? "8" : "e.g. 2"}
                      value={pkg.duration}
                      onChange={e => handlePackageChange(i, "duration", e.target.value)}
                      className="w-full border border-black px-3 py-2 text-sm bg-[#F2EDE4] outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-black/50">Short Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Perfect for couples and small events"
                      value={pkg.description}
                      onChange={e => handlePackageChange(i, "description", e.target.value)}
                      className="w-full border border-black px-3 py-2 text-sm bg-[#F2EDE4] outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-black/50">What&apos;s Included</label>
                    <textarea
                      rows={4}
                      placeholder={"One item per line:\n50 edited photos\nOnline gallery\n2 locations\nPrinted album"}
                      value={pkg.includes}
                      onChange={e => handlePackageChange(i, "includes", e.target.value)}
                      className="w-full border border-black px-3 py-2 text-sm bg-[#F2EDE4] outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-black/30"
                    />
                    <p className="text-xs text-black/30 mt-1">One item per line — shown as ✓ bullet points on your profile.</p>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setPackages(prev => [...prev, { name: "", pricing_type: "session", price: "", duration: "", description: "", includes: "" }])}
                className="border border-dashed border-black py-4 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors w-full"
              >
                + Add Package
              </button>
            </div>
          </div>

          {/* Social links */}
          <div className="fade-in-up fade-in-up-4">
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

          {/* Availability */}
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
