"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    async function guard() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?next=/admin"); return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      setState(profile?.is_admin ? "ok" : "denied");
    }
    guard();
  }, [router]);

  if (state === "checking") {
    return (
      <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-black/40">Checking access...</p>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className="min-h-screen bg-[#F2EDE4] flex items-center justify-center px-6">
        <div className="border border-black bg-white p-10 max-w-md w-full text-center">
          <p className="font-black uppercase text-[#E5000F] mb-2">Access denied</p>
          <p className="text-sm text-black/60 mb-6">This area is for administrators only.</p>
          <Link href="/" className="inline-block px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/blog", label: "Blog" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/ads", label: "Ads" },
  ];

  return (
    <main className="min-h-screen bg-[#F2EDE4] font-sans text-black">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/admin" className="text-xl font-black tracking-tight leading-none">
          <span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif",fontWeight:"normal",fontStyle:"normal"}}>the</span>
          <span className="uppercase"> Local Art Hub</span>
          <span className="ml-3 text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-1 align-middle">Admin</span>
        </Link>
        <div className="flex items-center gap-6">
          {nav.map(n => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`text-sm font-medium uppercase tracking-widest transition-colors ${active ? "text-[#E5000F]" : "hover:text-[#E5000F]"}`}>
                {n.label}
              </Link>
            );
          })}
          <Link href="/dashboard" className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors">Exit</Link>
        </div>
      </nav>
      {children}
    </main>
  );
}
