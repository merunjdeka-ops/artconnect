import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Mr_Dafoe } from "next/font/google";
import "./globals.css";
import ScrollReveal from "@/app/components/ScrollReveal";
import CookieBanner from "@/app/components/CookieBanner";
import { ADSENSE_CLIENT, SITE_URL } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Logo script font — SIL Open Font License, free for commercial use
const mrDafoe = Mr_Dafoe({
  variable: "--font-logo",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "The Local Art Hub — Book Local Artists in Italy",
    template: "%s | The Local Art Hub",
  },
  description: "Discover and book local artists in Italy — photographers, musicians, makeup artists, painters and more. Find the perfect artist for your event on The Local Art Hub.",
  metadataBase: new URL(SITE_URL),
  keywords: [
    "local artists Italy",
    "book artist Italy",
    "photographer Italy",
    "musician Italy",
    "makeup artist Italy",
    "wedding photographer Italy",
    "creative booking platform Italy",
    "artisti locali Italia",
  ],
  openGraph: {
    siteName: "The Local Art Hub",
    locale: "en_US",
    type: "website",
    url: SITE_URL,
    title: "The Local Art Hub — Book Local Artists in Italy",
    description: "Discover and book local artists in Italy — photographers, musicians, makeup artists, painters and more.",
  },
  twitter: {
    card: "summary",
    title: "The Local Art Hub — Book Local Artists in Italy",
    description: "Discover and book local artists in Italy — photographers, musicians, makeup artists, painters and more.",
  },
  // Add your Google Search Console verification code below (get it from search.google.com/search-console)
  // verification: { google: "YOUR_VERIFICATION_CODE_HERE" },
  // AdSense site-ownership meta tag — appears once NEXT_PUBLIC_ADSENSE_CLIENT is set
  ...(ADSENSE_CLIENT ? { other: { "google-adsense-account": ADSENSE_CLIENT } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${mrDafoe.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* React hoists these into <head>; every page fetches from both hosts on mount */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        {ADSENSE_CLIENT && (
          <>
            {/* GDPR: hold AdSense ad requests until the visitor accepts advertising
                cookies (see CookieBanner, which unpauses on accept). Must run before
                adsbygoogle.js executes, so it ships inline in the initial HTML. */}
            <script
              dangerouslySetInnerHTML={{
                __html: `try{if(localStorage.getItem("gac_cookie_consent")!=="accepted"){(window.adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=1;}}catch(e){}`,
              }}
            />
            {/* Sitewide AdSense loader — required on every page for site review/verification.
                data-adsense stops AdSlot from injecting a duplicate copy. */}
            <Script
              id="adsense-loader"
              data-adsense="1"
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
          </>
        )}
        <ScrollReveal />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}



