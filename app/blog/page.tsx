import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { SITE_NAME } from "@/lib/config";
import BlogGrid, { type BlogListPost } from "./blog-grid";

// Server-rendered so every post title/excerpt is crawlable, refreshed every 10 min.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Local Art News, Stories & Event Guides — The Journal",
  description:
    "Local art news and stories from Italy's creative scene: artist features, event roundups for Florence, Milan and beyond, concert guides, reviews and what's on in your local art community.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const { data } = await getSupabase()
    .from("posts")
    .select("id, title, slug, category, excerpt, cover_url, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  const posts = (data as BlogListPost[]) || [];

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif",fontWeight:"normal",fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/artists" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Browse</Link>
          <Link href="/events" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Events</Link>
          <Link href="/blog" className="text-sm font-medium uppercase tracking-widest text-[#E5000F]">Blog</Link>
        </div>
      </nav>

      <section className="px-8 pt-16 pb-10 border-b border-black">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-5">The Journal</p>
        <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-black uppercase leading-none">Stories from<br />the local scene.</h1>
        <p className="text-sm text-black/60 max-w-md mt-6 leading-relaxed">Artist features, concerts, shows, reviews and what&apos;s happening in your local creative community.</p>
      </section>

      <BlogGrid posts={posts} />

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
        <Link href="/" className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif",fontWeight:"normal",fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <span className="text-xs text-black/40 uppercase tracking-widest">© 2026 {SITE_NAME}.</span>
      </footer>
    </main>
  );
}
