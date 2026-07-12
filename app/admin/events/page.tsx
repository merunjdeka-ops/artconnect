"use client";

import { useEffect, useState, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

const MAX_PHOTOS = 6;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

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
  title: "", description: "", city: "", venue: "", event_date: "",
  photos: [] as string[], isExternal: false, source_name: "", external_url: "",
};

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const fileRef = useRef<HTMLInputElement>(null);

  // Ticketmaster import
  const [importCity, setImportCity] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  async function reload() {
    const supabase = getSupabase();
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true, nullsFirst: false });
    setItems((data as EventItem[]) || []);
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

  function startEdit(ev: EventItem) {
    setEditingId(ev.id);
    setForm({
      title: ev.title, description: ev.description || "", city: ev.city || "", venue: ev.venue || "",
      event_date: ev.event_date ? ev.event_date.slice(0, 16) : "", photos: ev.photos || [],
      isExternal: ev.source !== "local", source_name: ev.source_name || "", external_url: ev.external_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (form.isExternal && !form.external_url.trim()) { setError("External events need a link."); return; }
    setSaving(true); setError("");
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
      created_by: userId,
    };
    try {
      const supabase = getSupabase();
      if (editingId) {
        const { error: dbErr } = await supabase.from("events").update(payload).eq("id", editingId);
        if (dbErr) throw dbErr;
      } else {
        const { error: dbErr } = await supabase.from("events").insert({ ...payload, artist_id: null });
        if (dbErr) throw dbErr;
      }
      await reload();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const supabase = getSupabase();
    await supabase.from("events").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingId === id) resetForm();
  }

  async function handleImport() {
    if (!importCity.trim()) { setImportMsg("Enter a city to import."); return; }
    setImporting(true); setImportMsg("");
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/import-events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ city: importCity.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setImportMsg(data?.error || "Import failed."); return; }
      setImportMsg(`Imported ${data.imported} new event${data.imported === 1 ? "" : "s"} for ${importCity.trim()} (${data.skipped} already existed).`);
      await reload();
    } catch {
      setImportMsg("Import failed. Please try again.");
    } finally { setImporting(false); }
  }

  const inputClass = "border border-black px-4 py-3 bg-transparent text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30 w-full";

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Admin · Events</p>
      <h1 className="text-5xl font-black uppercase leading-none mb-10">Events</h1>

      {error && <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>}

      {/* Ticketmaster import */}
      <div className="border border-black bg-black text-white p-8 mb-8">
        <h2 className="text-lg font-black uppercase mb-2">Auto-import from Ticketmaster</h2>
        <p className="text-xs text-white/50 mb-5 max-w-lg">Pull upcoming concerts and shows for a city from the Ticketmaster Discovery API. Duplicates are skipped automatically.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input placeholder="City (e.g. Milan)" value={importCity} onChange={e => setImportCity(e.target.value)} className="flex-1 border border-white/30 bg-transparent px-4 py-3 text-sm text-white outline-none focus:border-[#E5000F] transition-colors placeholder:text-white/30" />
          <button onClick={handleImport} disabled={importing} className="px-6 py-3 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50 whitespace-nowrap">
            {importing ? "Importing..." : "Import Events"}
          </button>
        </div>
        {importMsg && <p className="text-xs text-white/70 mt-4 uppercase tracking-widest">{importMsg}</p>}
      </div>

      {/* Manual form */}
      <div className="border border-black bg-white p-8 mb-12">
        <h2 className="text-lg font-black uppercase mb-6">{editingId ? "Edit Event" : "Add Event Manually"}</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <input placeholder="Event title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} required />
          <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputClass} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} />
            <input placeholder="Venue / address" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Date &amp; time</label>
            <input type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Photos ({form.photos.length}/{MAX_PHOTOS})</label>
            <div className="flex flex-wrap gap-3 mb-2">
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
          </div>
          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input type="checkbox" checked={form.isExternal} onChange={e => setForm(f => ({ ...f, isExternal: e.target.checked }))} className="w-4 h-4 accent-[#E5000F]" />
            <span className="text-xs font-bold uppercase tracking-widest">Hosted on another site (link-out)</span>
          </label>
          {form.isExternal && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
              <input placeholder="Source name (e.g. Eventbrite)" value={form.source_name} onChange={e => setForm(f => ({ ...f, source_name: e.target.value }))} className={inputClass} />
              <input placeholder="Link to event *" type="url" value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} className={inputClass} />
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save Changes" : "+ Add Event"}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="px-6 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">Cancel</button>}
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40 py-8">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-black/40 text-center py-12">No events yet.</p>
      ) : (
        <div className="flex flex-col gap-px bg-black border border-black">
          {items.map(ev => (
            <div key={ev.id} className="bg-[#F2EDE4] p-5 flex items-center gap-4">
              <div className="w-16 h-16 shrink-0 bg-black/5 overflow-hidden border border-black/10">
                {ev.photos?.[0] ? <img src={cdnUrl(ev.photos[0], "w_200,c_fill,q_auto,f_auto")} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-black to-[#E5000F]/40" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black uppercase text-sm truncate">{ev.title}</h3>
                <p className="text-xs text-black/50 truncate">
                  {[ev.event_date ? new Date(ev.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null, ev.venue, ev.city].filter(Boolean).join(" · ")}
                </p>
                {ev.source !== "local" && <span className="text-[10px] font-bold uppercase tracking-widest text-[#E5000F]">{ev.source_name || ev.source}</span>}
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => startEdit(ev)} className="text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors">Edit</button>
                <button onClick={() => handleDelete(ev.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
