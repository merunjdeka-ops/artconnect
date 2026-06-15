"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Provider = "google" | "apple" | "facebook";

const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    label: "Continue with Google",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.61 0 3.06.55 4.21 1.64l3.16-3.16A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
      </svg>
    ),
  },
  // Apple sign-in disabled — requires a paid Apple Developer account.
  // Facebook sign-in disabled — requires a configured Facebook app.
  // Re-add either entry once configured in Supabase.
];

export default function SocialAuthButtons({ role }: { role?: "artist" | "client" }) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  async function handleOAuth(provider: Provider) {
    setLoading(provider);
    setError("");
    try {
      const redirectTo = `${window.location.origin}/auth/callback${role ? `?role=${role}` : ""}`;
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) {
        setError(error.message);
        setLoading(null);
      }
      // On success the browser redirects away — no need to reset loading
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="px-4 py-3 border border-[#E5000F] text-[#E5000F] text-xs uppercase tracking-widest">
          {error}
        </div>
      )}
      {PROVIDERS.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => handleOAuth(p.id)}
          disabled={loading !== null}
          className="flex items-center justify-center gap-3 border border-black bg-white py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          {p.icon}
          {loading === p.id ? "Redirecting..." : p.label}
        </button>
      ))}
    </div>
  );
}
