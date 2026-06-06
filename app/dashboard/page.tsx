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

        {/* Profile incomplete warning for artists */}
        {isArtist && !profileComplete && (
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
