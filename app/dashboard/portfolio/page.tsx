"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import GuideButton from "@/app/components/GuideButton";
import { getSupabase } from "@/lib/supabase";

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: string;
};

function getMusicType(url: string): "soundcloud" | "spotify" | "youtube" | null {
  if (url.includes("soundcloud.com")) return "soundcloud";
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return null;
}

function getEmbedUrl(url: string, type: string): string {
  if (type === "soundcloud") {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23E5000F&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`;
  }
  if (type === "spotify") {
    const match = url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
    if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
  }
  if (type === "youtube") {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) throw new Error("Cloudinary not configured. Add env vars.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState<"images" | "music">("images");

  // Image upload state
  const [imageTitle, setImageTitle] = useState("");
  const [imageDesc, setImageDesc] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Music state
  const [musicTitle, setMusicTitle] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicDesc, setMusicDesc] = useState("");
  const [addingMusic, setAddingMusic] = useState(false);
  const [musicError, setMusicError] = useState("");
  const [musicPreviewType, setMusicPreviewType] = useState<string | null>(null);

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

  const images = items.filter(i => i.media_type === "image");
  const music = items.filter(i => ["soundcloud", "spotify", "youtube", "audio"].includes(i.media_type));

  // Handle file selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image must be under 10MB.");
      return;
    }
    setImageFile(file);
    setImageError("");
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleImageUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile || !imageTitle) return;
    if (images.length >= 10) {
      setImageError("Maximum 10 images allowed.");
      return;
    }
    setUploadingImage(true);
    setImageError("");

    try {
      const url = await uploadToCloudinary(imageFile);
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("portfolio_items")
        .insert({ title: imageTitle, description: imageDesc, media_url: url, media_type: "image", artist_id: userId })
        .select().single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setImageTitle("");
      setImageDesc("");
      setImageFile(null);
      setImagePreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleMusicAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!musicUrl || !musicTitle) return;
    if (music.length >= 10) {
      setMusicError("Maximum 10 music items allowed.");
      return;
    }
    const type = getMusicType(musicUrl);
    if (!type) {
      setMusicError("Please paste a SoundCloud, Spotify, or YouTube link.");
      return;
    }
    setAddingMusic(true);
    setMusicError("");

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("portfolio_items")
        .insert({ title: musicTitle, description: musicDesc, media_url: musicUrl, media_type: type, artist_id: userId })
        .select().single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setMusicTitle("");
      setMusicUrl("");
      setMusicDesc("");
      setMusicPreviewType(null);
    } catch (err: unknown) {
      setMusicError(err instanceof Error ? err.message : "Failed to add music.");
    } finally {
      setAddingMusic(false);
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
    <main className="min-h-screen bg-[#F2EDE4] font-sans text-black">
      <NavbarAuth userName={userName} />

      <div className="max-w-5xl mx-auto px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Artist Dashboard</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-10">My<br />Portfolio</h1>

        {/* Tabs */}
        <div className="flex border border-black mb-10">
          <button
            onClick={() => setActiveTab("images")}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeTab === "images" ? "bg-black text-white" : "hover:bg-black/5"}`}
          >
            🖼 Images
            <span className={`text-xs px-2 py-0.5 rounded-full font-black ${activeTab === "images" ? "bg-white text-black" : "bg-black text-white"}`}>
              {images.length}/10
            </span>
          </button>
          <button
            onClick={() => setActiveTab("music")}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors border-l border-black flex items-center justify-center gap-2 ${activeTab === "music" ? "bg-black text-white" : "hover:bg-black/5"}`}
          >
            🎵 Music
            <span className={`text-xs px-2 py-0.5 rounded-full font-black ${activeTab === "music" ? "bg-white text-black" : "bg-black text-white"}`}>
              {music.length}/10
            </span>
          </button>
        </div>

        {/* ── IMAGES TAB ── */}
        {activeTab === "images" && (
          <>
            {images.length < 10 && (
              <div className="border border-black bg-white p-8 mb-10">
                <h2 className="text-lg font-black uppercase mb-2">Upload Image</h2>
                <p className="text-xs text-black/40 uppercase tracking-widest mb-6">JPG, PNG or WebP — max 10MB per image</p>

                {imageError && (
                  <div className="mb-4 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{imageError}</div>
                )}

                <form onSubmit={handleImageUpload} className="flex flex-col gap-4">
                  {/* Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-black p-10 text-center cursor-pointer hover:bg-black/5 transition-colors"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto object-contain" />
                    ) : (
                      <>
                        <p className="text-3xl mb-2">📷</p>
                        <p className="text-sm font-bold uppercase">Click to select image</p>
                        <p className="text-xs text-black/40 mt-1">or drag and drop here</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  <input
                    placeholder="Title *"
                    value={imageTitle}
                    onChange={e => setImageTitle(e.target.value)}
                    required
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />
                  <input
                    placeholder="Short description (optional)"
                    value={imageDesc}
                    onChange={e => setImageDesc(e.target.value)}
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />
                  <button
                    type="submit"
                    disabled={uploadingImage || !imageFile || !imageTitle}
                    className="py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                  </button>
                </form>
              </div>
            )}

            {images.length === 0 ? (
              <p className="text-sm text-black/40 text-center py-12 border border-dashed border-black">No images yet. Upload your first one above.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black border border-black">
                {images.map(item => (
                  <div key={item.id} className="bg-[#F2EDE4] p-4">
                    <img src={item.media_url} alt={item.title} className="w-full h-52 object-cover mb-3 border border-black/10" />
                    <h3 className="font-black uppercase text-sm">{item.title}</h3>
                    {item.description && <p className="text-xs text-black/50 mt-1">{item.description}</p>}
                    <button onClick={() => handleDelete(item.id)} className="mt-3 text-xs text-[#E5000F] uppercase tracking-widest hover:underline">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── MUSIC TAB ── */}
        {activeTab === "music" && (
          <>
            {music.length < 10 && (
              <div className="border border-black bg-white p-8 mb-10">
                <h2 className="text-lg font-black uppercase mb-2">Add Music</h2>
                <p className="text-xs text-black/40 uppercase tracking-widest mb-1">Paste a link from SoundCloud, Spotify or YouTube</p>
                <div className="flex gap-4 mb-6 mt-2">
                  <span className="text-xs border border-black/20 px-3 py-1 rounded-full">🎵 SoundCloud</span>
                  <span className="text-xs border border-black/20 px-3 py-1 rounded-full">🎧 Spotify</span>
                  <span className="text-xs border border-black/20 px-3 py-1 rounded-full">▶️ YouTube</span>
                </div>

                {musicError && (
                  <div className="mb-4 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{musicError}</div>
                )}

                <form onSubmit={handleMusicAdd} className="flex flex-col gap-4">
                  <input
                    placeholder="Paste SoundCloud / Spotify / YouTube link *"
                    value={musicUrl}
                    onChange={e => {
                      setMusicUrl(e.target.value);
                      setMusicPreviewType(getMusicType(e.target.value));
                    }}
                    type="url"
                    required
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />

                  {/* Live preview */}
                  {musicPreviewType && musicUrl && (
                    <div className="border border-black/20 overflow-hidden">
                      <p className="text-xs font-bold uppercase tracking-widest px-3 py-2 bg-black/5 border-b border-black/10">Preview</p>
                      <iframe
                        src={getEmbedUrl(musicUrl, musicPreviewType)}
                        width="100%"
                        height={musicPreviewType === "soundcloud" ? "120" : "80"}
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        className="block"
                      />
                    </div>
                  )}

                  <input
                    placeholder="Title * (e.g. 'Summer Mix 2024')"
                    value={musicTitle}
                    onChange={e => setMusicTitle(e.target.value)}
                    required
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />
                  <input
                    placeholder="Short description (optional)"
                    value={musicDesc}
                    onChange={e => setMusicDesc(e.target.value)}
                    className="border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                  />
                  <button
                    type="submit"
                    disabled={addingMusic || !musicUrl || !musicTitle}
                    className="py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {addingMusic ? "Adding..." : "+ Add Music"}
                  </button>
                </form>
              </div>
            )}

            {music.length === 0 ? (
              <p className="text-sm text-black/40 text-center py-12 border border-dashed border-black">No music yet. Add your first track above.</p>
            ) : (
              <div className="flex flex-col gap-px bg-black border border-black">
                {music.map(item => (
                  <div key={item.id} className="bg-[#F2EDE4] p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-black uppercase text-sm">{item.title}</h3>
                        {item.description && <p className="text-xs text-black/50 mt-0.5">{item.description}</p>}
                        <p className="text-xs text-black/30 uppercase tracking-widest mt-1">{item.media_type}</p>
                      </div>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline shrink-0 ml-4">
                        Remove
                      </button>
                    </div>
                    {["soundcloud", "spotify", "youtube"].includes(item.media_type) && (
                      <iframe
                        src={getEmbedUrl(item.media_url, item.media_type)}
                        width="100%"
                        height={item.media_type === "soundcloud" ? "120" : "80"}
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        className="block border border-black/10"
                      />
                    )}
                    {item.media_type === "audio" && (
                      <audio src={item.media_url} controls className="w-full mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Link href="/dashboard" className="block text-center text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors mt-10">
          ← Back to Dashboard
        </Link>
      </div>

      <GuideButton
        title="Portfolio Guide"
        steps={[
          { title: "Images Tab", description: "Upload up to 10 photos directly from your computer. Click the upload area or drag and drop. Max 10MB per image." },
          { title: "Music Tab", description: "Add up to 10 music samples by pasting a SoundCloud, Spotify or YouTube link. A live preview appears before you save." },
          { title: "Supported Music Links", description: "SoundCloud tracks/playlists, Spotify tracks/albums/playlists, YouTube videos — all show as embedded players on your profile." },
          { title: "Remove Items", description: "Click 'Remove' under any image or music item to permanently delete it from your portfolio." },
          { title: "Limits", description: "Maximum 10 images and 10 music items. The counter next to each tab shows how many you've used." },
        ]}
      />
    </main>
  );
}
