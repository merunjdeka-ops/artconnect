"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

const MAX_PHOTOS = 6;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  venue: string | null;
  event_date: string | null;
  photos: string[];
  source: string;
  source_name: string | null;
  external_url: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  city: "",
  venue: "",
  event_date: "",
  photos: [] as string[],
  isExternal: false,
  source_name: "",
  external_url: "",
};

export default function EventsDashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
      if (profile?.role !== "artist") { router.push("/dashboard"); return; }
      setUserName(profile.full_name || "");
      setUserId(user.id);
      const { data: events } = await supabase
        .from("events").select("*").eq("created_by", user.id).order("event_date", { ascending: true, nullsFirst: false });
      setItems((events as EventItem[]) || []);
      setLoading(false);
    }
    load();
  }, [router]);

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
    if (form.photos.length >= MAX_PHOTOS) { setError(`Up to ${MAX_PHOTOS} photos per event.`); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError("Image is larger than 3 MB. Please choose a smaller file."); return; }
    setError("");
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, photos: [...f.photos, url] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function resetForm() { setForm({ ...emptyForm }); setEditingId(null); }

  function startEdit(ev: EventItem) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description || "",
      city: ev.city || "",
      venue: ev.venue || "",
      event_date: ev.event_date ? ev.event_date.slice(0, 16) : "",
      photos: ev.photos || [],
      isExternal: ev.source === "external",
      source_name: ev.source_name || "",
      external_url: ev.external_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (form.isExternal && !form.external_url.trim()) { setError("External events need a link."); return; }
    setSaving(true);
    setError("");
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      city: form.city.trim() || null,
      venue: form.venue.trim() || null,
      event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
      photos: form.photos,
      source: form.isExternal ? "external" : "local",
      source_name: form.isExternal ? (form.source_name.trim() || "External") : null,
      external_url: form.isExternal ? form.external_url.trim() : null,
      artist_id: userId,
      created_by: userId,
    };
    try {
      const supabase = getSupabase();
      if (editingId) {
        const { error: dbErr } = await supabase.from("events").update(payload).eq("id", editingId);
        if (dbErr) throw dbErr;
        setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...payload } as EventItem : i));
      } else {
        const { data, error: dbErr } = await supabase.from("events").insert(payload).select().single();
        if (dbErr) throw dbErr;
        setItems(prev => [...prev, data as EventItem]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = getSupabase();
    await supabase.from("events").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingId === id) resetForm();
  }

  const inputClass = "border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 w-full";

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
        <h1 className="text-5xl font-black uppercase leading-none mb-3">My<br />Events</h1>
        <p className="text-sm text-black/50 mb-10 max-w-lg">Post your upcoming performances and shows. They appear in the events feed on the home page so people can discover them.</p>

        {error && (
          <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>
        )}

        {/* FORM */}
        <div className="border border-black bg-white p-8 mb-12">
          <h2 className="text-lg font-black uppercase mb-6">{editingId ? "Edit Event" : "Add Event"}</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <input placeholder="Event title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} required />
            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputClass} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="City (e.g. Milan)" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} />
              <input placeholder="Venue / address (optional)" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Date &amp; time</label>
              <input type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className={inputClass} />
            </div>

            {/* Photos */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Photos ({form.photos.length}/{MAX_PHOTOS})</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {form.photos.map((url, i) => (
                  <div key={url} className="relative w-24 h-24 border border-black/10">
                    <img src={cdnUrl(url, "w_200,c_fill,q_auto,f_auto")} alt="" className="w-full h-full object-cover" />
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
              <p className="text-xs text-black/40">JPG, PNG, WEBP — max 3MB each. First photo is the cover.</p>
            </div>

            {/* External toggle */}
            <label className="flex items-center gap-3 cursor-pointer mt-2">
              <input type="checkbox" checked={form.isExternal} onChange={e => setForm(f => ({ ...f, isExternal: e.target.checked }))} className="w-4 h-4 accent-[#E5000F]" />
              <span className="text-xs font-bold uppercase tracking-widest">This event is hosted on another site (Eventbrite, Instagram, venue page…)</span>
            </label>
            {form.isExternal && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                <input placeholder="Source name (e.g. Eventbrite)" value={form.source_name} onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))} className={inputClass} />
                <input placeholder="Link to event / tickets *" type="url" value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} className={inputClass} />
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Save Changes" : "+ Publish Event"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-6 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* LIST */}
        {items.length === 0 ? (
          <p className="text-sm text-black/40 text-center py-12">No events yet. Add your first performance above.</p>
        ) : (
          <div className="flex flex-col gap-px bg-black border border-black">
            {items.map(ev => (
              <div key={ev.id} className="bg-[#F2EDE4] p-5 flex items-center gap-4">
                <div className="w-16 h-16 shrink-0 bg-black/5 overflow-hidden border border-black/10">
                  {ev.photos?.[0]
                    ? <img src={cdnUrl(ev.photos[0], "w_200,c_fill,q_auto,f_auto")} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-black to-[#E5000F]/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black uppercase text-sm truncate">{ev.title}</h3>
                  <p className="text-xs text-black/50 truncate">
                    {[ev.event_date ? new Date(ev.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null, ev.venue, ev.city].filter(Boolean).join(" · ")}
                  </p>
                  {ev.source === "external" && <span className="text-[10px] font-bold uppercase tracking-widest text-[#E5000F]">External · {ev.source_name}</span>}
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => startEdit(ev)} className="text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors">Edit</button>
                  <button onClick={() => handleDelete(ev.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/dashboard" className="block text-center text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors mt-12">← Back to Dashboard</Link>
      </div>
    </main>
  );
}
