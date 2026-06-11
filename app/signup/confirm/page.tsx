import Link from "next/link";

export default function ConfirmPage() {
  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>the</span><span className="uppercase"> Local Art Hub</span></Link>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border border-black bg-white p-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-3">Almost there</p>
          <h2 className="text-4xl font-black uppercase leading-none mb-6">Check<br />Your Email</h2>
          <p className="text-sm text-black/60 leading-relaxed mb-8">
            We sent a confirmation link to your email address.
            Click the link to activate your account and start using The Local Art Hub.
          </p>
          <Link
            href="/"
            className="inline-block bg-black text-white text-xs font-bold uppercase tracking-widest px-8 py-4 hover:bg-[#E5000F] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}











