"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";

type MediaType = "image" | "soundcloud" | "spotify" | "youtube";

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: MediaType;
};

type EditState = {
  id: string;
  title: string;
  description: string;
  media_url: string; // only used for music
};

const MAX_IMAGES = 20;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

function getMusicEmbedUrl(url: string): { type: MediaType; embedUrl: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("soundcloud.com")) {
      return { type: "soundcloud", embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23E5000F&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false` };
    }
    if (u.hostname.includes("spotify.com")) {
      const embedUrl = url.replace("https://open.spotify.com/", "https://open.spotify.com/embed/").replace(/\?.*$/, "");
      return { type: "spotify", embedUrl };
    }
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let videoId = "";
      if (u.hostname.includes("youtu.be")) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get("v") || "";
      }
      if (!videoId) return null;
      return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${videoId}` };
    }
  } catch {
    return null;
  }
  return null;
}

function MusicEmbed({ item }: { item: PortfolioItem }) {
  if (item.media_type === "soundcloud") {
    return <iframe width="100%" height="120" scrolling="no" frameBorder="no" allow="autoplay" src={item.media_url} className="mb-3" />;
  }
  if (item.media_type === "spotify") {
    return <iframe src={item.media_url} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="mb-3" />;
  }
  if (item.media_type === "youtube") {
    return <iframe width="100%" height="200" src={item.media_url} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="mb-3" />;
  }
  return null;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"images" | "music">("images");

  // Image upload state
  const [imageTitle, setImageTitle] = useState("");
  const [imageDesc, setImageDesc] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Music embed state
  const [musicUrl, setMusicUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicDesc, setMusicDesc] = useState("");

  const imageItems = items.filter(i => i.media_type === "image");
  const musicItems = items.filter(i => ["soundcloud", "spotify", "youtube"].includes(i.media_type));

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

      setItems((portfolioItems as PortfolioItem[]) || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function uploadToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary is not configured. Please check your environment variables.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      const cloudinaryMsg = data?.error?.message ?? "";
      // The most common error: preset is "Signed" — must be "Unsigned" for browser uploads
      if (cloudinaryMsg.toLowerCase().includes("preset") || cloudinaryMsg.toLowerCase().includes("whitelist")) {
        throw new Error(
          "Your Cloudinary upload preset must be set to Unsigned. Go to cloudinary.com → Settings → Upload → find your preset → change Mode to Unsigned, then save."
        );
      }
      throw new Error(cloudinaryMsg || "Image upload failed. Check your Cloudinary settings.");
    }
    return data.secure_url as string;
  }

  async function handleImageAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile || !imageTitle) return;
    if (imageItems.length >= MAX_IMAGES) { setError(`Maximum ${MAX_IMAGES} images allowed.`); return; }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      setError("Image is larger than 3 MB. Please choose a smaller file.");
      return;
    }
    setSaving(true);
    setUploadProgress(true);
    setError("");

    try {
      const imageUrl = await uploadToCloudinary(imageFile);
      const supabase = getSupabase();
      const { data, error: dbErr } = await supabase
        .from("portfolio_items")
        .insert({ title: imageTitle, description: imageDesc, media_url: imageUrl, media_type: "image", artist_id: userId })
        .select()
        .single();

      if (dbErr) throw dbErr;
      setItems(prev => [data as PortfolioItem, ...prev]);
      setImageTitle("");
      setImageDesc("");
      setImageFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setSaving(false);
      setUploadProgress(false);
    }
  }

  async function handleMusicAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!musicUrl || !musicTitle) return;
    if (musicItems.length >= 10) { setError("Maximum 10 music tracks allowed."); return; }
    setError("");

    const parsed = getMusicEmbedUrl(musicUrl);
    if (!parsed) {
      setError("Paste a valid SoundCloud, Spotify, or YouTube link.");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();
      const { data, error: dbErr } = await supabase
        .from("portfolio_items")
        .insert({ title: musicTitle, description: musicDesc, media_url: parsed.embedUrl, media_type: parsed.type, artist_id: userId })
        .select()
        .single();

      if (dbErr) throw dbErr;
      setItems(prev => [data as PortfolioItem, ...prev]);
      setMusicUrl("");
      setMusicTitle("");
      setMusicDesc("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add music.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = getSupabase();
    await supabase.from("portfolio_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setError("");
    try {
      // For music, re-parse URL if it changed
      const currentItem = items.find(i => i.id === editing.id);
      let finalMediaUrl = editing.media_url;
      let finalMediaType: MediaType = currentItem?.media_type ?? "image";

      if (currentItem && currentItem.media_type !== "image" && editing.media_url !== currentItem.media_url) {
        const parsed = getMusicEmbedUrl(editing.media_url);
        if (!parsed) { setError("Paste a valid SoundCloud, Spotify, or YouTube link."); setEditSaving(false); return; }
        finalMediaUrl = parsed.embedUrl;
        finalMediaType = parsed.type;
      }

      const supabase = getSupabase();
      const { error: dbErr } = await supabase
        .from("portfolio_items")
        .update({ title: editing.title, description: editing.description, media_url: finalMediaUrl, media_type: finalMediaType })
        .eq("id", editing.id);
      if (dbErr) throw dbErr;

      setItems(prev => prev.map(i =>
        i.id === editing.id
          ? { ...i, title: editing.title, description: editing.description, media_url: finalMediaUrl, media_type: finalMediaType }
          : i
      ));
      setEditing(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setEditSaving(false);
    }
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

        {/* Tabs */}
        <div className="flex border border-black mb-8">
          <button
            onClick={() => { setTab("images"); setError(""); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === "images" ? "bg-black text-white" : "bg-transparent text-black hover:bg-black/5"}`}
          >
            Images ({imageItems.length}/{MAX_IMAGES})
          </button>
          <button
            onClick={() => { setTab("music"); setError(""); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-l border-black ${tab === "music" ? "bg-black text-white" : "bg-transparent text-black hover:bg-black/5"}`}
          >
            Music ({musicItems.length}/10)
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>
        )}

        {/* Images Tab */}
        {tab === "images" && (
          <>
            <div className="border border-black bg-white p-8 mb-10">
              <h2 className="text-lg font-black uppercase mb-6">Upload Image</h2>
              <form onSubmit={handleImageAdd} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    placeholder="Title *"
                    value={imageTitle}
                    onChange={e => setImageTitle(e.target.value)}
                    required
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />
                  <input
                    placeholder="Description (optional)"
                    value={imageDesc}
                    onChange={e => setImageDesc(e.target.value)}
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />
                </div>
                <div className="border border-dashed border-black p-6 text-center cursor-pointer hover:border-[#E5000F] transition-colors" onClick={() => fileRef.current?.click()}>
                  {imageFile ? (
                    <p className="text-sm font-bold">{imageFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-bold uppercase mb-1">Click to choose an image</p>
                      <p className="text-xs text-black/40">JPG, PNG, WEBP — max 3MB</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > MAX_IMAGE_BYTES) {
                        setError("Image is larger than 3 MB. Please choose a smaller file.");
                        setImageFile(null);
                        e.target.value = "";
                        return;
                      }
                      setError("");
                      setImageFile(f);
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !imageFile || !imageTitle}
                  className="py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
                >
                  {uploadProgress ? "Uploading..." : "+ Add Image"}
                </button>
              </form>
            </div>

            {imageItems.length === 0 ? (
              <p className="text-sm text-black/40 text-center py-12">No images yet. Upload your first photo above.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black border border-black">
                {imageItems.map(item => (
                  <div key={item.id} className="bg-[#F2EDE4] p-4">
                    <img src={cdnUrl(item.media_url, "w_800,c_limit,q_auto,f_auto")} alt={item.title} className="w-full h-48 object-cover mb-3 border border-black/10" />

                    {editing?.id === item.id ? (
                      <form onSubmit={handleEditSave} className="flex flex-col gap-2 mt-1">
                        <input
                          value={editing.title}
                          onChange={e => setEditing({ ...editing, title: e.target.value })}
                          required
                          placeholder="Title *"
                          className="border border-black px-3 py-2 text-xs outline-none focus:border-[#E5000F] transition-colors"
                        />
                        <input
                          value={editing.description}
                          onChange={e => setEditing({ ...editing, description: e.target.value })}
                          placeholder="Description (optional)"
                          className="border border-black px-3 py-2 text-xs outline-none focus:border-[#E5000F] transition-colors"
                        />
                        <div className="flex gap-3 mt-1">
                          <button type="submit" disabled={editSaving} className="flex-1 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
                            {editSaving ? "Saving…" : "Save"}
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="flex-1 py-2 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3 className="font-black uppercase text-sm">{item.title}</h3>
                        {item.description && <p className="text-xs text-black/50 mt-1">{item.description}</p>}
                        <div className="flex items-center gap-4 mt-2">
                          <button
                            onClick={() => setEditing({ id: item.id, title: item.title, description: item.description, media_url: item.media_url })}
                            className="text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors"
                          >
                            Edit
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline">
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Music Tab */}
        {tab === "music" && (
          <>
            <div className="border border-black bg-white p-8 mb-10">
              <h2 className="text-lg font-black uppercase mb-2">Add Music</h2>
              <p className="text-xs text-black/50 mb-6">Paste a SoundCloud, Spotify, or YouTube link</p>
              <form onSubmit={handleMusicAdd} className="flex flex-col gap-4">
                <input
                  placeholder="SoundCloud / Spotify / YouTube URL *"
                  value={musicUrl}
                  onChange={e => setMusicUrl(e.target.value)}
                  required
                  type="url"
                  className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    placeholder="Title *"
                    value={musicTitle}
                    onChange={e => setMusicTitle(e.target.value)}
                    required
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />
                  <input
                    placeholder="Description (optional)"
                    value={musicDesc}
                    onChange={e => setMusicDesc(e.target.value)}
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !musicUrl || !musicTitle}
                  className="py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
                >
                  {saving ? "Adding..." : "+ Add Track"}
                </button>
              </form>
            </div>

            {musicItems.length === 0 ? (
              <p className="text-sm text-black/40 text-center py-12">No music yet. Paste a link above.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {musicItems.map(item => (
                  <div key={item.id} className="border border-black bg-white p-6">
                    <MusicEmbed item={item} />

                    {editing?.id === item.id ? (
                      <form onSubmit={handleEditSave} className="flex flex-col gap-2 mt-2">
                        <input
                          value={editing.title}
                          onChange={e => setEditing({ ...editing, title: e.target.value })}
                          required
                          placeholder="Title *"
                          className="border border-black px-3 py-2 text-xs outline-none focus:border-[#E5000F] transition-colors"
                        />
                        <input
                          value={editing.description}
                          onChange={e => setEditing({ ...editing, description: e.target.value })}
                          placeholder="Description (optional)"
                          className="border border-black px-3 py-2 text-xs outline-none focus:border-[#E5000F] transition-colors"
                        />
                        <input
                          value={editing.media_url}
                          onChange={e => setEditing({ ...editing, media_url: e.target.value })}
                          placeholder="SoundCloud / Spotify / YouTube URL"
                          type="url"
                          className="border border-black px-3 py-2 text-xs outline-none focus:border-[#E5000F] transition-colors"
                        />
                        <div className="flex gap-3 mt-1">
                          <button type="submit" disabled={editSaving} className="flex-1 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50">
                            {editSaving ? "Saving…" : "Save"}
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="flex-1 py-2 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3 className="font-black uppercase text-sm">{item.title}</h3>
                        {item.description && <p className="text-xs text-black/50 mt-1">{item.description}</p>}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-black/30 uppercase tracking-widest">{item.media_type}</span>
                          <button
                            onClick={() => setEditing({ id: item.id, title: item.title, description: item.description, media_url: item.media_url })}
                            className="text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors"
                          >
                            Edit
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline">
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Link href="/dashboard" className="block text-center text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors mt-12">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
