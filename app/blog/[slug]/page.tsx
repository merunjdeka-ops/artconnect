import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase";
import { cdnUrl } from "@/lib/cloudinary";
import { categoryLabel } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { jsonLdString } from "@/lib/events";
import AdSlot from "@/app/components/AdSlot";
import PostGallery from "./post-gallery";

// Server-rendered so the article text is crawlable, refreshed every 10 min.
export const revalidate = 600;

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

// cache() dedupes the fetch between generateMetadata and the page render.
const getPost = cache(async (slug: string): Promise<Post | null> => {
  const { data } = await getSupabase()
    .from("posts")
    .select("id, title, category, excerpt, body, cover_url, photos, published_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data as Post) ?? null;
});

function fmt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  const description = post.excerpt || (post.body ? post.body.replace(/\s+/g, " ").slice(0, 155) : "");
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      ...(post.published_at ? { publishedTime: post.published_at } : {}),
      ...(post.cover_url ? { images: [cdnUrl(post.cover_url, "w_1200,c_limit,q_auto,f_auto")] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const gallery = (post.photos || []).filter(u => u !== post.cover_url);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.cover_url ? { image: [post.cover_url] } : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  };

  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif",fontWeight:"normal",fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <Link href="/blog" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">← All posts</Link>
      </nav>

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

        <PostGallery photos={gallery} />

        {/* AD SLOT */}
        <div className="mt-12">
          <AdSlot slot="blog" />
        </div>
      </article>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
        <Link href="/" className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif",fontWeight:"normal",fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
        <span className="text-xs text-black/40 uppercase tracking-widest">© 2026 {SITE_NAME}.</span>
      </footer>
    </main>
  );
}
