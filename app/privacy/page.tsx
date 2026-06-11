import Link from "next/link";
import { PRIVACY_EMAIL } from "@/lib/config";

export const metadata = {
  title: "Privacy Policy — goArtConnect",
  description: "Privacy Policy for goArtConnect platform.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>go</span><span className="uppercase">ARTCONNECT</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
          <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Legal</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-4">Privacy<br />Policy</h1>
        <p className="text-sm text-black/50 mb-12">Last updated: June 11, 2026</p>

        <div className="flex flex-col gap-10 text-sm leading-relaxed text-black/80">

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">1. Introduction & Data Controller</h2>
            <p className="mb-3">goArtConnect ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, in accordance with Regulation (EU) 2016/679 ("GDPR") and the Italian Personal Data Protection Code (Legislative Decree 196/2003, as amended).</p>
            <p>The data controller for personal data processed through this Platform is goArtConnect, reachable at <span className="text-black font-bold">{PRIVACY_EMAIL}</span>. If you do not agree with the terms of this policy, please discontinue use of the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">2. Information We Collect</h2>
            <p className="mb-3"><strong>Information you provide directly:</strong></p>
            <ul className="list-disc pl-5 flex flex-col gap-2 mb-3">
              <li>Account registration details (name, email address, password)</li>
              <li>Profile information (bio, location, category, portfolio content)</li>
              <li>Booking and transaction information</li>
              <li>Communications between users and with our support team</li>
              <li>Payment information (processed securely through our payment provider — we do not store card details)</li>
            </ul>
            <p className="mb-3"><strong>Information collected automatically:</strong></p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>IP address and device information</li>
              <li>Browser type and operating system</li>
              <li>Pages visited and time spent on the Platform</li>
              <li>Referring URLs</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">3. How We Use Your Information & Legal Basis</h2>
            <p className="mb-3">Under the GDPR, every processing activity must rest on a legal basis (Art. 6 GDPR). We process your data as follows:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>To create and manage your account — <strong>performance of a contract</strong> (Art. 6(1)(b))</li>
              <li>To facilitate bookings and transactions between artists and clients — <strong>performance of a contract</strong> (Art. 6(1)(b))</li>
              <li>To display your artist profile and portfolio to potential clients — <strong>performance of a contract</strong> (Art. 6(1)(b))</li>
              <li>To send transactional emails (account confirmation, booking notifications) — <strong>performance of a contract</strong> (Art. 6(1)(b))</li>
              <li>To send marketing communications — <strong>your consent</strong> (Art. 6(1)(a)), which you may withdraw at any time</li>
              <li>To improve and personalize the Platform experience — <strong>legitimate interest</strong> (Art. 6(1)(f))</li>
              <li>To detect and prevent fraud and abuse — <strong>legitimate interest</strong> (Art. 6(1)(f))</li>
              <li>To comply with legal obligations — <strong>legal obligation</strong> (Art. 6(1)(c))</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">4. Sharing of Information</h2>
            <p className="mb-3">We do not sell your personal information. We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li><strong>With other users:</strong> Artist profile information is publicly visible. Booking details are shared between the relevant artist and client.</li>
              <li><strong>With service providers:</strong> We use third-party providers (such as Supabase for authentication and database, and payment processors) who process data on our behalf under strict confidentiality agreements.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information if required by law, court order, or to protect the rights and safety of goArtConnect or others.</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</li>
            </ul>
            <p className="mt-3"><strong>International transfers:</strong> Some of our service providers (including Supabase for database/authentication, Cloudinary for media hosting, and Resend for email delivery) may process data outside the European Economic Area. Where this occurs, transfers are protected by appropriate safeguards such as the EU Standard Contractual Clauses or an adequacy decision (Art. 44–49 GDPR).</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">5. Cookies</h2>
            <p>We use cookies and similar technologies to maintain your session, remember your preferences, and analyze Platform usage. You can control cookie settings through your browser. Disabling cookies may affect the functionality of the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">6. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">7. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Objection:</strong> Object to processing of your data for marketing purposes</li>
              <li><strong>Restriction:</strong> Request restriction of processing in the cases set out in Art. 18 GDPR</li>
              <li><strong>Withdraw consent:</strong> Withdraw consent at any time, without affecting prior processing</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <span className="text-black font-bold">{PRIVACY_EMAIL}</span>. We will respond within one month, as required by Art. 12 GDPR.</p>
            <p className="mt-3"><strong>Right to lodge a complaint:</strong> If you believe your data has been processed in violation of the GDPR, you have the right to lodge a complaint with your local supervisory authority. In Italy, this is the <strong>Garante per la Protezione dei Dati Personali</strong> (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="underline">www.garanteprivacy.it</a>).</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">8. Security</h2>
            <p>We implement industry-standard security measures to protect your information, including encryption in transit (HTTPS) and secure authentication. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">9. Children's Privacy</h2>
            <p>goArtConnect is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal information, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice on the Platform. Your continued use of the Platform after changes take effect constitutes your acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">11. Contact</h2>
            <p>For privacy-related questions or requests, contact us at <span className="text-black font-bold">{PRIVACY_EMAIL}</span>.</p>
          </section>

        </div>
      </div>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"var(--font-logo),Georgia,serif", fontWeight:"normal", fontStyle:"normal"}}>go</span><span className="uppercase">ARTCONNECT</span></span>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-black/40">
          <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          <Link href="/dmca" className="hover:text-black transition-colors">DMCA</Link>
        </div>
        <span className="text-xs text-black/40 uppercase tracking-widest">© 2026 goArtConnect.</span>
      </footer>
    </main>
  );
}











