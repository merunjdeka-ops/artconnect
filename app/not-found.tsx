import Link from "next/link";

// Site-wide 404 (also served for unknown URLs). Returns a real 404 status,
// which Google treats as "Not found" rather than the "Soft 404" it reports
// when a missing page redirects somewhere unrelated or returns 200.
export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none">
          <span className="text-[#E5000F]" style={{ fontFamily: "var(--font-logo),Georgia,serif", fontWeight: "normal" }}>the</span>
          <span className="uppercase"> Local Art Hub</span>
        </Link>
      </nav>
      <section className="px-8 py-24 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">404</p>
        <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-black uppercase leading-none">This page<br />isn&apos;t here</h1>
        <p className="mt-6 text-sm text-black/60 max-w-xl leading-relaxed">
          It may have ended or been removed — events disappear once they&apos;ve taken place.
          Here&apos;s where to look instead:
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            { href: "/events", label: "Upcoming events" },
            { href: "/venues", label: "Venues" },
            { href: "/artists", label: "Local artists" },
            { href: "/blog", label: "The Journal" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="text-xs font-bold uppercase tracking-widest border border-black px-4 py-3 hover:bg-black hover:text-white transition-colors">
              {l.label} →
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
