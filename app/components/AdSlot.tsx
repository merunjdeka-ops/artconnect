"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";
import { ADSENSE_CLIENT } from "@/lib/config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type SponsorAd = {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string;
};

// Self-promo fallbacks shown when a slot has no paid sponsor and AdSense
// isn't available. The last one recruits sponsors for the paid slots.
const HOUSE_ADS = [
  { title: "Are you a local artist?", body: "Create a free profile, show your work, get booked.", cta: "Join Free", href: "/signup?role=artist" },
  { title: "What's on near you", body: "Concerts, shows and exhibitions across Italy.", cta: "See Events", href: "/events" },
  { title: "Stories from the Hub", body: "Interviews, guides and local art news on the journal.", cta: "Read the Blog", href: "/blog" },
  { title: "Advertise here", body: "Put your business in front of people who love local art.", cta: "Get in Touch", href: "/contact" },
];

function consentGiven(): boolean {
  try {
    return localStorage.getItem("gac_cookie_consent") === "accepted";
  } catch {
    return false;
  }
}

export default function AdSlot({ slot }: { slot: string }) {
  const [sponsor, setSponsor] = useState<SponsorAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [adsense, setAdsense] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("ads")
        .select("id, title, image_url, link_url")
        .eq("slot", slot)
        .eq("active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("created_at", { ascending: false });
      const ads = (data as SponsorAd[]) || [];
      if (ads.length > 0) {
        setSponsor(ads[Math.floor(Math.random() * ads.length)]);
      } else if (ADSENSE_CLIENT && consentGiven()) {
        setAdsense(true);
      }
      setLoading(false);
    }
    load();
  }, [slot]);

  // Load the AdSense script once, only when actually needed and consented.
  useEffect(() => {
    if (!adsense) return;
    if (!document.querySelector("script[data-adsense]")) {
      const s = document.createElement("script");
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.setAttribute("data-adsense", "1");
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle not ready — the script fills the unit when it loads
    }
  }, [adsense]);

  // Reserve roughly the rendered height so the ad doesn't shift the layout in.
  if (loading) return <div className="min-h-[92px]" aria-hidden="true" />;

  // 1) Paid sponsor banner
  if (sponsor) {
    return (
      <div className="relative border border-black bg-white">
        <span className="absolute top-0 right-0 z-10 bg-black text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1">Sponsored</span>
        <a href={sponsor.link_url} target="_blank" rel="sponsored noopener" className="block">
          <img
            src={cdnUrl(sponsor.image_url, "w_1400,c_limit,q_auto,f_auto")}
            alt={sponsor.title || "Sponsored"}
            loading="lazy"
            decoding="async"
            className="w-full h-auto max-h-48 object-contain"
          />
        </a>
      </div>
    );
  }

  // 2) Google AdSense (configured + consent given)
  if (adsense) {
    return (
      <div className="relative border border-black bg-white min-h-24">
        <span className="absolute top-0 right-0 z-10 bg-black text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1">Ad</span>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // 3) House ad — rotate daily per slot so it doesn't feel static.
  const seed = slot.length + new Date().getDate();
  const house = HOUSE_ADS[seed % HOUSE_ADS.length];
  return (
    <div className="border border-black bg-[#F2EDE4] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-sm font-black uppercase">{house.title}</p>
        <p className="text-xs text-black/50 leading-relaxed mt-1">{house.body}</p>
      </div>
      <Link
        href={house.href}
        className="shrink-0 bg-black text-white text-xs font-bold uppercase tracking-widest px-5 py-3 hover:bg-[#E5000F] transition-colors text-center"
      >
        {house.cta} →
      </Link>
    </div>
  );
}
