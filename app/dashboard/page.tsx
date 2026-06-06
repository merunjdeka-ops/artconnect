"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import { getSupabase } from "@/lib/supabase";

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
  is_deactivated: boolean;
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [togglingDeactivate, setTogglingDeactivate] = useState(false);

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

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const res = await fetch("/api/delete-account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete account");

      await supabase.auth.signOut();
      router.push("/");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  async function handleToggleDeactivate() {
    setTogglingDeactivate(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newVal = !profile?.is_deactivated;
      await supabase.from("profiles").update({ is_deactivated: newVal }).eq("id", user.id);
      setProfile(prev => prev ? { ...prev, is_deactivated: newVal } : prev);
    } finally {
      setTogglingDeactivate(false);
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
              <p className="text-xs text-white/60">Your profile is hidden from clients. No one can find or book you until you reactivate.</p>
            </div>
            <button
              onClick={handleToggleDeactivate}
              disabled={togglingDeactivate}
              className="shrink-0 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            >
              {togglingDeactivate ? "Reactivating..." : "Reactivate Account"}
            </button>
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

      {/* DANGER ZONE */}
      <div className="px-8 max-w-6xl mx-auto mt-16 mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-black/30 mb-4">Account Settings</p>
        <div className="border border-black/20 divide-y divide-black/10">

          {/* Deactivate / Reactivate */}
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase mb-1">
                {profile?.is_deactivated ? "Reactivate Account" : "Deactivate Account"}
              </p>
              <p className="text-xs text-black/50">
                {profile?.is_deactivated
                  ? "Your profile is currently hidden. Click to make it visible to clients again."
                  : "Temporarily hide your profile from clients. You can reactivate anytime. Your data is kept safe."}
              </p>
            </div>
            <button
              onClick={handleToggleDeactivate}
              disabled={togglingDeactivate}
              className={`shrink-0 text-xs font-bold uppercase tracking-widest px-6 py-3 transition-colors disabled:opacity-50 border ${
                profile?.is_deactivated
                  ? "bg-black text-white border-black hover:bg-[#E5000F] hover:border-[#E5000F]"
                  : "border-black text-black hover:bg-black hover:text-white"
              }`}
            >
              {togglingDeactivate
                ? "Saving..."
                : profile?.is_deactivated ? "Reactivate" : "Deactivate"}
            </button>
          </div>

          {/* Delete */}
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-[#E5000F] mb-1">Delete Account</p>
              <p className="text-xs text-black/50">Permanently delete your account and all your data. This cannot be undone.</p>
            </div>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirm(""); setDeleteError(""); }}
              className="shrink-0 border border-[#E5000F] text-[#E5000F] text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-[#E5000F] hover:text-white transition-colors"
            >
              Delete Account
            </button>
          </div>

        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#F2EDE4] border border-black max-w-md w-full p-8 fade-in-up">
            <h2 className="text-xl font-black uppercase mb-2">Delete Account</h2>
            <p className="text-sm text-black/60 mb-6 leading-relaxed">
              This will permanently delete your account, profile, portfolio, and all bookings.
              This action <strong>cannot be undone</strong>.
            </p>

            <p className="text-xs font-bold uppercase tracking-widest mb-2">
              Type <span className="text-[#E5000F]">DELETE</span> to confirm
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors mb-4 bg-white placeholder:text-black/30"
            />

            {deleteError && (
              <p className="text-xs text-[#E5000F] uppercase tracking-widest mb-4">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-black py-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "DELETE" || deleting}
                className="flex-1 bg-[#E5000F] text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Yes, Delete Everything"}
              </button>
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
    </main>
  );
}
