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

type Package = {
  name: string;
  price: string;
  duration: string;
  description: string;
  includes: string;
};

const DEFAULT_PACKAGES: Package[] = [
  { name: "Essential", price: "", duration: "", description: "", includes: "" },
  { name: "Standard", price: "", duration: "", description: "", includes: "" },
  { name: "Premium",  price: "", duration: "", description: "", includes: "" },
];

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [packages, setPackages] = useState<Package[]>(DEFAULT_PACKAGES);
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
        // Map saved packages back, keeping Essential/Standard/Premium order
        const mapped = DEFAULT_PACKAGES.map(def => {
          const saved = pkgs.find((p: any) => p.name === def.name);
          return saved ? {
            name: saved.name,
            price: saved.price?.toString() || "",
            duration: saved.duration_hours?.toString() || "",
            description: saved.description || "",
            includes: saved.includes || "",
          } : def;
        });
        setPackages(mapped);
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
        .filter(p => p.price !== "")
        .map(p => ({
          artist_id: user.id,
          name: p.name,
          price: parseFloat(p.price),
          duration_hours: p.duration ? parseFloat(p.duration) : null,
          description: p.description || null,
          includes: p.includes || null,
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
            <div className="border-t border-black pt-8 mb-4">
              <h2 className="text-lg font-black uppercase mb-1">Service Packages</h2>
              <p className="text-xs text-black/50 mb-6">Define what you offer at each tier. Leave price empty to hide a package.</p>
            </div>

            <div className="flex flex-col gap-6">
              {packages.map((pkg, i) => (
                <div key={pkg.name} className={`border border-black p-6 ${i === 2 ? "bg-black text-white" : "bg-white"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black uppercase tracking-widest text-sm">{pkg.name}</h3>
                    {i === 2 && <span className="text-xs text-[#E5000F] font-bold uppercase tracking-widest">Most Complete</span>}
                    {i === 1 && <span className="text-xs text-black/40 font-bold uppercase tracking-widest">Popular</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-1 ${i === 2 ? "text-white/60" : "text-black/50"}`}>Price (€)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 150"
                        value={pkg.price}
                        onChange={e => handlePackageChange(i, "price", e.target.value)}
                        className={`w-full border px-3 py-2 text-sm outline-none transition-colors placeholder:text-black/30 ${
                          i === 2
                            ? "border-white/30 bg-white/10 text-white placeholder:text-white/30 focus:border-white"
                            : "border-black bg-[#F2EDE4] focus:border-[#E5000F]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-1 ${i === 2 ? "text-white/60" : "text-black/50"}`}>Duration (hours)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="e.g. 2"
                        value={pkg.duration}
                        onChange={e => handlePackageChange(i, "duration", e.target.value)}
                        className={`w-full border px-3 py-2 text-sm outline-none transition-colors placeholder:text-black/30 ${
                          i === 2
                            ? "border-white/30 bg-white/10 text-white placeholder:text-white/30 focus:border-white"
                            : "border-black bg-[#F2EDE4] focus:border-[#E5000F]"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-1 ${i === 2 ? "text-white/60" : "text-black/50"}`}>Short Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Perfect for individuals and small events"
                      value={pkg.description}
                      onChange={e => handlePackageChange(i, "description", e.target.value)}
                      className={`w-full border px-3 py-2 text-sm outline-none transition-colors ${
                        i === 2
                          ? "border-white/30 bg-white/10 text-white placeholder:text-white/30 focus:border-white"
                          : "border-black bg-[#F2EDE4] focus:border-[#E5000F] placeholder:text-black/30"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-1 ${i === 2 ? "text-white/60" : "text-black/50"}`}>What&apos;s Included</label>
                    <input
                      type="text"
                      placeholder="e.g. 20 edited photos, online gallery, 1 location"
                      value={pkg.includes}
                      onChange={e => handlePackageChange(i, "includes", e.target.value)}
                      className={`w-full border px-3 py-2 text-sm outline-none transition-colors ${
                        i === 2
                          ? "border-white/30 bg-white/10 text-white placeholder:text-white/30 focus:border-white"
                          : "border-black bg-[#F2EDE4] focus:border-[#E5000F] placeholder:text-black/30"
                      }`}
                    />
                  </div>
                </div>
              ))}
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
