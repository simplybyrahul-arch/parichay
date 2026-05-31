import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shotcutcrew.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ShotcutCrew | Book Creators, Production Crews & Equipment Rentals",
    template: "%s | ShotcutCrew"
  },
  description: "Find verified photographers, videographers, production studios, drone operators, editors, and equipment rentals. ShotcutCrew is India's production marketplace.",
  keywords: [
    "production crew booking",
    "photographer booking",
    "videographer booking",
    "equipment rental India",
    "drone operator hire",
    "production studio",
    "wedding videographer",
    "event photographer",
    "film production crew",
    "content creator hire",
  ],
  authors: [{ name: "ShotcutCrew Team" }],
  creator: "ShotcutCrew",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    title: "ShotcutCrew | Book Creators, Production Crews & Equipment Rentals",
    description: "Find verified photographers, videographers, production studios, drone operators, editors, and equipment rentals. ShotcutCrew is India's production marketplace.",
    siteName: "ShotcutCrew",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "ShotcutCrew - Creative Production Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShotcutCrew | Book Creators, Production Crews & Equipment Rentals",
    description: "Find verified photographers, videographers, production studios, drone operators, editors, and equipment rentals. ShotcutCrew is India's production marketplace.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="font-sans antialiased text-stone-900 bg-[#fffcf8] selection:bg-orange-500/30">
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
