"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept(level: "all" | "essential") {
    localStorage.setItem("cookie_consent", level);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-sm leading-relaxed">
          We use cookies to improve your experience. By continuing, you accept our use of cookies.{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-[#E5000F] transition-colors"
          >
            Privacy Policy
          </Link>{" "}
          &amp;{" "}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-[#E5000F] transition-colors"
          >
            Terms
          </Link>
          .
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => accept("essential")}
            className="text-xs font-bold uppercase tracking-widest border border-white px-5 py-2 hover:bg-white hover:text-black transition-colors"
          >
            Essential Only
          </button>
          <button
            onClick={() => accept("all")}
            className="text-xs font-bold uppercase tracking-widest bg-[#E5000F] px-5 py-2 hover:opacity-90 transition-opacity"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
