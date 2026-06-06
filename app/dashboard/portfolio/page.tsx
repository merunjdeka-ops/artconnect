"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import { getSupabase } from "@/lib/supabase";

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: string;
};

export default function PortfolioPage() {
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", media_url: "", media_type: "image" });

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
      if (profile?.role !== "artist") { router.push("/dashboard"); return; }

      setUserName(profile.full_name || "");
      setUserId(user.id);

      const { data: portfolioItems } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      setItems(portfolioItems || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.media_url || !form.title) return;
    setSaving(true);
    setError("");

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("portfolio_items")
        .insert({ ...form, artist_id: userId })
        .select()
        .single();

      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setForm({ title: "", description: "", media_url: "", media_type: "image" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = getSupabase();
    await supabase.from("portfolio_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  if (loading) return (
    <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
      <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans">
      <NavbarAuth userName={userName} />

      <div className="max-w-4xl mx-auto px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Artist Dashboard</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-10">My<br />Portfolio</h1>

        {/* Add item form */}
        <div className="border border-black bg-white p-8 mb-12">
          <h2 className="text-lg font-black uppercase mb-6">Add Work</h2>

          {error && (
            <div className="mb-4 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>
          )}

          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Title *"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
                className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
              />
              <select
                value={form.media_type}
                onChange={e => setForm(p => ({ ...p, media_type: e.target.value }))}
                className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-white"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <input
              placeholder="URL to your work (image/video/audio link) *"
              value={form.media_url}
              onChange={e => setForm(p => ({ ...p, media_url: e.target.value }))}
              required
              type="url"
              className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
            <input
              placeholder="Short description (optional)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
            />
            <button
              type="submit"
              disabled={saving}
              className="py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
            >
              {saving ? "Adding..." : "+ Add to Portfolio"}
            </button>
          </form>
        </div>

        {/* Portfolio grid */}
        {items.length === 0 ? (
          <p className="text-sm text-black/40 text-center py-12">No portfolio items yet. Add your first piece above.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black border border-black">
            {items.map(item => (
              <div key={item.id} className="bg-[#F2EDE4] p-6 group relative">
                {item.media_type === "image" && (
                  <img src={item.media_url} alt={item.title} className="w-full h-48 object-cover mb-4 border border-black/10" />
                )}
                {item.media_type === "video" && (
                  <video src={item.media_url} controls className="w-full h-48 object-cover mb-4" />
                )}
                {item.media_type === "audio" && (
                  <div className="w-full h-16 flex items-center bg-black mb-4 px-4">
                    <audio src={item.media_url} controls className="w-full" />
                  </div>
                )}
                <h3 className="font-black uppercase text-sm">{item.title}</h3>
                {item.description && <p className="text-xs text-black/50 mt-1">{item.description}</p>}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="mt-3 text-xs text-[#E5000F] uppercase tracking-widest hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <Link href="/dashboard" className="block text-center text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors mt-10">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
