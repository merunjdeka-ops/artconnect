"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";
import { POST_CATEGORIES, categoryLabel } from "@/lib/blog";

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, category, excerpt, cover_url, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      setPosts((data as Post[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const visible = cat === "all" ? posts : posts.filter(p => p.category === cat);
  const usedCats = POST_CATEGORIES.filter(c => posts.some(p => p.category === c.value));

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif",fontWeight:"normal",fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Browse</Link>
          <Link href="/blog" className="text-sm font-medium uppercase tracking-widest text-[#E5000F]">Blog</Link>
        </div>
      </nav>

      <section className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-5">The Journal</p>
        <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-black uppercase leading-none">Stories from<br />the local scene.</h1>
        <p className="text-sm text-black/60 max-w-md mt-6 leading-relaxed">Artist features, concerts, shows, reviews and what&apos;s happening in your local creative community.</p>
      </section>

      {usedCats.length > 0 && (
        <div className="px-8 py-5 border-b border-black flex flex-wrap gap-2">
          <button onClick={() => setCat("all")} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black transition-colors ${cat === "all" ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>All</button>
          {usedCats.map(c => (
            <button key={c.value} onClick={() => setCat(c.value)} className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black transition-colors ${cat === c.value ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}>{c.label}</button>
          ))}
        </div>
      )}

      <section className="px-8 py-12">
        {loading ? (
          <p className="text-xs uppercase tracking-widest text-black/40">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-black/40 py-12">No posts yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-black border border-black">
            {visible.map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="bg-[#F2EDE4] group flex flex-col">
                <div className="aspect-[4/3] overflow-hidden bg-black/5">
                  {p.cover_url ? (
                    <img src={cdnUrl(p.cover_url, "w_800,c_limit,q_auto,f_auto")} alt={p.title} decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-black via-[#1a0000] to-[#E5000F]/40" />
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#E5000F] mb-2">{categoryLabel(p.category)}</p>
                  <h2 className="text-lg font-black uppercase leading-tight mb-2 group-hover:text-[#E5000F] transition-colors">{p.title}</h2>
                  {p.excerpt && <p className="text-xs text-black/60 leading-relaxed mb-3 line-clamp-3">{p.excerpt}</p>}
                  <p className="text-[11px] uppercase tracking-widest text-black/30 mt-auto">{fmt(p.published_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
        <Link href="/" className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif",fontWeight:"normal",fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <span className="text-xs text-black/40 uppercase tracking-widest">© 2026</span>
      </footer>
    </main>
  );
}
