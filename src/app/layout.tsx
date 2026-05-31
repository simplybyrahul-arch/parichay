import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.shotcutcrew.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ShotcutCrew | Book Creators, Production Crews & Equipment Rentals",
    template: "%s | ShotcutCrew"
  },
  description: "Find verified photographers, videographers, production studios, drone operators, editors, and equipment rentals. ShotcutCrew is India's production marketplace for quick bookings, custom projects, equipment rentals, and AI production planning.",
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
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    title: "ShotcutCrew | India's Production Marketplace",
    description: "Book verified creators, production crews, studios, and equipment rentals across India.",
    siteName: "ShotcutCrew",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ShotcutCrew - Creative Production Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShotcutCrew | India's Production Marketplace",
    description: "Book verified creators, production crews, studios, and equipment rentals across India.",
    images: [`${siteUrl}/og-image.png`],
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
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
