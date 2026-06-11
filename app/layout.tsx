import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ScrollReveal from "@/app/components/ScrollReveal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "goArtConnect — Book Local Artists in Italy",
    template: "%s | goArtConnect",
  },
  description: "Discover and book local artists in Italy — photographers, musicians, makeup artists, painters and more. Find the perfect artist for your event on goArtConnect.",
  metadataBase: new URL("https://goartconnect.com"),
  openGraph: {
    siteName: "goArtConnect",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ScrollReveal />
        {children}
      </body>
    </html>
  );
}

