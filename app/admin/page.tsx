"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

export default function AdminHome() {
  const [counts, setCounts] = useState({ posts: 0, events: 0 });

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const [{ count: posts }, { count: events }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
      ]);
      setCounts({ posts: posts || 0, events: events || 0 });
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Admin</p>
      <h1 className="text-5xl font-black uppercase leading-none mb-12">Control<br />Room</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-black border border-black mb-12">
        <Link href="/admin/blog" className="bg-[#F2EDE4] p-8 hover:bg-[#E5000F] hover:text-white transition-colors group">
          <p className="text-5xl font-black">{counts.posts}</p>
          <p className="text-xs uppercase tracking-widest mt-2 opacity-60">Blog posts</p>
          <p className="text-xs font-bold uppercase tracking-widest mt-6 border-b-2 border-current inline-block pb-0.5">Manage blog →</p>
        </Link>
        <Link href="/admin/events" className="bg-[#F2EDE4] p-8 hover:bg-[#E5000F] hover:text-white transition-colors group">
          <p className="text-5xl font-black">{counts.events}</p>
          <p className="text-xs uppercase tracking-widest mt-2 opacity-60">Events</p>
          <p className="text-xs font-bold uppercase tracking-widest mt-6 border-b-2 border-current inline-block pb-0.5">Manage events →</p>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/admin/blog" className="bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors">+ Write a post</Link>
        <Link href="/admin/events" className="border border-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">+ Add an event</Link>
        <Link href="/blog" className="border border-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors">View public blog →</Link>
      </div>
    </div>
  );
}
