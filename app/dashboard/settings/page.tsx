"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavbarAuth from "@/app/components/NavbarAuth";
import GuideButton from "@/app/components/GuideButton";
import { getSupabase } from "@/lib/supabase";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "it", label: "Italian — Italiano" },
  { code: "fr", label: "French — Français" },
  { code: "de", label: "German — Deutsch" },
  { code: "es", label: "Spanish — Español" },
  { code: "pt", label: "Portuguese — Português" },
  { code: "ar", label: "Arabic — العربية" },
  { code: "zh", label: "Chinese — 中文" },
];

const SECTIONS = [
  { id: "personal",       label: "Personal Info" },
  { id: "account",        label: "Account" },
  { id: "notifications",  label: "Notifications" },
  { id: "preferences",    label: "Preferences" },
  { id: "privacy",        label: "Privacy & Safety" },
  { id: "danger",         label: "Deactivate / Delete" },
];

type Profile = {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  address: string | null;
  language: string | null;
  is_available: boolean;
  is_deactivated: boolean;
  notification_bookings: boolean;
  notification_reviews: boolean;
  notification_marketing: boolean;
  profile_visibility: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("personal");

  // Personal
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalMsg, setPersonalMsg] = useState("");

  // Account
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  // Notifications
  const [notifBookings, setNotifBookings] = useState(true);
  const [notifReviews, setNotifReviews] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");

  // Preferences
  const [language, setLanguage] = useState("en");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState("");

  // Privacy
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState("");

  // Danger zone
  const [togglingDeactivate, setTogglingDeactivate] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Don't redirect if profile is null — just show empty fields
      if (prof) {
        setProfile(prof);
        setFullName(prof.full_name || "");
        setPhone(prof.phone || "");
        setLocation(prof.location || "");
        setAddress(prof.address || "");
        setEmail(prof.email || user.email || "");
        setLanguage(prof.language || "en");
        setNotifBookings(prof.notification_bookings ?? true);
        setNotifReviews(prof.notification_reviews ?? true);
        setNotifMarketing(prof.notification_marketing ?? false);
        setProfileVisibility(prof.profile_visibility || "public");
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function savePersonal() {
    if (!userId) return;
    setSavingPersonal(true);
    setPersonalMsg("");
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        phone,
        location,
        address,
      }, { onConflict: "id" });
      if (error) throw error;
      setProfile(p => p ? { ...p, full_name: fullName, phone, location, address } : p);
      setPersonalMsg("Saved successfully.");
    } catch (e: unknown) {
      setPersonalMsg("Failed to save: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingPersonal(false);
      setTimeout(() => setPersonalMsg(""), 5000);
    }
  }

  async function savePassword() {
    setSavingPassword(true);
    setPasswordMsg("");
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match.");
      setSavingPassword(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg("Password must be at least 8 characters.");
      setSavingPassword(false);
      return;
    }
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password updated successfully.");
    } catch {
      setPasswordMsg("Failed to update password. Try logging out and back in first.");
    } finally {
      setSavingPassword(false);
      setTimeout(() => setPasswordMsg(""), 4000);
    }
  }

  async function saveNotifications() {
    if (!userId) return;
    setSavingNotif(true);
    setNotifMsg("");
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        notification_bookings: notifBookings,
        notification_reviews: notifReviews,
        notification_marketing: notifMarketing,
      }, { onConflict: "id" });
      if (error) throw error;
      setNotifMsg("Preferences saved.");
    } catch (e: unknown) {
      setNotifMsg("Failed to save: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingNotif(false);
      setTimeout(() => setNotifMsg(""), 5000);
    }
  }

  async function savePreferences() {
    if (!userId) return;
    setSavingPrefs(true);
    setPrefsMsg("");
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        language,
      }, { onConflict: "id" });
      if (error) throw error;
      setPrefsMsg("Preferences saved.");
    } catch (e: unknown) {
      setPrefsMsg("Failed to save: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingPrefs(false);
      setTimeout(() => setPrefsMsg(""), 5000);
    }
  }

  async function savePrivacy() {
    if (!userId) return;
    setSavingPrivacy(true);
    setPrivacyMsg("");
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        profile_visibility: profileVisibility,
      }, { onConflict: "id" });
      if (error) throw error;
      setPrivacyMsg("Privacy settings saved.");
    } catch (e: unknown) {
      setPrivacyMsg("Failed to save: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingPrivacy(false);
      setTimeout(() => setPrivacyMsg(""), 5000);
    }
  }

  async function handleToggleDeactivate() {
    if (!userId) return;
    setTogglingDeactivate(true);
    try {
      const supabase = getSupabase();
      const newVal = !profile?.is_deactivated;
      await supabase.from("profiles").upsert({ id: userId, is_deactivated: newVal }, { onConflict: "id" });
      setProfile(p => p ? { ...p, is_deactivated: newVal } : p);
    } finally {
      setTogglingDeactivate(false);
    }
  }

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

  if (loading) return (
    <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
      <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
    </main>
  );

  const isDeactivated = profile?.is_deactivated;

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans text-black">
      <NavbarAuth userName={profile?.full_name} />

      <div className="max-w-6xl mx-auto px-8 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-2 fade-in-up">Account</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-10 fade-in-up fade-in-up-1">Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-black border border-black">

          {/* SIDEBAR */}
          <div className="bg-[#F2EDE4] lg:border-r border-black">
            <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-left whitespace-nowrap transition-colors border-b border-black/10 w-full ${
                    activeSection === s.id
                      ? "bg-black text-white"
                      : "hover:bg-black/5"
                  } ${s.id === "danger" ? "text-[#E5000F]" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>

          {/* CONTENT */}
          <div className="lg:col-span-3 bg-[#F2EDE4] p-8">

            {/* ── PERSONAL INFO ── */}
            {activeSection === "personal" && (
              <div className="fade-in-up">
                <h2 className="text-xl font-black uppercase mb-1">Personal Information</h2>
                <p className="text-xs text-black/40 uppercase tracking-widest mb-8">Your name, contact details and location.</p>

                <div className="flex flex-col gap-5 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+39 333 123 4567"
                      className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="City, Country (e.g. Milan, Italy)"
                      className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                    />
                    <p className="text-xs text-black/40 mt-1">Changing your location updates where you appear in artist searches.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Street Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Via Roma 12, 20100 Milan"
                      className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                    />
                    <p className="text-xs text-black/40 mt-1">Private — not shown publicly.</p>
                  </div>

                  {personalMsg && (
                    <p className={`text-xs uppercase tracking-widest ${personalMsg.includes("Failed") ? "text-[#E5000F]" : "text-green-700"}`}>
                      {personalMsg}
                    </p>
                  )}

                  <button
                    onClick={savePersonal}
                    disabled={savingPersonal}
                    className="py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
                  >
                    {savingPersonal ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ── ACCOUNT ── */}
            {activeSection === "account" && (
              <div className="fade-in-up">
                <h2 className="text-xl font-black uppercase mb-1">Account</h2>
                <p className="text-xs text-black/40 uppercase tracking-widest mb-8">Your email address and password.</p>

                <div className="flex flex-col gap-8 max-w-lg">
                  {/* Email — read only */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full border border-black/30 px-4 py-3 bg-black/5 text-sm text-black/50 cursor-not-allowed"
                    />
                    <p className="text-xs text-black/40 mt-1">To change your email contact support.</p>
                  </div>

                  {/* Password */}
                  <div className="border-t border-black/10 pt-8">
                    <h3 className="text-sm font-black uppercase mb-5">Change Password</h3>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors placeholder:text-black/30"
                        />
                      </div>

                      {passwordMsg && (
                        <p className={`text-xs uppercase tracking-widest ${passwordMsg.includes("Failed") || passwordMsg.includes("match") || passwordMsg.includes("least") ? "text-[#E5000F]" : "text-green-700"}`}>
                          {passwordMsg}
                        </p>
                      )}

                      <button
                        onClick={savePassword}
                        disabled={savingPassword || !newPassword}
                        className="py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
                      >
                        {savingPassword ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="border-t border-black/10 pt-8">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Account Type</label>
                    <div className="inline-block border border-black px-4 py-2 text-xs font-bold uppercase tracking-widest">
                      {profile?.role === "artist" ? "Artist" : "Client"}
                    </div>
                    <p className="text-xs text-black/40 mt-2">To switch account type, contact support.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeSection === "notifications" && (
              <div className="fade-in-up">
                <h2 className="text-xl font-black uppercase mb-1">Notifications</h2>
                <p className="text-xs text-black/40 uppercase tracking-widest mb-8">Choose what emails you want to receive.</p>

                <div className="flex flex-col gap-4 max-w-lg">
                  {[
                    {
                      label: "Booking requests & updates",
                      desc: "Get emailed when you receive a booking request or when its status changes.",
                      val: notifBookings,
                      set: setNotifBookings,
                    },
                    {
                      label: "Reviews & ratings",
                      desc: "Get emailed when a client leaves you a review.",
                      val: notifReviews,
                      set: setNotifReviews,
                    },
                    {
                      label: "Platform news & tips",
                      desc: "Occasional emails about new features and tips for artists.",
                      val: notifMarketing,
                      set: setNotifMarketing,
                    },
                  ].map(item => (
                    <label key={item.label} className="flex items-start gap-4 border border-black p-5 cursor-pointer hover:bg-black/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={item.val}
                        onChange={e => item.set(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-black shrink-0"
                      />
                      <div>
                        <p className="text-sm font-black uppercase">{item.label}</p>
                        <p className="text-xs text-black/50 mt-1">{item.desc}</p>
                      </div>
                    </label>
                  ))}

                  {notifMsg && (
                    <p className={`text-xs uppercase tracking-widest ${notifMsg.includes("Failed") ? "text-[#E5000F]" : "text-green-700"}`}>
                      {notifMsg}
                    </p>
                  )}

                  <button
                    onClick={saveNotifications}
                    disabled={savingNotif}
                    className="py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
                  >
                    {savingNotif ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </div>
            )}

            {/* ── PREFERENCES ── */}
            {activeSection === "preferences" && (
              <div className="fade-in-up">
                <h2 className="text-xl font-black uppercase mb-1">Preferences</h2>
                <p className="text-xs text-black/40 uppercase tracking-widest mb-8">Language and display settings.</p>

                <div className="flex flex-col gap-5 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full border border-black px-4 py-3 bg-white text-sm outline-none focus:border-[#E5000F] transition-colors"
                    >
                      {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-black/40 mt-1">Sets your preferred language for the platform interface.</p>
                  </div>

                  {prefsMsg && (
                    <p className={`text-xs uppercase tracking-widest ${prefsMsg.includes("Failed") ? "text-[#E5000F]" : "text-green-700"}`}>
                      {prefsMsg}
                    </p>
                  )}

                  <button
                    onClick={savePreferences}
                    disabled={savingPrefs}
                    className="py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
                  >
                    {savingPrefs ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </div>
            )}

            {/* ── PRIVACY ── */}
            {activeSection === "privacy" && (
              <div className="fade-in-up">
                <h2 className="text-xl font-black uppercase mb-1">Privacy & Safety</h2>
                <p className="text-xs text-black/40 uppercase tracking-widest mb-8">Control who can see your profile and contact you.</p>

                <div className="flex flex-col gap-5 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-3">Profile Visibility</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { val: "public",   label: "Public",         desc: "Anyone can find and view your profile." },
                        { val: "unlisted", label: "Unlisted",       desc: "Only people with your direct link can view your profile." },
                        { val: "private",  label: "Private",        desc: "Your profile is completely hidden from everyone." },
                      ].map(opt => (
                        <label key={opt.val} className={`flex items-start gap-4 border p-4 cursor-pointer transition-colors ${profileVisibility === opt.val ? "border-black bg-black/5" : "border-black/20 hover:border-black"}`}>
                          <input
                            type="radio"
                            name="visibility"
                            value={opt.val}
                            checked={profileVisibility === opt.val}
                            onChange={() => setProfileVisibility(opt.val)}
                            className="mt-1 accent-black"
                          />
                          <div>
                            <p className="text-sm font-black uppercase">{opt.label}</p>
                            <p className="text-xs text-black/50 mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border border-black/10 p-5 bg-white">
                    <p className="text-xs font-bold uppercase tracking-widest mb-2">Your Data Rights (GDPR)</p>
                    <p className="text-xs text-black/50 leading-relaxed">
                      You have the right to access, export, or delete all personal data we hold about you.
                      To request a data export, email us at <span className="font-bold">goartconnect@gmail.com</span>.
                      To delete all data permanently, use the Delete Account option.
                    </p>
                  </div>

                  {privacyMsg && (
                    <p className={`text-xs uppercase tracking-widest ${privacyMsg.includes("Failed") ? "text-[#E5000F]" : "text-green-700"}`}>
                      {privacyMsg}
                    </p>
                  )}

                  <button
                    onClick={savePrivacy}
                    disabled={savingPrivacy}
                    className="py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors disabled:opacity-50"
                  >
                    {savingPrivacy ? "Saving..." : "Save Privacy Settings"}
                  </button>
                </div>
              </div>
            )}

            {/* ── DANGER ZONE ── */}
            {activeSection === "danger" && (
              <div className="fade-in-up">
                <h2 className="text-xl font-black uppercase mb-1">Deactivate / Delete</h2>
                <p className="text-xs text-black/40 uppercase tracking-widest mb-8">Manage the status of your account.</p>

                <div className="flex flex-col gap-6 max-w-lg">

                  {/* Deactivate */}
                  <div className="border border-black p-6">
                    <p className="text-sm font-black uppercase mb-1">
                      {isDeactivated ? "Your account is deactivated" : "Deactivate Account"}
                    </p>
                    <p className="text-xs text-black/50 leading-relaxed mb-5">
                      {isDeactivated
                        ? "Your profile is currently hidden from all clients. No one can find or book you. Your data is completely safe. Click below to reactivate anytime."
                        : "Temporarily hide your profile from all clients. You can come back and reactivate at any time. All your data — portfolio, bookings, reviews — is kept safe."}
                    </p>
                    <button
                      onClick={handleToggleDeactivate}
                      disabled={togglingDeactivate}
                      className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${
                        isDeactivated
                          ? "bg-black text-white hover:bg-[#E5000F]"
                          : "border border-black hover:bg-black hover:text-white"
                      }`}
                    >
                      {togglingDeactivate
                        ? "Saving..."
                        : isDeactivated ? "Reactivate My Account" : "Deactivate My Account"}
                    </button>
                  </div>

                  {/* Delete */}
                  <div className="border border-[#E5000F]/40 p-6">
                    <p className="text-sm font-black uppercase text-[#E5000F] mb-1">Permanently Delete Account</p>
                    <p className="text-xs text-black/50 leading-relaxed mb-5">
                      This will permanently erase your account, profile, portfolio, bookings, and reviews.
                      There is no recovery. This cannot be undone.
                    </p>
                    <button
                      onClick={() => { setShowDeleteModal(true); setDeleteConfirm(""); setDeleteError(""); }}
                      className="w-full py-3 border border-[#E5000F] text-[#E5000F] text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] hover:text-white transition-colors"
                    >
                      Delete My Account
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#F2EDE4] border border-black max-w-md w-full p-8 fade-in-up">
            <h2 className="text-xl font-black uppercase mb-2">Final Warning</h2>
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

      <GuideButton
        title="Settings Guide"
        steps={[
          { title: "Personal Info", description: "Update your full name, phone number, location and street address. Changing location updates where you appear in artist searches." },
          { title: "Account", description: "Your email is shown here (read-only). Use this section to set a new password — enter it twice to confirm." },
          { title: "Notifications", description: "Choose which emails you receive — booking updates, review alerts, and platform news. Toggle each on or off." },
          { title: "Preferences", description: "Set your preferred language for the platform interface." },
          { title: "Privacy & Safety", description: "Control who can see your profile: Public (everyone), Unlisted (direct link only), or Private (hidden from all)." },
          { title: "Deactivate Account", description: "Temporarily hide your profile from all clients. Your data is kept safe. Reactivate any time from this same page." },
          { title: "Delete Account", description: "Permanently erase your account and all data. This cannot be undone. You must type DELETE to confirm." },
        ]}
      />
    </main>
  );
}

