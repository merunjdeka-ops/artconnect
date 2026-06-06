"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function NavbarAuth({ userName }: { userName?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await getSupabase().auth.signOut();
    router.push("/");
  }

  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-black bg-[#F2EDE4]">
      <Link href="/" className="text-xl font-black tracking-tight uppercase">ArtConnect</Link>
      <div className="flex items-center gap-6">
        <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">
          Browse
        </Link>
        <Link href="/dashboard" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">
          Dashboard
        </Link>
        {userName && (
          <span className="text-xs uppercase tracking-widest text-black/40 hidden md:block">{userName}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm font-bold uppercase tracking-widest bg-black text-white px-5 py-2 hover:bg-[#E5000F] transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
