"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function NavbarAuth({ userName }: { userName?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await getSupabase().auth.signOut();
    router.push("/");
  }

  const navLink = (href: string, label: string, extra = "") => (
    <Link
      href={href}
      className={`text-sm font-medium uppercase tracking-widest transition-colors ${
        pathname === href ? "text-[#E5000F]" : "hover:text-[#E5000F]"
      } ${extra}`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-5 border-b border-black bg-[#F2EDE4]">
      <Link href="/" className="text-lg sm:text-xl font-black tracking-tight leading-none whitespace-nowrap">
        <span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span>
      </Link>
      <div className="flex items-center gap-3 sm:gap-6">
        {navLink("/artists", "Browse", "hidden sm:block")}
        {navLink("/dashboard", "Dashboard")}
        {navLink("/dashboard/settings", "Settings", "hidden sm:block")}
        {userName && (
          <span className="text-xs uppercase tracking-widest text-black/40 hidden md:block">{userName}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm font-bold uppercase tracking-widest bg-black text-white px-5 py-2 hover:bg-[#E5000F] transition-colors whitespace-nowrap"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}










