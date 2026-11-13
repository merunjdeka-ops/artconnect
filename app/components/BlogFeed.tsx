"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";
import { categoryLabel } from "@/lib/blog";

export type Post = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
};

// `initial` comes from the server render (app/page.tsx) so the section is in
// the HTML; without it the component fetches on mount as before.
type FeedProps = {
  initial?: Post[];
  category?: string;          // only this category (e.g. "gear")
  excludeCategory?: string;   // everything except this category
  eyebrow?: string;
  heading?: [string, string];
  href?: string;
  linkLabel?: string;
};

// Homepage post strip. Used twice: "The Journal" (everything except gear)
// and "Gear & Tech" (gear only), so a tech post never shows in both.
export default function BlogFeed({
  initial, category, excludeCategory,
  eyebrow = "The Journal", heading = ["From the", "Local Scene"],
  href = "/blog", linkLabel = "Read the blog →",
}: FeedProps = {}) {
  const [posts, setPosts] = useState<Post[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial) return;
    async function load() {
      const supabase = getSupabase();
      let q = supabase
        .from("posts")
        .select("id, title, slug, category, excerpt, cover_url, published_at")
        .eq("is_published", true);
      if (category) q = q.eq("category", category);
      if (excludeCategory) q = q.neq("category", excludeCategory);
      const { data } = await q.order("published_at", { ascending: false }).limit(3);
      setPosts((data as Post[]) || []);
      setLoading(false);
    }
    load();
  }, [initial, category, excludeCategory]);

  if (!loading && posts.length === 0) return null;

  return (
    <section className="px-8 py-16 border-b border-black">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-10 reveal">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">{eyebrow}</p>
          <h2 className="text-4xl font-black uppercase leading-none">{heading[0]}<br />{heading[1]}</h2>
        </div>
        <Link href={href} className="text-xs font-bold uppercase tracking-widest border-b-2 border-black hover:border-[#E5000F] hover:text-[#E5000F] transition-colors pb-0.5">
          {linkLabel}
        </Link>
      </div>

      {loading ? (
        <p className="text-xs uppercase tracking-widest text-black/40 py-8">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-black border border-black">
          {posts.map(p => (
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
                <h3 className="text-lg font-black uppercase leading-tight mb-2 group-hover:text-[#E5000F] transition-colors">{p.title}</h3>
                {p.excerpt && <p className="text-xs text-black/60 leading-relaxed line-clamp-3">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
