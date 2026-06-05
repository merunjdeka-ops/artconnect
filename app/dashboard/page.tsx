import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight uppercase">ArtConnect</Link>
      </nav>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border border-black bg-white p-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">You&apos;re in</p>
          <h2 className="text-4xl font-black uppercase leading-none mb-6">Dashboard</h2>
          <p className="text-sm text-black/60 leading-relaxed mb-8">
            Your dashboard is being built. Check back soon.
          </p>
          <Link href="/" className="inline-block bg-black text-white text-xs font-bold uppercase tracking-widest px-8 py-4 hover:bg-[#E5000F] transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
