import Link from "next/link";
import { DMCA_EMAIL } from "@/lib/config";

export const metadata = {
  title: "DMCA Policy — goArtConnect",
  description: "DMCA Copyright Policy for goArtConnect platform.",
};

export default function DmcaPage() {
  return (
    <main className="min-h-screen bg-[#F2EDE4] text-black font-sans">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-black">
        <Link href="/" className="text-xl font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"Downtown,Georgia,serif", fontWeight:"normal", fontStyle:"italic"}}>go</span><span className="uppercase">ARTCONNECT</span></Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium uppercase tracking-widest hover:text-[#E5000F] transition-colors">Login</Link>
          <Link href="/signup" className="bg-[#E5000F] text-white text-sm font-bold uppercase tracking-widest px-5 py-2 hover:bg-black transition-colors">Join Now</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#E5000F] mb-4">Legal</p>
        <h1 className="text-5xl font-black uppercase leading-none mb-4">DMCA<br />Policy</h1>
        <p className="text-sm text-black/50 mb-12">Last updated: June 6, 2026</p>

        <div className="flex flex-col gap-10 text-sm leading-relaxed text-black/80">

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">Overview</h2>
            <p>goArtConnect respects the intellectual property rights of others and expects all users of our Platform to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond promptly to claims of copyright infringement that are reported to our designated copyright agent.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">1. Reporting Copyright Infringement</h2>
            <p className="mb-3">If you believe that content hosted on goArtConnect infringes your copyright, please submit a written notice to our DMCA Agent containing all of the following information:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li><strong>Your full legal name</strong> and contact information (email address, mailing address, and telephone number)</li>
              <li><strong>A description of the copyrighted work</strong> you claim has been infringed. If multiple works are covered by a single notification, provide a representative list.</li>
              <li><strong>A description of the infringing material</strong> and its location on the Platform — include the specific URL(s) where the content is located.</li>
              <li><strong>A statement that you have a good faith belief</strong> that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
              <li><strong>A statement that the information in your notice is accurate</strong> and, under penalty of perjury, that you are the copyright owner or are authorized to act on the copyright owner's behalf.</li>
              <li><strong>Your physical or electronic signature.</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">2. Where to Send Notices</h2>
            <p className="mb-3">Send your DMCA notice to our designated agent:</p>
            <div className="border border-black p-6 bg-white">
              <p className="font-bold uppercase tracking-widest text-xs mb-3">DMCA Agent — goArtConnect</p>
              <p>Email: <span className="font-bold">{DMCA_EMAIL}</span></p>
              <p className="mt-1 text-black/50 text-xs">Please use the subject line: "DMCA Takedown Notice"</p>
            </div>
            <p className="mt-4">We strongly recommend submitting notices via email for fastest response. We aim to respond to all valid DMCA notices within <strong>3 business days</strong>.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">3. Our Response to Valid Notices</h2>
            <p className="mb-3">Upon receipt of a valid DMCA takedown notice, goArtConnect will:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>Remove or disable access to the allegedly infringing content promptly</li>
              <li>Notify the user who uploaded the content that it has been removed</li>
              <li>Provide the user with a copy of the takedown notice (with your personal contact info redacted if requested)</li>
              <li>Inform the user of their right to file a counter-notification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">4. Counter-Notification</h2>
            <p className="mb-3">If you believe your content was removed as a result of a mistake or misidentification, you may submit a counter-notification. Your counter-notification must include:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>Your full legal name, email address, mailing address, and telephone number</li>
              <li>Identification of the content that was removed and its location before removal</li>
              <li>A statement under penalty of perjury that you have a good faith belief the content was removed as a result of mistake or misidentification</li>
              <li>A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located, or if outside the United States, any judicial district in which goArtConnect may be found</li>
              <li>Your physical or electronic signature</li>
            </ul>
            <p className="mt-3">Upon receipt of a valid counter-notification, we will forward it to the original complainant. If we do not receive notice within 10 business days that the complainant has filed a court action, we may restore the removed content.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">5. Repeat Infringers</h2>
            <p>goArtConnect has a strict policy against repeat copyright infringers. Users who are found to have repeatedly infringed on the intellectual property rights of others will have their accounts terminated. We reserve the right to terminate accounts of users who are subject to even a single DMCA notice in cases of egregious infringement.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">6. False Claims</h2>
            <p>Please be aware that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that content is infringing, or that content was removed by mistake, may be subject to liability. Do not submit a DMCA notice if you are not certain that the material is infringing your copyright.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">7. Music and Cover Songs</h2>
            <p>goArtConnect is aware that musicians may wish to upload cover versions of copyrighted songs. Please note that performing or recording a cover song does not automatically grant you the right to distribute it. If you upload a cover song, you are responsible for ensuring you have obtained all necessary licenses (such as a mechanical license or synchronization license). goArtConnect does not provide licensing assistance and is not liable for unlicensed cover song uploads.</p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase mb-3 text-black">8. Contact</h2>
            <p>For all copyright-related concerns, contact us at <span className="text-black font-bold">{DMCA_EMAIL}</span>.</p>
          </section>

        </div>
      </div>

      <footer className="px-8 py-6 flex flex-wrap gap-4 items-center justify-between border-t border-black mt-10">
        <span className="text-sm font-black tracking-tight leading-none"><span className="text-[#E5000F]" style={{fontFamily:"Downtown,Georgia,serif", fontWeight:"normal", fontStyle:"italic"}}>go</span><span className="uppercase">ARTCONNECT</span></span>
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









