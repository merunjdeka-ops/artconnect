"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

const SLOTS = [
  { value: "home", label: "Homepage (after Latest Work)" },
  { value: "artists", label: "Artists listing (below results)" },
  { value: "blog", label: "Blog posts (after article)" },
];

type Ad = {
  id: string;
  slot: string;
  title: string | null;
  image_url: string;
  link_url: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const EMPTY_FORM = { slot: "home", title: "", image_url: "", link_url: "", starts_at: "", ends_at: "" };

export default function AdminAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds((data as Ad[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createAd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url.trim() || !form.link_url.trim()) {
      setMessage("Image URL and link URL are required.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const supabase = getSupabase();
    const { error } = await supabase.from("ads").insert({
      slot: form.slot,
      title: form.title.trim() || null,
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim(),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      setMessage(`Could not save: ${error.message}`);
      return;
    }
    setForm(EMPTY_FORM);
    setMessage("Ad created.");
    load();
  }

  async function toggleActive(ad: Ad) {
    const supabase = getSupabase();
    const { error } = await supabase.from("ads").update({ active: !ad.active }).eq("id", ad.id);
    if (error) { setMessage(`Could not update: ${error.message}`); return; }
    load();
  }

  async function remove(ad: Ad) {
    if (!confirm(`Delete the ad "${ad.title || ad.link_url}"?`)) return;
    const supabase = getSupabase();
    const { error } = await supabase.from("ads").delete().eq("id", ad.id);
    if (error) { setMessage(`Could not delete: ${error.message}`); return; }
    load();
  }

  function slotLabel(v: string) {
    return SLOTS.find(s => s.value === v)?.label || v;
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Admin</p>
      <h1 className="text-5xl font-black uppercase leading-none mb-4">Sponsor<br />Ads</h1>
      <p className="text-sm text-black/60 max-w-xl leading-relaxed mb-12">
        Banners you sell directly to sponsors. Each slot shows an active sponsor banner first;
        with no sponsor it falls back to Google AdSense (once configured), then to house promos.
      </p>

      {/* New ad form */}
      <form onSubmit={createAd} className="border border-black bg-white p-8 mb-12">
        <h2 className="text-lg font-black uppercase mb-6">New Sponsor Ad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Slot</span>
            <select
              value={form.slot}
              onChange={e => setForm(f => ({ ...f, slot: e.target.value }))}
              className="mt-1.5 w-full border border-black bg-white px-3 py-2.5 text-sm"
            >
              {SLOTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Sponsor / title (internal)</span>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Studio Rossi — spring campaign"
              className="mt-1.5 w-full border border-black bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Banner image URL *</span>
            <input
              type="url"
              value={form.image_url}
              onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
              placeholder="https://... (wide banner works best, e.g. 1200×160)"
              className="mt-1.5 w-full border border-black bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Click-through link *</span>
            <input
              type="url"
              value={form.link_url}
              onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
              placeholder="https://sponsor-website.com"
              className="mt-1.5 w-full border border-black bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Starts (optional)</span>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
              className="mt-1.5 w-full border border-black bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-black/50">Ends (optional)</span>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
              className="mt-1.5 w-full border border-black bg-white px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        {form.image_url.trim() && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-black/50 mb-2">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.image_url} alt="Banner preview" className="max-h-40 border border-black" />
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="mt-8 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-40"
        >
          {saving ? "Saving..." : "+ Create Ad"}
        </button>
        {message && <p className="mt-4 text-sm font-medium text-[#E5000F]">{message}</p>}
      </form>

      {/* Existing ads */}
      <h2 className="text-lg font-black uppercase mb-6">All Ads ({ads.length})</h2>
      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
      ) : ads.length === 0 ? (
        <p className="text-sm text-black/50">No sponsor ads yet. Slots are showing house promos{""} until you add one.</p>
      ) : (
        <div className="space-y-px bg-black border border-black">
          {ads.map(ad => (
            <div key={ad.id} className="bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cdnUrl(ad.image_url, "w_300,c_limit,q_auto,f_auto")} alt="" className="w-32 h-16 object-contain border border-black/20 bg-[#F2EDE4] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black uppercase truncate">{ad.title || "Untitled"}</p>
                <p className="text-xs text-black/50 mt-0.5">{slotLabel(ad.slot)}</p>
                <p className="text-xs text-black/40 truncate mt-0.5">{ad.link_url}</p>
                {(ad.starts_at || ad.ends_at) && (
                  <p className="text-[10px] uppercase tracking-widest text-black/40 mt-1">
                    {ad.starts_at ? new Date(ad.starts_at).toLocaleDateString("en-GB") : "now"} → {ad.ends_at ? new Date(ad.ends_at).toLocaleDateString("en-GB") : "no end"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => toggleActive(ad)}
                  className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-colors ${ad.active ? "bg-black text-white border-black hover:bg-[#E5000F] hover:border-[#E5000F]" : "border-black/30 text-black/40 hover:border-black hover:text-black"}`}
                >
                  {ad.active ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => remove(ad)}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-black/30 text-black/40 hover:border-[#E5000F] hover:text-[#E5000F] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
