import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shotcutcrew.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ShotcutCrew | AI-Enabled Creative Production Marketplace",
    template: "%s | ShotcutCrew"
  },
  description: "Connect with verified photographers, videographers, and full production crews through a transparent, structured booking ecosystem.",
  keywords: ["photography", "videography", "production crew", "creative marketplace", "book photographers", "find videographers", "ShotcutCrew"],
  authors: [{ name: "ShotcutCrew Team" }],
  creator: "ShotcutCrew",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    title: "ShotcutCrew | AI-Enabled Creative Production Marketplace",
    description: "Connect with verified photographers, videographers, and full production crews through a transparent, structured booking ecosystem.",
    siteName: "ShotcutCrew",
    images: [
      {
        url: "https://shotcutcrew.com/logo.jpg",
        width: 1200,
        height: 630,
        alt: "ShotcutCrew - Creative Production Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShotcutCrew | AI-Enabled Creative Production Marketplace",
    description: "Connect with verified photographers, videographers, and full production crews through a transparent, structured booking ecosystem.",
    images: ["https://shotcutcrew.com/logo.jpg"],
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
