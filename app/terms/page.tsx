import Link from "next/link";
import { LEGAL_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Terms of Service — ArtConnect",
  description: "Terms of Service for ArtConnect platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight uppercase">ArtConnect</Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
          <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Legal</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-4">Terms of<br />Service</h1>
        <p className="text-sm text-black/50 mb-12">Last updated: June 6, 2026</p>

        <div className="flex flex-col gap-10 text-sm leading-relaxed text-black/80">

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">1. Acceptance of Terms</h2>
            <p>By accessing or using ArtConnect ("Platform", "we", "us", "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the platform. These terms apply to all users, including visitors, registered users, artists, and clients.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">2. Description of Service</h2>
            <p>ArtConnect is an online marketplace that connects local artists — including photographers, musicians, makeup artists, painters, illustrators, videographers, and other creatives — with clients seeking their services. The Platform allows artists to create profiles, upload portfolio content, set rates, and receive bookings. Clients may browse, discover, and book artists through the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">3. User Accounts</h2>
            <p className="mb-3">To use certain features of the Platform, you must register for an account. You agree to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Be responsible for all activity that occurs under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p className="mt-3">You must be at least 18 years old to create an account. By creating an account, you represent that you meet this requirement.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">4. Artist Obligations</h2>
            <p className="mb-3">If you register as an artist on ArtConnect, you agree to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>Only upload content (photos, music, videos, artwork) that you own or have full rights to display and distribute</li>
              <li>Accurately represent your skills, experience, and services</li>
              <li>Honor bookings you accept and communicate professionally with clients</li>
              <li>Set fair and transparent pricing for your services</li>
              <li>Comply with all applicable local, national, and international laws</li>
              <li>Not upload content that infringes on any third party's intellectual property rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">5. Client Obligations</h2>
            <p className="mb-3">If you use ArtConnect as a client seeking artist services, you agree to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>Honor bookings you confirm with artists</li>
              <li>Communicate respectfully and professionally with all artists</li>
              <li>Not use artist portfolio content without proper licensing or permission</li>
              <li>Provide accurate information when making booking requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">6. Content and Intellectual Property</h2>
            <p className="mb-3"><strong>Your Content:</strong> You retain full ownership of all content you upload to ArtConnect. By uploading content, you grant ArtConnect a non-exclusive, royalty-free, worldwide license to display, reproduce, and promote your content solely for the purpose of operating and marketing the Platform.</p>
            <p className="mb-3"><strong>Our Content:</strong> All other content on the Platform, including the design, logo, text, and software, is owned by ArtConnect and protected by applicable intellectual property laws. You may not copy, reproduce, or distribute any part of the Platform without our express written permission.</p>
            <p><strong>Prohibited Content:</strong> You may not upload content that is infringing, obscene, defamatory, harassing, threatening, or otherwise unlawful. We reserve the right to remove any content that violates these Terms at any time without notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">7. Payments and Fees</h2>
            <p>ArtConnect may charge fees for use of certain features or for transactions completed through the Platform. All applicable fees will be clearly disclosed before you incur them. We reserve the right to modify our fee structure at any time with reasonable notice to users. All transactions are subject to our payment processor's terms and conditions.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">8. Prohibited Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>Use the Platform for any illegal purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Post false, misleading, or fraudulent content</li>
              <li>Attempt to gain unauthorized access to any part of the Platform</li>
              <li>Use automated tools (bots, scrapers) to access the Platform</li>
              <li>Circumvent any fees by arranging transactions outside of the Platform after initial contact was made through the Platform</li>
              <li>Upload viruses or malicious code</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">9. Disclaimers</h2>
            <p>ArtConnect is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the Platform's reliability, availability, or fitness for a particular purpose. We do not guarantee the quality, safety, or legality of any artist's services, or the accuracy of any listing. Any disputes between clients and artists are solely between those parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, ArtConnect shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of profits, data, or goodwill. Our total liability to you for any claim shall not exceed the amount you paid to ArtConnect in the three months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">11. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, third parties, or the public. You may delete your account at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">12. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify registered users of significant changes by email or by posting a notice on the Platform. Your continued use of the Platform after changes take effect constitutes your acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">13. Contact</h2>
            <p>If you have any questions about these Terms, please contact us at <span className="text-black font-bold">{LEGAL_EMAIL}</span>.</p>
          </section>

        </div>
      </div>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
        <span className="text-sm font-black uppercase tracking-tight">ArtConnect</span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
        </div>
        <span className="text-xs text-black/40 uppercase tracking-widest">© 2026 ArtConnect.</span>
      </footer>
    </main>
  );
}
