"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavbarAuth from "@/app/components/NavbarAuth";
import { getSupabase } from "@/lib/supabase";

type AvailabilityPeriod = {
  id: string;
  start_date: string;
  end_date: string;
  hours_from: string;  // "09:00"
  hours_to: string;    // "18:00"
  days_of_week: number[]; // 0=Sun,1=Mon,...,6=Sat
  note: string;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function newPeriod(): AvailabilityPeriod {
  return {
    id: crypto.randomUUID(),
    start_date: "",
    end_date: "",
    hours_from: "09:00",
    hours_to: "18:00",
    days_of_week: [1, 2, 3, 4, 5], // Mon–Fri default
    note: "",
  };
}

function formatDateRange(p: AvailabilityPeriod) {
  const s = p.start_date ? new Date(p.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const e = p.end_date ? new Date(p.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  return p.start_date === p.end_date || !p.end_date ? s : `${s} → ${e}`;
}

function daysLabel(days: number[]) {
  if (days.length === 7) return "Every day";
  if (JSON.stringify(days) === JSON.stringify([1,2,3,4,5])) return "Mon – Fri";
  if (JSON.stringify(days) === JSON.stringify([0,6])) return "Weekends";
  return days.map(d => DAY_LABELS[d]).join(", ");
}

export default function AvailabilityPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AvailabilityPeriod | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name, role, availability_schedule").eq("id", user.id).single();
      if (profile?.role !== "artist") { router.push("/dashboard"); return; }
      setUserName(profile.full_name || "");
      setPeriods(profile.availability_schedule || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function savePeriods(updated: AvailabilityPeriod[]) {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbErr } = await supabase.from("profiles").update({ availability_schedule: updated }).eq("id", user!.id);
      if (dbErr) throw dbErr;
      setPeriods(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function startAdd() {
    const p = newPeriod();
    setDraft(p);
    setEditingId(p.id);
  }

  function startEdit(p: AvailabilityPeriod) {
    setDraft({ ...p });
    setEditingId(p.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function commitDraft() {
    if (!draft) return;
    if (!draft.start_date) { setError("Start date is required."); return; }
    if (draft.end_date && draft.end_date < draft.start_date) { setError("End date must be on or after start date."); return; }
    if (draft.days_of_week.length === 0) { setError("Select at least one day of the week."); return; }

    const exists = periods.find(p => p.id === draft.id);
    const updated = exists
      ? periods.map(p => p.id === draft.id ? draft : p)
      : [...periods, draft];

    setEditingId(null);
    setDraft(null);
    await savePeriods(updated);
  }

  async function deletePeriod(id: string) {
    await savePeriods(periods.filter(p => p.id !== id));
  }

  function toggleDay(day: number) {
    if (!draft) return;
    const has = draft.days_of_week.includes(day);
    setDraft({ ...draft, days_of_week: has ? draft.days_of_week.filter(d => d !== day) : [...draft.days_of_week, day].sort() });
  }

  if (loading) return (
    <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
      <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans text-black">
      <NavbarAuth userName={userName} />

      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="flex items-end justify-between mb-10 border-b border-black pb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-2">Artist Dashboard</p>
            <h1 className="text-5xl font-black uppercase leading-none">Availability</h1>
            <p className="text-sm text-black/50 mt-3">Set the dates and hours you're open to bookings. Clients will see these when they request a session.</p>
          </div>
          <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest border border-black px-5 py-3 hover:bg-black hover:text-white transition-colors shrink-0">
            ← Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">{error}</div>
        )}
        {saved && (
          <div className="mb-6 px-4 py-3 border border-green-600 text-green-700 text-xs uppercase tracking-widest">✓ Saved successfully</div>
        )}

        {/* Existing periods */}
        {periods.length > 0 && (
          <div className="flex flex-col gap-px bg-black border border-black mb-8">
            {periods.map(p => (
              <div key={p.id} className="bg-[#F2EDE4]">
                {editingId === p.id && draft ? (
                  <EditForm
                    draft={draft}
                    setDraft={setDraft}
                    onSave={commitDraft}
                    onCancel={cancelEdit}
                    saving={saving}
                    toggleDay={toggleDay}
                  />
                ) : (
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <span className="font-black uppercase text-sm">{formatDateRange(p)}</span>
                        <span className="text-xs bg-black text-white px-2 py-0.5 font-bold uppercase tracking-widest">
                          {p.hours_from} – {p.hours_to}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-xs text-black/50 uppercase tracking-widest">{daysLabel(p.days_of_week)}</span>
                        {p.note && <span className="text-xs text-black/40 italic">"{p.note}"</span>}
                      </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => startEdit(p)} className="text-xs text-black/50 uppercase tracking-widest hover:text-black transition-colors">Edit</button>
                      <button onClick={() => deletePeriod(p.id)} className="text-xs text-[#E5000F] uppercase tracking-widest hover:underline">Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new period form */}
        {editingId === draft?.id && !periods.find(p => p.id === draft?.id) ? (
          <div className="border border-black bg-white">
            <div className="px-6 pt-5 pb-2 border-b border-black/10">
              <p className="text-xs font-bold uppercase tracking-widest text-black/40">New Availability Window</p>
            </div>
            {draft && (
              <EditForm
                draft={draft}
                setDraft={setDraft}
                onSave={commitDraft}
                onCancel={cancelEdit}
                saving={saving}
                toggleDay={toggleDay}
              />
            )}
          </div>
        ) : (
          <button
            onClick={startAdd}
            className="w-full py-4 border-2 border-dashed border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
          >
            + Add Availability Window
          </button>
        )}

        {periods.length === 0 && !editingId && (
          <p className="text-center text-sm text-black/30 uppercase tracking-widest mt-8">
            No availability set yet. Add a window so clients know when to book you.
          </p>
        )}
      </div>

      <footer className="px-8 py-6 flex items-center justify-between border-t border-black mt-12">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F] italic">go</span><span className="uppercase">ARTCONNECT</span></span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black">Terms</Link>
          <Link href="/privacy" className="hover:text-black">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}

function EditForm({
  draft, setDraft, onSave, onCancel, saving, toggleDay,
}: {
  draft: AvailabilityPeriod;
  setDraft: (p: AvailabilityPeriod) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  toggleDay: (d: number) => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 flex flex-col gap-5">

      {/* Date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2">Start Date *</label>
          <input
            type="date"
            required
            min={today}
            value={draft.start_date}
            onChange={e => setDraft({
              ...draft,
              start_date: e.target.value,
              end_date: draft.end_date && draft.end_date < e.target.value ? e.target.value : draft.end_date,
            })}
            className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2">End Date</label>
          <input
            type="date"
            min={draft.start_date || today}
            value={draft.end_date}
            onChange={e => setDraft({ ...draft, end_date: e.target.value })}
            className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent"
          />
        </div>
      </div>

      {/* Working hours */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-3">Working Hours</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-black/40 mb-1 uppercase tracking-widest">From</p>
            <input
              type="time"
              value={draft.hours_from}
              onChange={e => setDraft({ ...draft, hours_from: e.target.value })}
              className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent"
            />
          </div>
          <div>
            <p className="text-xs text-black/40 mb-1 uppercase tracking-widest">To</p>
            <input
              type="time"
              value={draft.hours_to}
              onChange={e => setDraft({ ...draft, hours_to: e.target.value })}
              className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Days of week */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-3">Days Available</label>
        <div className="flex gap-2 flex-wrap">
          {ALL_DAYS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`w-12 h-10 text-xs font-bold uppercase tracking-wide border transition-colors ${
                draft.days_of_week.includes(d)
                  ? "bg-black text-white border-black"
                  : "border-black/30 text-black/40 hover:border-black hover:text-black"
              }`}
            >
              {DAY_LABELS[d]}
            </button>
          ))}
        </div>
        {/* Quick-select presets */}
        <div className="flex gap-2 mt-2">
          {[
            { label: "Mon–Fri", days: [1,2,3,4,5] },
            { label: "Weekends", days: [0,6] },
            { label: "Every day", days: [0,1,2,3,4,5,6] },
          ].map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setDraft({ ...draft, days_of_week: preset.days })}
              className="text-xs text-black/40 uppercase tracking-widest border border-black/20 px-3 py-1.5 hover:border-black hover:text-black transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2">
          Note <span className="text-black/30 normal-case font-normal">— optional, shown to clients</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Available for outdoor shoots, weddings only, etc."
          value={draft.note}
          onChange={e => setDraft({ ...draft, note: e.target.value })}
          className="w-full border border-black px-4 py-3 text-sm outline-none focus:border-[#E5000F] transition-colors bg-transparent placeholder:text-black/30"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Window"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

