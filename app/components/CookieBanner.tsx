"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "gac_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable (private mode) — don't block the page
    }
  }, []);

  function choose(value: "accepted" | "essential") {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-black text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t-2 border-[#E5000F]">
      <p className="text-xs leading-relaxed text-white/80 max-w-2xl">
        We use cookies that are essential for the platform to work (login sessions, security).
        We do not use advertising or third-party tracking cookies. Read more in our{" "}
        <Link href="/privacy" className="underline text-white hover:text-[#E5000F]">Privacy Policy</Link>.
      </p>
      <div className="flex gap-3 shrink-0">
        <button
          onClick={() => choose("essential")}
          className="px-5 py-2.5 border border-white/40 text-xs font-bold uppercase tracking-widest hover:border-white transition-colors"
        >
          Essential Only
        </button>
        <button
          onClick={() => choose("accepted")}
          className="px-5 py-2.5 bg-[#E5000F] text-white text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
