"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import GuideButton from "@/app/components/GuideButton";
import { getSupabase } from "@/lib/supabase";

async function uploadToCloudinary(file: File, folder = "daily_pics"): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) throw new Error("Cloudinary not configured.");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);
  fd.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url as string;
}

type Profile = {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  category: string | null;
  location: string | null;
  hourly_rate: number | null;
  session_rate: number | null;
  is_available: boolean;
  is_deactivated?: boolean;
  daily_pic_url?: string | null;
  daily_pic_caption?: string | null;
  daily_pic_updated_at?: string | null;
};

type Booking = {
  id: string;
  event_date: string;
  message: string;
  status: string;
  duration_hours: number;
  other_name?: string;
};

const statusColor: Record<string, string> = {
  pending: "text-yellow-600 border-yellow-400",
  accepted: "text-green-700 border-green-500",
  declined: "text-[#E5000F] border-[#E5000F]",
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyCaption, setDailyCaption] = useState("");
  const [dailyUploading, setDailyUploading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const [dailySuccess, setDailySuccess] = useState(false);
  const dailyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) { router.push("/login"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(prof);
      if (prof?.daily_pic_caption) setDailyCaption(prof.daily_pic_caption);

      if (prof?.role === "artist") {
        const { data: bks } = await supabase
          .from("bookings")
          .select("id, event_date, message, status, duration_hours, client:client_id(full_name)")
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        setBookings((bks || []).map((b: any) => ({ ...b, other_name: b.client?.full_name })));
      } else {
        const { data: bks } = await supabase
          .from("bookings")
          .select("id, event_date, message, status, duration_hours, artist:artist_id(full_name)")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        setBookings((bks || []).map((b: any) => ({ ...b, other_name: b.artist?.full_name })));
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function saveDailyCaption(url: string, caption: string) {
    setDailySaving(true);
    setDailyError("");
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update({
        daily_pic_url: url,
        daily_pic_caption: caption || null,
        daily_pic_updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (error) throw error;
      setProfile(p => p ? { ...p, daily_pic_url: url, daily_pic_caption: caption, daily_pic_updated_at: new Date().toISOString() } : p);
      setDailySuccess(true);
      setTimeout(() => setDailySuccess(false), 3000);
    } catch (err) {
      setDailyError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setDailySaving(false);
    }
  }

  async function removeDailyPic() {
    setDailySaving(true);
    setDailyError("");
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("profiles").update({ daily_pic_url: null, daily_pic_caption: null, daily_pic_updated_at: null }).eq("id", user.id);
      setProfile(p => p ? { ...p, daily_pic_url: null, daily_pic_caption: null, daily_pic_updated_at: null } : p);
      setDailyCaption("");
    } catch (err) {
      setDailyError(err instanceof Error ? err.message : "Failed to remove.");
    } finally {
      setDailySaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
      </main>
    );
  }

  const isArtist = profile?.role === "artist";
  const profileComplete = profile?.bio && profile?.category && profile?.location;

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans">
      <NavbarAuth userName={profile?.full_name} />

      <div className="px-8 py-12 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-black pb-8 fade-in-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-2">
              {isArtist ? "Artist" : "Client"} Dashboard
            </p>
            <h1 className="text-5xl font-black uppercase leading-none">
              Welcome,<br />{profile?.full_name?.split(" ")[0] || "Friend"}.
            </h1>
          </div>
          {isArtist && (
            <Link
              href={`/artists/${profile?.id}`}
              className="mt-6 md:mt-0 text-xs font-bold uppercase tracking-widest border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors"
            >
              View My Public Profile →
            </Link>
          )}
        </div>

        {/* Deactivated banner */}
        {profile?.is_deactivated && (
          <div className="border border-black bg-black text-white p-6 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-black uppercase text-white text-sm mb-1">Your account is deactivated</p>
              <p className="text-xs text-white/60">Your profile is hidden from clients. Go to Settings to reactivate.</p>
            </div>
            <Link
              href="/dashboard/settings?section=danger"
              className="shrink-0 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-white hover:text-black transition-colors"
            >
              Go to Settings →
            </Link>
          </div>
        )}

        {/* Profile incomplete warning for artists */}
        {isArtist && !profileComplete && !profile?.is_deactivated && (
          <div className="border border-[#E5000F] bg-white p-6 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-black uppercase text-[#E5000F] text-sm mb-1">Your profile is incomplete</p>
              <p className="text-xs text-black/60">Add your bio, category, and location so clients can find you.</p>
            </div>
            <Link
              href="/dashboard/setup"
              className="shrink-0 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-black transition-colors text-center"
            >
              Complete Profile
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-black border border-black">

          {/* Quick Actions */}
          <div className="bg-[#F2EDE4] p-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              {isArtist ? (
                <>
                  <Link href="/dashboard/setup" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                    Edit Profile
                  </Link>
                  <Link href="/dashboard/portfolio" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                    Manage Portfolio
                  </Link>
                  <Link href="/artists" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                    Browse Other Artists
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/artists" className="block bg-black text-white px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors text-center">
                    Browse Artists
                  </Link>
                  <Link href="/artists?category=Photography" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors text-center">
                    Browse by Category →
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Profile Summary (artists) / Stats (clients) */}
          <div className="bg-[#F2EDE4] p-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">
              {isArtist ? "Your Profile" : "Your Account"}
            </h2>
            {isArtist ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-black/40 uppercase tracking-widest">Category</p>
                  <p className="font-bold uppercase mt-1">{profile?.category || <span className="text-black/30">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-black/40 uppercase tracking-widest">Location</p>
                  <p className="font-bold uppercase mt-1">{profile?.location || <span className="text-black/30">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-black/40 uppercase tracking-widest">Hourly Rate</p>
                  <p className="font-bold uppercase mt-1">{profile?.hourly_rate ? `€${profile.hourly_rate}/hr` : <span className="text-black/30">Not set</span>}</p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs uppercase tracking-widest text-black/40">Available:</span>
                  <span className={`text-xs font-bold uppercase ${profile?.is_available ? "text-green-700" : "text-[#E5000F]"}`}>
                    {profile?.is_available ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-black/40 uppercase tracking-widest">Name</p>
                  <p className="font-bold uppercase mt-1">{profile?.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-black/40 uppercase tracking-widest">Role</p>
                  <p className="font-bold uppercase mt-1">Client</p>
                </div>
                <div>
                  <p className="text-xs text-black/40 uppercase tracking-widest">Total Bookings</p>
                  <p className="font-bold text-3xl mt-1">{bookings.length}</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Bookings */}
          <div className="bg-[#F2EDE4] p-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">
              {isArtist ? "Recent Bookings" : "My Bookings"}
            </h2>
            {bookings.length === 0 ? (
              <p className="text-sm text-black/40">No bookings yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {bookings.map((b) => (
                  <div key={b.id} className="border-b border-black/10 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold uppercase">{b.other_name || "User"}</p>
                      <span className={`text-xs font-bold uppercase border px-2 py-0.5 ${statusColor[b.status] || ""}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-black/40">{b.event_date ? new Date(b.event_date).toLocaleDateString("en-GB") : "Date TBD"} · {b.duration_hours}h</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Pic Section — artists only */}
      {isArtist && (
        <div className="mt-px border border-black bg-[#F2EDE4] p-8 max-w-6xl mx-auto mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Daily Photo — Story</h2>
              <p className="text-sm text-black/60">Visible on your profile for <strong>24 hours</strong> after upload, then it disappears automatically — like an Instagram story.</p>
            </div>
            {profile?.daily_pic_updated_at && (() => {
              const age = Date.now() - new Date(profile.daily_pic_updated_at!).getTime();
              const hoursLeft = Math.max(0, 24 - Math.floor(age / 3600000));
              const expired = age >= 24 * 3600 * 1000;
              return (
                <span className={`text-xs font-bold uppercase tracking-widest shrink-0 ml-6 px-3 py-1 border ${expired ? "border-black/20 text-black/30" : hoursLeft <= 3 ? "border-[#E5000F] text-[#E5000F]" : "border-black text-black"}`}>
                  {expired ? "Expired" : `${hoursLeft}h left`}
                </span>
              );
            })()}
          </div>

          {dailyError && (
            <div className="mb-4 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{dailyError}</div>
          )}
          {dailySuccess && (
            <div className="mb-4 px-4 py-3 border border-green-600 text-green-700 text-xs uppercase tracking-widest">Daily photo saved!</div>
          )}

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Current pic preview */}
            <div className="w-full md:w-64 shrink-0">
              {profile?.daily_pic_url && (() => {
                const age = Date.now() - new Date(profile.daily_pic_updated_at!).getTime();
                const expired = age >= 24 * 3600 * 1000;
                return expired ? null : (
                  <div className="border border-black overflow-hidden">
                    <img src={profile.daily_pic_url!} alt="Daily pic" className="w-full h-48 object-cover" />
                    <div className="p-3 border-t border-black flex justify-between items-center">
                      <span className="text-xs text-black/50 uppercase tracking-widest">Live on profile</span>
                      <button
                        onClick={removeDailyPic}
                        disabled={dailySaving}
                        className="text-xs text-[#E5000F] font-bold uppercase tracking-widest hover:text-black transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })()}
              {(!profile?.daily_pic_url || Date.now() - new Date(profile.daily_pic_updated_at ?? 0).getTime() >= 24 * 3600 * 1000) && (
                <div
                  className="border-2 border-dashed border-black/30 h-48 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-black transition-colors"
                  onClick={() => dailyRef.current?.click()}
                >
                  <span className="text-3xl">📷</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">
                    {profile?.daily_pic_url ? "Story expired — upload new" : "No story yet"}
                  </span>
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="flex-1 flex flex-col gap-4">
              <input
                ref={dailyRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setDailyUploading(true);
                  setDailyError("");
                  try {
                    const url = await uploadToCloudinary(file, "daily_pics");
                    await saveDailyCaption(url, dailyCaption);
                  } catch (err) {
                    setDailyError(err instanceof Error ? err.message : "Upload failed.");
                  } finally {
                    setDailyUploading(false);
                    e.target.value = "";
                  }
                }}
              />

              <button
                onClick={() => dailyRef.current?.click()}
                disabled={dailyUploading || dailySaving}
                className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50 self-start"
              >
                {dailyUploading ? "Uploading..." : "Post Story"}
              </button>

              {profile?.daily_pic_url && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Caption (optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Add a caption to your daily photo..."
                      value={dailyCaption}
                      onChange={e => setDailyCaption(e.target.value)}
                      className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors resize-none placeholder:text-black/30"
                    />
                  </div>
                  <button
                    onClick={() => saveDailyCaption(profile.daily_pic_url!, dailyCaption)}
                    disabled={dailySaving}
                    className="px-6 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50 self-start"
                  >
                    {dailySaving ? "Saving..." : "Save Caption"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
        <span className="text-sm font-black uppercase tracking-tight">ArtConnect</span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
        </div>
      </footer>

      <GuideButton
        title="Your Dashboard"
        steps={[
          { title: "Quick Actions", description: "Use the left panel to jump to key actions — browse artists, edit your profile, or manage your portfolio." },
          { title: "Your Profile Summary", description: "The middle panel shows your category, location, rate, and availability at a glance." },
          { title: "Recent Bookings", description: "The right panel shows your 5 most recent bookings with their current status (Pending, Accepted, Declined)." },
          { title: "Complete Your Profile (Artists)", description: "If you see a warning banner, click 'Complete Profile' to add your bio, category and location so clients can find you." },
          { title: "Settings", description: "Click 'Settings' in the top navigation to update your personal info, password, notifications and privacy." },
          { title: "Deactivate or Delete", description: "To temporarily hide your profile or permanently delete your account, go to Settings → Deactivate / Delete." },
        ]}
      />
    </main>
  );
}
