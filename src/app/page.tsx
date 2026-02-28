import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { ProblemSolution } from "@/components/ProblemSolution";
import { HowItWorks } from "@/components/HowItWorks";
import { CoreFeatures } from "@/components/CoreFeatures";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { DynamicBackground } from "@/components/DynamicBackground";
import { Header } from "@/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parichay | The Creative Production Marketplace",
  description: "Book verified photographers, videographers, and pro crews instantly. Streamline your creative production with Parichay.",
  openGraph: {
    title: "Parichay | The Creative Production Marketplace",
    description: "Book verified photographers, videographers, and pro crews instantly. Streamline your creative production with Parichay.",
  },
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Parichay",
    url: "https://parichay.com", // Replace
    logo: "https://parichay.com/logo.png", // Replace
    description: "AI-Enabled Creative Production Marketplace connecting clients with verified creative professionals.",
    sameAs: [
      "https://twitter.com/parichay",
      "https://instagram.com/parichay"
    ]
  };

  return (
    <main className="min-h-screen flex flex-col w-full selection:bg-orange-500/30 selection:text-stone-900 bg-transparent">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DynamicBackground />
      <div className="relative z-10 flex flex-col w-full">
        <Header />
        <Hero />
        <SocialProof />
        <ProblemSolution />
        <HowItWorks />
        <CoreFeatures />
        <FAQ />
        <Footer />
      </div>
    </main>
  );
}
