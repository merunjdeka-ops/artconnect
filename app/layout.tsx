import type { Metadata } from "next";
import { Geist, Geist_Mono, Mr_Dafoe } from "next/font/google";
import "./globals.css";
import ScrollReveal from "@/app/components/ScrollReveal";
import CookieBanner from "@/app/components/CookieBanner";

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
  metadataBase: new URL("https://thelocalarthub.com"),
  openGraph: {
    siteName: "The Local Art Hub",
    locale: "en_US",
    type: "website",
  },
  // Add your Google Search Console verification code below (get it from search.google.com/search-console)
  // verification: { google: "YOUR_VERIFICATION_CODE_HERE" },
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
        <ScrollReveal />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}



