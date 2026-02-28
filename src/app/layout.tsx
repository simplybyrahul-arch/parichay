import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'), // Replace with production URL when deploying
  title: {
    default: "Parichay | AI-Enabled Creative Production Marketplace",
    template: "%s | Parichay"
  },
  description: "Connect with verified photographers, videographers, and full production crews through a transparent, structured booking ecosystem.",
  keywords: ["photography", "videography", "production crew", "creative marketplace", "book photographers", "find videographers", "Parichay"],
  authors: [{ name: "Parichay Team" }],
  creator: "Parichay",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    title: "Parichay | AI-Enabled Creative Production Marketplace",
    description: "Connect with verified photographers, videographers, and full production crews through a transparent, structured booking ecosystem.",
    siteName: "Parichay",
    images: [
      {
        url: "/og-image.jpg", // Create this in public folder later
        width: 1200,
        height: 630,
        alt: "Parichay - Creative Production Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parichay | AI-Enabled Creative Production Marketplace",
    description: "Connect with verified photographers, videographers, and full production crews through a transparent, structured booking ecosystem.",
    images: ["/og-image.jpg"],
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
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased text-stone-900 bg-[#fffcf8] selection:bg-orange-500/30`} >
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
