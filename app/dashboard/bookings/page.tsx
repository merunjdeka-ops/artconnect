"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import { getSupabase } from "@/lib/supabase";

type Booking = {
  id: string;
  event_date: string | null;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  duration_hours: number | null;
  package_name: string | null;
  package_price: number | null;
  created_at: string;
  other_name: string;
  other_email: string | null;
  other_phone: string | null;
  other_id: string;
};

const STATUS_STYLE: Record<string, string> = {
  pending:  "border-yellow-500 text-yellow-600 bg-yellow-50",
  accepted: "border-green-600 text-green-700 bg-green-50",
  declined: "border-[#E5000F] text-[#E5000F] bg-red-50",
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"artist" | "client">("client");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
      if (!profile) { router.push("/dashboard"); return; }

      setRole(profile.role);
      setUserName(profile.full_name || "");
      setUserId(user.id);

      if (profile.role === "artist") {
        const { data } = await supabase
          .from("bookings")
          .select("id, event_date, message, status, duration_hours, package_name, package_price, created_at, client:client_id(id, full_name, email, phone_number)")
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false });

        setBookings((data || []).map((b: any) => ({
          ...b,
          other_name: b.client?.full_name || "Unknown",
          other_email: b.client?.email || null,
          other_phone: b.client?.phone_number || null,
          other_id: b.client?.id || "",
        })));
      } else {
        const { data } = await supabase
          .from("bookings")
          .select("id, event_date, message, status, duration_hours, package_name, package_price, created_at, artist:artist_id(id, full_name, email, phone_number)")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false });

        setBookings((data || []).map((b: any) => ({
          ...b,
          other_name: b.artist?.full_name || "Unknown",
          other_email: b.artist?.email || null,
          other_phone: b.artist?.phone_number || null,
          other_id: b.artist?.id || "",
        })));
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function updateStatus(bookingId: string, status: "accepted" | "declined", booking: Booking) {
    setActing(bookingId);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));

      // Send email notification to client
      if (booking.other_email) {
        const { data: { user } } = await supabase.auth.getUser();
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: status === "accepted" ? "booking_accepted" : "booking_declined",
            to: booking.other_email,
            artistName: userName,
            clientName: booking.other_name,
            date: booking.event_date || "",
            packageName: booking.package_name || undefined,
            packagePrice: booking.package_price || undefined,
            durationHours: booking.duration_hours || undefined,
            otherPhone: booking.other_phone || undefined,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  }

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    accepted: bookings.filter(b => b.status === "accepted").length,
    declined: bookings.filter(b => b.status === "declined").length,
  };

  if (loading) return (
    <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
      <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans text-black">
      <NavbarAuth userName={userName} />

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex items-end justify-between mb-10 border-b border-black pb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-2">
              {role === "artist" ? "Artist" : "Client"} Dashboard
            </p>
            <h1 className="text-5xl font-black uppercase leading-none">Bookings</h1>
          </div>
          <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest border border-black px-5 py-3 hover:bg-black hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(["all", "pending", "accepted", "declined"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
                filter === f ? "bg-black text-white border-black" : "border-black hover:bg-black hover:text-white"
              }`}
            >
              {f} {counts[f] > 0 && <span className={`ml-1 ${filter === f ? "text-white/60" : "text-black/40"}`}>({counts[f]})</span>}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="border border-black p-12 text-center">
            <p className="font-black uppercase text-xl mb-2">No {filter !== "all" ? filter : ""} bookings</p>
            <p className="text-sm text-black/40 uppercase tracking-widest">
              {role === "artist" ? "Booking requests from clients will appear here." : "Your booking requests appear here."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-px bg-black border border-black">
            {filtered.map(booking => (
              <div key={booking.id} className="bg-[#F2EDE4] p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: booking info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="font-black uppercase text-base">{booking.other_name}</h3>
                      <span className={`text-xs font-bold uppercase border px-2 py-0.5 tracking-widest ${STATUS_STYLE[booking.status]}`}>
                        {booking.status}
                      </span>
                      {booking.package_name && (
                        <span className="text-xs bg-black text-white px-2 py-0.5 font-bold uppercase tracking-widest">
                          {booking.package_name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-black/40 uppercase tracking-widest">Date</p>
                        <p className="text-sm font-bold mt-0.5">
                          {booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBD"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-black/40 uppercase tracking-widest">Duration</p>
                        <p className="text-sm font-bold mt-0.5">{booking.duration_hours ? `${booking.duration_hours}h` : "—"}</p>
                      </div>
                      {booking.package_price && (
                        <div>
                          <p className="text-xs text-black/40 uppercase tracking-widest">Price</p>
                          <p className="text-sm font-bold mt-0.5 text-[#E5000F]">€{booking.package_price}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-black/40 uppercase tracking-widest">Received</p>
                        <p className="text-sm font-bold mt-0.5">{new Date(booking.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                      </div>
                    </div>

                    {booking.message && (
                      <div className="border-l-2 border-[#E5000F] pl-4">
                        <p className="text-xs text-black/40 uppercase tracking-widest mb-1">Message</p>
                        <p className="text-sm text-black/70 leading-relaxed">{booking.message}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 mt-3">
                      {booking.other_email && (
                        <a href={`mailto:${booking.other_email}`} className="text-xs text-black/40 hover:text-[#E5000F] uppercase tracking-widest transition-colors">
                          ✉ {booking.other_email}
                        </a>
                      )}
                      {booking.status === "accepted" && booking.other_phone && (
                        <a href={`tel:${booking.other_phone}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 border border-green-600 bg-green-50 px-3 py-1 hover:bg-green-700 hover:text-white transition-colors uppercase tracking-widest">
                          📞 {booking.other_phone}
                        </a>
                      )}
                      {booking.status === "accepted" && !booking.other_phone && (
                        <span className="text-xs text-black/30 uppercase tracking-widest italic">
                          No phone number on file
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex md:flex-col gap-3 shrink-0">
                    {/* Artist: accept / decline pending */}
                    {role === "artist" && booking.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatus(booking.id, "accepted", booking)}
                          disabled={acting === booking.id}
                          className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {acting === booking.id ? "..." : "✓ Accept"}
                        </button>
                        <button
                          onClick={() => updateStatus(booking.id, "declined", booking)}
                          disabled={acting === booking.id}
                          className="px-6 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] hover:text-white hover:border-[#E5000F] transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {acting === booking.id ? "..." : "✕ Decline"}
                        </button>
                      </>
                    )}

                    {/* Both parties: cancellation request on accepted bookings */}
                    {booking.status === "accepted" && (() => {
                      const subject = encodeURIComponent(`Cancellation Request — Booking #${booking.id.slice(0, 8).toUpperCase()}`);
                      const body = encodeURIComponent(
                        `Hello ArtConnect Support,\n\nI would like to request a cancellation for the following booking:\n\n` +
                        `Booking ID: ${booking.id}\n` +
                        `${role === "artist" ? "Client" : "Artist"}: ${booking.other_name}\n` +
                        `Date: ${booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "TBD"}\n` +
                        (booking.package_name ? `Package: ${booking.package_name}\n` : "") +
                        (booking.package_price ? `Price: €${booking.package_price}\n` : "") +
                        `\nReason for cancellation:\n[Please describe your reason here]\n\nThank you.`
                      );
                      return (
                        <a
                          href={`mailto:help@goartconnect.com?subject=${subject}&body=${body}`}
                          className="px-5 py-3 border border-black/30 text-xs font-bold uppercase tracking-widest text-black/50 hover:border-[#E5000F] hover:text-[#E5000F] transition-colors whitespace-nowrap text-center"
                        >
                          Request Cancellation
                        </a>
                      );
                    })()}

                    {/* Client: link to artist profile */}
                    {role === "client" && (
                      <Link
                        href={`/artists/${booking.other_id}`}
                        className="shrink-0 text-xs font-bold uppercase tracking-widest border border-black px-5 py-3 hover:bg-black hover:text-white transition-colors text-center"
                      >
                        View Artist →
                      </Link>
                    )}
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="px-8 py-6 flex items-center justify-between border-t border-black mt-12">
        <span className="text-sm font-black uppercase tracking-tight">ArtConnect</span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black">Terms</Link>
          <Link href="/privacy" className="hover:text-black">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
