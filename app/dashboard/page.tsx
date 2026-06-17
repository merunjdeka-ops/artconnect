"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import GuideButton from "@/app/components/GuideButton";
import RichCaptionEditor from "@/app/components/RichCaptionEditor";
import { getSupabase } from "@/lib/supabase";

async function uploadToCloudinary(file: File, folder = "daily_pics"): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) throw new Error("Cloudinary not configured.");
  const isVideo = file.type.startsWith("video/");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);
  fd.append("folder", folder);
  if (isVideo) {
    fd.append("resource_type", "video");
    fd.append("eager", "c_limit,h_720,q_auto:good,vc_auto");
  }
  const resourceType = isVideo ? "video" : "image";
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: "POST", body: fd });
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
  const [inviteCopied, setInviteCopied] = useState(false);
  const [referralCount, setReferralCount] = useState<number | null>(null);

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
        // Fetch all bookings for artists so stats and pending panel are complete
        const [{ data: bks }, { count }] = await Promise.all([
          supabase
            .from("bookings")
            .select("id, event_date, message, status, duration_hours, client:client_id(full_name)")
            .eq("artist_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("referred_by", user.id),
        ]);

        setBookings((bks || []).map((b: any) => ({ ...b, other_name: b.client?.full_name })));
        setReferralCount(count ?? 0);
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

  // Artist stats
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const acceptedBookings = bookings.filter(b => b.status === "accepted");
  const pendingCount = pendingBookings.length;
  const acceptedCount = acceptedBookings.length;

  // ─── Artist Dashboard ───────────────────────────────────────────────────────
  if (isArtist) {
    return (
      <main className="min-h-screen bg-[#F2EDE4] font-sans">
        <NavbarAuth userName={profile?.full_name} />

        <div className="px-8 py-12 max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 border-b border-black pb-8 fade-in-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-2">Artist Dashboard</p>
              <h1 className="text-5xl font-black uppercase leading-none">
                Welcome,<br />{profile?.full_name?.split(" ")[0] || "Artist"}.
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-0">
              <Link
                href={`/artists/${profile?.id}`}
                className="text-xs font-bold uppercase tracking-widest border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors text-center"
              >
                View Public Profile →
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-xs font-bold uppercase tracking-widest border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors text-center"
              >
                Settings
              </Link>
            </div>
          </div>

          {/* Deactivated banner */}
          {profile?.is_deactivated && (
            <div className="border border-black bg-black text-white p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

          {/* Profile incomplete warning */}
          {!profileComplete && !profile?.is_deactivated && (
            <div className="border border-[#E5000F] bg-white p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black border border-black mb-8">
            <div className="bg-[#F2EDE4] p-6">
              <p className="text-xs text-black/40 uppercase tracking-widest mb-2">Total Requests</p>
              <p className="text-4xl font-black">{bookings.length}</p>
            </div>
            <div className={`p-6 ${pendingCount > 0 ? "bg-[#E5000F]" : "bg-[#F2EDE4]"}`}>
              <p className={`text-xs uppercase tracking-widest mb-2 ${pendingCount > 0 ? "text-white/70" : "text-black/40"}`}>Pending</p>
              <p className={`text-4xl font-black ${pendingCount > 0 ? "text-white" : ""}`}>{pendingCount}</p>
            </div>
            <div className="bg-[#F2EDE4] p-6">
              <p className="text-xs text-black/40 uppercase tracking-widest mb-2">Accepted</p>
              <p className="text-4xl font-black text-green-700">{acceptedCount}</p>
            </div>
            <div className="bg-[#F2EDE4] p-6">
              <p className="text-xs text-black/40 uppercase tracking-widest mb-2">Availability</p>
              <p className={`text-xl font-black uppercase mt-1 ${profile?.is_available ? "text-green-700" : "text-[#E5000F]"}`}>
                {profile?.is_available ? "Available" : "Unavailable"}
              </p>
            </div>
          </div>

          {/* Pending Requests — prominent when there are any */}
          {pendingCount > 0 && (
            <div className="border border-[#E5000F] mb-8">
              <div className="p-6 border-b border-[#E5000F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-1">Action Required</p>
                  <h2 className="text-2xl font-black uppercase">
                    {pendingCount} Pending Request{pendingCount !== 1 ? "s" : ""}
                  </h2>
                </div>
                <Link
                  href="/dashboard/bookings"
                  className="shrink-0 text-xs font-bold uppercase tracking-widest border border-[#E5000F] text-[#E5000F] px-6 py-3 hover:bg-[#E5000F] hover:text-white transition-colors text-center"
                >
                  Manage All →
                </Link>
              </div>
              <div className="divide-y divide-black/10 bg-[#F2EDE4]">
                {pendingBookings.slice(0, 3).map((b) => (
                  <div key={b.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-black uppercase text-lg mb-1">{b.other_name || "Client"}</p>
                      <p className="text-xs text-black/50 uppercase tracking-widest">
                        {b.event_date ? new Date(b.event_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Date TBD"}
                        {b.duration_hours ? ` · ${b.duration_hours}h` : ""}
                      </p>
                      {b.message && (
                        <p className="text-sm text-black/60 mt-2 line-clamp-2">{b.message}</p>
                      )}
                    </div>
                    <Link
                      href="/dashboard/bookings"
                      className="shrink-0 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors text-center"
                    >
                      Respond →
                    </Link>
                  </div>
                ))}
                {pendingCount > 3 && (
                  <div className="p-4 text-center">
                    <Link href="/dashboard/bookings" className="text-xs font-bold uppercase tracking-widest text-[#E5000F] hover:text-black transition-colors">
                      + {pendingCount - 3} more pending request{pendingCount - 3 !== 1 ? "s" : ""} →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main 3-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-black border border-black">

            {/* Quick Actions */}
            <div className="bg-[#F2EDE4] p-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Quick Actions</h2>
              <div className="flex flex-col gap-3">
                <Link href="/dashboard/setup" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                  Edit Profile
                </Link>
                <Link href="/dashboard/portfolio" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                  Manage Portfolio
                </Link>
                <Link href="/dashboard/availability" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                  Set Availability
                </Link>
                <Link href="/dashboard/bookings" className="block bg-[#E5000F] text-white px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black transition-colors text-center">
                  All Bookings →
                </Link>
                <Link href="/artists" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                  Browse Other Artists
                </Link>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="bg-[#F2EDE4] p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-black/40">Your Profile</h2>
                <Link href="/dashboard/setup" className="text-xs font-bold uppercase tracking-widest text-[#E5000F] hover:text-black transition-colors">
                  Edit →
                </Link>
              </div>
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
                {profile?.session_rate && (
                  <div>
                    <p className="text-xs text-black/40 uppercase tracking-widest">Session Rate</p>
                    <p className="font-bold uppercase mt-1">€{profile.session_rate}</p>
                  </div>
                )}
                <div className="border-t border-black/10 pt-4 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-black/40">Available for bookings</span>
                  <span className={`text-xs font-black uppercase px-3 py-1 border ${profile?.is_available ? "border-green-600 text-green-700 bg-green-50" : "border-[#E5000F] text-[#E5000F] bg-red-50"}`}>
                    {profile?.is_available ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Bookings History */}
            <div className="bg-[#F2EDE4] p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-black/40">Recent Activity</h2>
                <Link href="/dashboard/bookings" className="text-xs font-bold uppercase tracking-widest text-[#E5000F] hover:text-black transition-colors">
                  View All →
                </Link>
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-black/40 mb-3">No bookings yet.</p>
                  <p className="text-xs text-black/30 uppercase tracking-widest">Requests from clients will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {bookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="border-b border-black/10 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold uppercase">{b.other_name || "Client"}</p>
                        <span className={`text-xs font-bold uppercase border px-2 py-0.5 ${statusColor[b.status] || ""}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs text-black/40">
                        {b.event_date ? new Date(b.event_date).toLocaleDateString("en-GB") : "Date TBD"} · {b.duration_hours}h
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily Pic / Story */}
          <div className="mt-8 border border-black bg-[#F2EDE4] p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-1">Daily Photo — Story</h2>
                <p className="text-sm text-black/60">Visible on your profile for <strong>24 hours</strong> after upload, then disappears automatically.</p>
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
              <div className="w-full md:w-64 shrink-0">
                {profile?.daily_pic_url && (() => {
                  const age = Date.now() - new Date(profile.daily_pic_updated_at!).getTime();
                  const expired = age >= 24 * 3600 * 1000;
                  return expired ? null : (
                    <div className="border border-black overflow-hidden">
                      {profile.daily_pic_url!.match(/\.(mp4|mov|webm|m4v)$/i) || profile.daily_pic_url!.includes("/video/upload/") ? (
                        <video src={profile.daily_pic_url!} className="w-full h-48 object-cover" muted playsInline controls />
                      ) : (
                        <img src={profile.daily_pic_url!} alt="Daily story" className="w-full h-48 object-cover" />
                      )}
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

              <div className="flex-1 flex flex-col gap-4">
                <input
                  ref={dailyRef}
                  type="file"
                  accept="image/*,video/mp4,video/quicktime,video/webm,video/x-m4v"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.type.startsWith("video/") && file.size > 100 * 1024 * 1024) {
                      setDailyError("Video must be under 100MB.");
                      e.target.value = "";
                      return;
                    }
                    setDailyUploading(true);
                    setDailyError("");
                    try {
                      const url = await uploadToCloudinary(file, "daily_stories");
                      await saveDailyCaption(url, dailyCaption);
                    } catch (err) {
                      setDailyError(err instanceof Error ? err.message : "Upload failed.");
                    } finally {
                      setDailyUploading(false);
                      e.target.value = "";
                    }
                  }}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => dailyRef.current?.click()}
                    disabled={dailyUploading || dailySaving}
                    className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
                  >
                    {dailyUploading ? "Uploading..." : "📷 Photo"}
                  </button>
                  <button
                    onClick={() => { if (dailyRef.current) { dailyRef.current.accept = "video/mp4,video/quicktime,video/webm,video/x-m4v"; dailyRef.current.click(); setTimeout(() => { if (dailyRef.current) dailyRef.current.accept = "image/*,video/mp4,video/quicktime,video/webm,video/x-m4v"; }, 500); } }}
                    disabled={dailyUploading || dailySaving}
                    className="px-6 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                  >
                    {dailyUploading ? "Uploading..." : "🎬 Video"}
                  </button>
                </div>
                <p className="text-xs text-black/40">Photos (any size) · Videos up to 100MB — compressed automatically</p>

                {profile?.daily_pic_url && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-black/50">Caption (optional)</label>
                      <RichCaptionEditor
                        value={dailyCaption}
                        onChange={setDailyCaption}
                        placeholder="Add a caption to your daily photo…"
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

          {/* Referral / Invite */}
          <div className="mt-8 border border-black bg-[#F2EDE4]">
            <div className="p-8 flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-1">Your Referral Link</p>
                <h2 className="text-xl font-black uppercase leading-tight mb-2">Invite Artists. Track Who Joins.</h2>
                <p className="text-sm text-black/50 mb-6 max-w-md">
                  Share your personal invite link. Anyone who signs up via your link is tracked — so you can see exactly how many artists you&apos;ve brought to the platform.
                </p>

                {/* Referral count badge */}
                {referralCount !== null && (
                  <div className="inline-flex items-center gap-3 border border-black bg-white px-5 py-3 mb-6">
                    <span className="text-3xl font-black text-[#E5000F]">{referralCount}</span>
                    <span className="text-xs uppercase tracking-widest text-black/50">
                      {referralCount === 1 ? "artist joined" : "artists joined"} via your link
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-md">
                  {/* Artist invite link */}
                  <div>
                    <p className="text-xs text-black/40 uppercase tracking-widest mb-1">Invite artists to join:</p>
                    <div className="flex items-center border border-black bg-white overflow-hidden">
                      <span className="px-4 py-3 text-xs text-black/50 font-mono border-r border-black select-all whitespace-nowrap overflow-hidden text-ellipsis">
                        thelocalarthub.com/signup?role=artist&ref={profile?.id}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://thelocalarthub.com/signup?role=artist&ref=${profile?.id}`).then(() => {
                            setInviteCopied(true);
                            setTimeout(() => setInviteCopied(false), 2500);
                          });
                        }}
                        className="px-5 py-3 text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-[#E5000F] transition-colors whitespace-nowrap shrink-0"
                      >
                        {inviteCopied ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Client invite link */}
                  <div>
                    <p className="text-xs text-black/40 uppercase tracking-widest mb-1">Share your profile with clients:</p>
                    <div className="flex items-center border border-black bg-white overflow-hidden">
                      <span className="px-4 py-3 text-xs text-black/50 font-mono border-r border-black select-all whitespace-nowrap overflow-hidden text-ellipsis">
                        thelocalarthub.com/artists/{profile?.id}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://thelocalarthub.com/artists/${profile?.id}`);
                        }}
                        className="px-5 py-3 text-xs font-bold uppercase tracking-widest border-l border-black text-xs text-black/50 hover:text-black transition-colors whitespace-nowrap shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <a
                    href={`mailto:?subject=Join me on The Local Art Hub&body=Hey! I use The Local Art Hub to get bookings in Italy. You should create your own artist profile — it's free. Join here: https://thelocalarthub.com/signup?role=artist%26ref=${profile?.id}`}
                    className="text-center text-xs font-bold uppercase tracking-widest border border-black px-5 py-3 hover:bg-black hover:text-white transition-colors"
                  >
                    ✉ Invite via Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
          <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></span>
          <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
          </div>
        </footer>

        <GuideButton
          title="Artist Dashboard"
          steps={[
            { title: "Stats Overview", description: "The 4 cards at the top show your total requests, pending count, accepted bookings, and current availability status." },
            { title: "Pending Requests", description: "If you have pending booking requests, they appear prominently in red at the top. Click 'Respond →' to accept or decline each one." },
            { title: "Quick Actions", description: "Use the left panel to jump to editing your profile, managing your portfolio, or setting your availability." },
            { title: "Your Profile", description: "The centre panel shows your public-facing info at a glance. Click 'Edit →' to update it." },
            { title: "Recent Activity", description: "The right panel lists your 5 most recent bookings with their status." },
            { title: "Daily Story", description: "Upload a photo or short video that lives on your profile for 24 hours — a great way to show what you're working on." },
          ]}
        />
      </main>
    );
  }

  // ─── Client Dashboard ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans">
      <NavbarAuth userName={profile?.full_name} />

      <div className="px-8 py-12 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-black pb-8 fade-in-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-2">
              Client Dashboard
            </p>
            <h1 className="text-5xl font-black uppercase leading-none">
              Welcome,<br />{profile?.full_name?.split(" ")[0] || "Friend"}.
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-black border border-black">

          {/* Quick Actions */}
          <div className="bg-[#F2EDE4] p-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <Link href="/artists" className="block bg-black text-white px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors text-center">
                Browse Artists
              </Link>
              <Link href="/dashboard/bookings" className="block border border-[#E5000F] text-[#E5000F] px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#E5000F] hover:text-white transition-colors text-center">
                My Bookings →
              </Link>
              <Link href="/artists?category=Photography" className="block border border-black px-5 py-3 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors text-center">
                Browse by Category →
              </Link>
            </div>
          </div>

          {/* Account Summary */}
          <div className="bg-[#F2EDE4] p-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Your Account</h2>
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
          </div>

          {/* Recent Bookings */}
          <div className="bg-[#F2EDE4] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-black/40">My Bookings</h2>
              <Link href="/dashboard/bookings" className="text-xs font-bold uppercase tracking-widest text-[#E5000F] hover:text-black transition-colors">
                View All →
              </Link>
            </div>
            {bookings.length === 0 ? (
              <p className="text-sm text-black/40">No bookings yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {bookings.map((b) => (
                  <div key={b.id} className="border-b border-black/10 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold uppercase">{b.other_name || "Artist"}</p>
                      <span className={`text-xs font-bold uppercase border px-2 py-0.5 ${statusColor[b.status] || ""}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-black/40 mb-2">{b.event_date ? new Date(b.event_date).toLocaleDateString("en-GB") : "Date TBD"} · {b.duration_hours}h</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite a Friend */}
      <div className="max-w-6xl mx-auto mt-8 border border-black bg-[#F2EDE4] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-1">Grow the Community</p>
          <h2 className="text-xl font-black uppercase leading-tight mb-1">Invite an Artist</h2>
          <p className="text-sm text-black/50">Share The Local Art Hub with a fellow artist — help them get discovered by clients across Italy.</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center border border-black bg-white overflow-hidden">
            <span className="px-4 py-3 text-xs text-black/40 font-mono border-r border-black select-all whitespace-nowrap">
              thelocalarthub.com/artists
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText("https://thelocalarthub.com/artists").then(() => {
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 2500);
                });
              }}
              className="px-5 py-3 text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-[#E5000F] transition-colors whitespace-nowrap"
            >
              {inviteCopied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
          <a
            href={`mailto:?subject=Join me on The Local Art Hub&body=Hey! I found this platform for local artists in Italy — you can sign up and get bookings from clients. Check it out: https://thelocalarthub.com`}
            className="text-center text-xs font-bold uppercase tracking-widest border border-black px-5 py-3 hover:bg-black hover:text-white transition-colors"
          >
            ✉ Invite via Email
          </a>
        </div>
      </div>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></span>
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
          { title: "Your Account", description: "The middle panel shows your name, role, and total number of bookings made." },
          { title: "My Bookings", description: "The right panel shows your 5 most recent bookings with their current status (Pending, Accepted, Declined)." },
          { title: "Settings", description: "Click 'Settings' in the top navigation to update your personal info, password, notifications and privacy." },
        ]}
      />
    </main>
  );
}
