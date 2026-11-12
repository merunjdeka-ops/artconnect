import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

// Shared header/footer for the public events, venue and month pages.

const Logo = () => (
  <>
    <span className="text-[#E5000F]" style={{ fontFamily: "var(--font-logo),Georgia,serif", fontWeight: "normal", fontStyle: "normal" }}>the</span>
    <span className="uppercase"> Local Art Hub</span>
  </>
);

export function SiteNav({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
      <Link href="/" className="text-xl font-black tracking-tight leading-none"><Logo /></Link>
      <Link href={backHref} className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">← {backLabel}</Link>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black">
      <span className="text-sm font-black tracking-tight leading-none"><Logo /></span>
      <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
        <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
        <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
        <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
      </div>
      <span className="text-xs text-black/40 uppercase tracking-widest">© 2026 {SITE_NAME}.</span>
    </footer>
  );
}

// Small pill links used for "by month" / "venues" navigation blocks.
export function LinkPills({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  if (links.length === 0) return null;
  return (
    <div className="mt-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/40 mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="text-xs font-bold uppercase tracking-widest border border-black px-3 py-2 hover:bg-black hover:text-white transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}
