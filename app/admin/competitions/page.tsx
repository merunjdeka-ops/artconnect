"use client";

import { useEffect, useState, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const CATEGORIES = ["Photography", "Poster", "Art", "Design", "Architecture", "Short Film", "Movie", "Music", "Other"];

type Competition = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  organizer: string | null;
  external_url: string | null;
  deadline: string | null;
  prize: string | null;
  entry_fee: string | null;
  cover_url: string | null;
  is_published: boolean;
};

function isClosed(deadline: string | null): boolean {
  return !!deadline && new Date(deadline).getTime() < Date.now();
}

const emptyForm = {
  title: "", description: "", category: CATEGORIES[0], organizer: "", external_url: "",
  deadline: "", prize: "", entry_fee: "", cover_url: "", is_published: true,
};

export default function AdminCompetitionsPage() {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const supabase = getSupabase();
    const { data } = await supabase.from("competitions").select("*").order("deadline", { ascending: true, nullsFirst: false });
    setItems((data as Competition[]) || []);
  }

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      await reload();
      setLoading(false);
    }
    load();
  }, []);

  async function uploadToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("Cloudinary is not configured.");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Image upload failed.");
    return data.secure_url as string;
  }

  async function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) { setError("Image is larger than 3 MB."); return; }
    setError(""); setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, cover_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally { setUploading(false); }
  }

  function resetForm() { setForm({ ...emptyForm }); setEditingId(null); }

  function startEdit(c: Competition) {
    setEditingId(c.id);
    setForm({
      title: c.title, description: c.description || "", category: c.category,
      organizer: c.organizer || "", external_url: c.external_url || "",
      deadline: c.deadline ? c.deadline.slice(0, 16) : "", prize: c.prize || "",
      entry_fee: c.entry_fee || "", cover_url: c.cover_url || "", is_published: c.is_published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      organizer: form.organizer.trim() || null,
      external_url: form.external_url.trim() || null,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      prize: form.prize.trim() || null,
      entry_fee: form.entry_fee.trim() || null,
      cover_url: form.cover_url || null,
      is_published: form.is_published,
      created_by: userId,
    };
    try {
      const supabase = getSupabase();
      if (editingId) {
        const { error: dbErr } = await supabase.from("competitions").update(payload).eq("id", editingId);
        if (dbErr) throw dbErr;
      } else {
        const { error: dbErr } = await supabase.from("competitions").insert(payload);
        if (dbErr) throw dbErr;
      }
      await reload();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save competition.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const supabase = getSupabase();
    await supabase.from("competitions").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingId === id) resetForm();
  }

  const inputClass = "border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 w-full";

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Admin · Competitions</p>
      <h1 className="text-5xl font-black uppercase leading-none mb-10">Competitions</h1>

      {error && <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>}

      <div className="border border-black bg-white p-8 mb-12">
        <h2 className="text-lg font-black uppercase mb-6">{editingId ? "Edit Competition" : "Add Competition"}</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <input placeholder="Competition title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} required />
          <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputClass} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Deadline</label>
              <input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Organizer (e.g. World Photography Org)" value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} className={inputClass} />
            <input placeholder="Link to enter (https://...)" type="url" value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Prize (e.g. €5,000 + exhibition)" value={form.prize} onChange={e => setForm(f => ({ ...f, prize: e.target.value }))} className={inputClass} />
            <input placeholder="Entry fee (e.g. Free / €25)" value={form.entry_fee} onChange={e => setForm(f => ({ ...f, entry_fee: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Cover image</label>
            <div className="flex items-center gap-3">
              {form.cover_url ? (
                <div className="relative w-24 h-24 border border-black/10">
                  <img src={cdnUrl(form.cover_url, "w_200,c_fill,q_auto,f_auto")} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, cover_url: "" }))} className="absolute -top-2 -right-2 bg-[#E5000F] text-white w-5 h-5 text-xs font-bold leading-none">×</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-24 h-24 border border-dashed border-black flex items-center justify-center text-xs font-bold uppercase hover:border-[#E5000F] transition-colors disabled:opacity-50">
                  {uploading ? "..." : "+ Add"}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPick} />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="w-4 h-4 accent-[#E5000F]" />
            <span className="text-xs font-bold uppercase tracking-widest">Published</span>
          </label>
          <div className="flex gap-3 mt-2">
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save Changes" : "+ Add Competition"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="px-6 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">Cancel</button>}
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40 py-8">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-black/40 text-center py-12">No competitions yet.</p>
      ) : (
        <div className="flex flex-col gap-px bg-black border border-black">
          {items.map(c => {
            const closed = isClosed(c.deadline);
            return (
              <div key={c.id} className="bg-[#F2EDE4] p-5 flex items-center gap-4">
                <div className="w-16 h-16 shrink-0 bg-black/5 overflow-hidden border border-black/10">
                  {c.cover_url ? <img src={cdnUrl(c.cover_url, "w_200,c_fill,q_auto,f_auto")} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-black to-[#E5000F]/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black uppercase text-sm truncate">{c.title}</h3>
                  <p className="text-xs text-black/50 truncate">
                    {[c.category, c.organizer, c.deadline ? `Deadline ${new Date(c.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Open-ended"].filter(Boolean).join(" · ")}
                  </p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${closed ? "text-black/40" : c.is_published ? "text-[#E5000F]" : "text-black/40"}`}>
                    {closed ? "Closed" : c.is_published ? "Live" : "Draft"}
                  </span>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => startEdit(c)} className="text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
