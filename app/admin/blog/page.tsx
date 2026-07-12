"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";
import { POST_CATEGORIES, categoryLabel, slugify } from "@/lib/blog";

const MAX_PHOTOS = 8;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  photos: string[];
  is_published: boolean;
  published_at: string | null;
};

const emptyForm = {
  title: "", category: "feature", excerpt: "", body: "",
  photos: [] as string[], is_published: true,
};

export default function AdminBlogPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const fileRef = useRef<HTMLInputElement>(null);

  const [autoRunning, setAutoRunning] = useState(false);
  const [autoMsg, setAutoMsg] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const { data } = await supabase.from("posts").select("*").order("published_at", { ascending: false });
      setItems((data as Post[]) || []);
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

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (form.photos.length >= MAX_PHOTOS) { setError(`Up to ${MAX_PHOTOS} photos.`); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError("Image is larger than 3 MB."); return; }
    setError(""); setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, photos: [...f.photos, url] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally { setUploading(false); }
  }

  function resetForm() { setForm({ ...emptyForm }); setEditingId(null); }

  function startEdit(p: Post) {
    setEditingId(p.id);
    setForm({
      title: p.title, category: p.category, excerpt: p.excerpt || "", body: p.body || "",
      photos: p.cover_url ? [p.cover_url, ...(p.photos || []).filter(u => u !== p.cover_url)] : (p.photos || []),
      is_published: p.is_published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    const cover = form.photos[0] || null;
    const base = {
      title: form.title.trim(),
      category: form.category,
      excerpt: form.excerpt.trim() || null,
      body: form.body.trim() || null,
      cover_url: cover,
      photos: form.photos,
      is_published: form.is_published,
      author_id: userId,
    };
    try {
      const supabase = getSupabase();
      if (editingId) {
        const { error: dbErr } = await supabase.from("posts").update(base).eq("id", editingId);
        if (dbErr) throw dbErr;
        setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...base } as Post : i));
      } else {
        // Unique slug: fall back to a suffixed variant on collision.
        let slug = slugify(form.title) || "post";
        let attempt = await supabase.from("posts").insert({ ...base, slug, published_at: new Date().toISOString() }).select().single();
        if (attempt.error && attempt.error.code === "23505") {
          slug = `${slug}-${Math.floor(performance.now())}`;
          attempt = await supabase.from("posts").insert({ ...base, slug, published_at: new Date().toISOString() }).select().single();
        }
        if (attempt.error) throw attempt.error;
        setItems(prev => [attempt.data as Post, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const supabase = getSupabase();
    await supabase.from("posts").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingId === id) resetForm();
  }

  async function handleAutoGenerate() {
    setAutoRunning(true); setAutoMsg("");
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cron/generate-blog", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (data.generated) {
        setAutoMsg(`Wrote a roundup for ${data.city} (${data.eventCount} events): "${data.title}"`);
        const { data: fresh } = await supabase.from("posts").select("*").order("published_at", { ascending: false });
        setItems((fresh as Post[]) || []);
      } else if (data.skipped) {
        setAutoMsg(`Nothing written: ${data.skipped}`);
      } else {
        setAutoMsg(data.error || "Could not generate a post.");
      }
    } catch {
      setAutoMsg("Generation failed. Please try again.");
    } finally { setAutoRunning(false); }
  }

  const inputClass = "border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 w-full";

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <div className="flex items-baseline justify-between mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Admin · Blog</p>
          <h1 className="text-5xl font-black uppercase leading-none">Blog</h1>
        </div>
        <Link href="/blog" className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors">View public →</Link>
      </div>

      {error && <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>}

      {/* Auto-writer */}
      <div className="border border-black bg-black text-white p-8 mb-8">
        <h2 className="text-lg font-black uppercase mb-2">AI Auto-Writer</h2>
        <p className="text-xs text-white/50 mb-5 max-w-lg">Writes a verified roundup of upcoming events from your real event data — nothing invented. Runs automatically a few times a week; use the button to generate one now.</p>
        <button onClick={handleAutoGenerate} disabled={autoRunning} className="px-6 py-3 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50">
          {autoRunning ? "Writing..." : "Generate a post now"}
        </button>
        {autoMsg && <p className="text-xs text-white/70 mt-4 uppercase tracking-widest">{autoMsg}</p>}
      </div>

      <div className="border border-black bg-white p-8 mb-12">
        <h2 className="text-lg font-black uppercase mb-6">{editingId ? "Edit Post" : "Write Post"}</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <input placeholder="Post title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass + " cursor-pointer"}>
              {POST_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className="flex items-center gap-3 cursor-pointer px-1">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="w-4 h-4 accent-[#E5000F]" />
              <span className="text-xs font-bold uppercase tracking-widest">{form.is_published ? "Published" : "Draft"}</span>
            </label>
          </div>
          <input placeholder="Short excerpt (shown on cards)" value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} className={inputClass} />
          <textarea placeholder="Write your post..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={8} className={inputClass} />

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Photos ({form.photos.length}/{MAX_PHOTOS}) — first is the cover</label>
            <div className="flex flex-wrap gap-3 mb-2">
              {form.photos.map((url, i) => (
                <div key={url} className="relative w-24 h-24 border border-black/10">
                  <img src={cdnUrl(url, "w_200,c_fill,q_auto,f_auto")} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] font-bold uppercase text-center">Cover</span>}
                  <button type="button" onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))} className="absolute -top-2 -right-2 bg-[#E5000F] text-white w-5 h-5 text-xs font-bold leading-none">×</button>
                </div>
              ))}
              {form.photos.length < MAX_PHOTOS && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-24 h-24 border border-dashed border-black flex items-center justify-center text-xs font-bold uppercase hover:border-[#E5000F] transition-colors disabled:opacity-50">
                  {uploading ? "..." : "+ Add"}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save Changes" : "+ Publish Post"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="px-6 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">Cancel</button>}
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40 py-8">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-black/40 text-center py-12">No posts yet. Write your first above.</p>
      ) : (
        <div className="flex flex-col gap-px bg-black border border-black">
          {items.map(p => (
            <div key={p.id} className="bg-[#F2EDE4] p-5 flex items-center gap-4">
              <div className="w-16 h-16 shrink-0 bg-black/5 overflow-hidden border border-black/10">
                {p.cover_url ? <img src={cdnUrl(p.cover_url, "w_200,c_fill,q_auto,f_auto")} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-black to-[#E5000F]/40" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black uppercase text-sm truncate">{p.title}</h3>
                <p className="text-xs text-black/50">{categoryLabel(p.category)}{!p.is_published && " · Draft"}</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => startEdit(p)} className="text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors">Edit</button>
                <button onClick={() => handleDelete(p.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
