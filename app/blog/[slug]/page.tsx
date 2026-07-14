"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";
import { categoryLabel } from "@/lib/blog";
import AdSlot from "@/app/components/AdSlot";

type Post = {
  id: string;
  title: string;
  category: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  photos: string[];
  published_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const supabase = getSupabase();
      const { data } = await supabase
        .from("posts")
        .select("id, title, category, excerpt, body, cover_url, photos, published_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!data) { setStatus("missing"); return; }
      setPost(data as Post);
      setStatus("ready");
    }
    load();
  }, [slug]);

  const gallery = post ? (post.photos || []).filter(u => u !== post.cover_url) : [];

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif",fontWeight:"normal",fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <Link href="/blog" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">← All posts</Link>
      </nav>

      {status === "loading" && <p className="text-xs uppercase tracking-widest text-black/40 text-center py-24">Loading...</p>}

      {status === "missing" && (
        <div className="text-center py-24 px-6">
          <h1 className="text-4xl font-black uppercase mb-4">Post not found</h1>
          <Link href="/blog" className="inline-block bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#E5000F] transition-colors">Back to Blog</Link>
        </div>
      )}

      {status === "ready" && post && (
        <>
          <article className="max-w-3xl mx-auto px-8 py-16">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">{categoryLabel(post.category)}</p>
            <h1 className="text-[clamp(2rem,6vw,4rem)] font-black uppercase leading-none mb-6">{post.title}</h1>
            <p className="text-xs uppercase tracking-widest text-black/40 mb-10">{fmt(post.published_at)}</p>

            {post.cover_url && (
              <img src={cdnUrl(post.cover_url, "w_1400,c_limit,q_auto,f_auto")} alt={post.title} fetchPriority="high" className="w-full border border-black mb-10" />
            )}

            {post.excerpt && <p className="text-lg text-black/70 leading-relaxed mb-8 font-medium">{post.excerpt}</p>}

            {post.body && (
              <div className="text-base text-black/80 leading-relaxed whitespace-pre-wrap">{post.body}</div>
            )}

            {gallery.length > 0 && (
              <div className="grid grid-cols-2 gap-px bg-black border border-black mt-12">
                {gallery.map(url => (
                  <button key={url} onClick={() => setLightbox(url)} className="aspect-square overflow-hidden bg-black/5 cursor-zoom-in group">
                    <img src={cdnUrl(url, "w_800,c_limit,q_auto,f_auto")} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </button>
                ))}
              </div>
            )}

            {/* AD SLOT */}
            <div className="mt-12">
              <AdSlot slot="blog" />
            </div>
          </article>

          {lightbox && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
              <button className="absolute top-5 right-6 text-white/60 hover:text-white text-3xl font-black leading-none">✕</button>
              <img src={cdnUrl(lightbox, "w_2000,c_limit,q_auto,f_auto")} alt="" className="max-h-[85vh] max-w-full object-contain" />
            </div>
          )}
        </>
      )}
    </main>
  );
}
