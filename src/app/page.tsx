import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { ProblemSolution } from "@/components/ProblemSolution";
import { HowItWorks } from "@/components/HowItWorks";
import { CoreFeatures } from "@/components/CoreFeatures";
import { TrustSection } from "@/components/TrustSection";
import { CreatorTiersAndAudience } from "@/components/CreatorTiersAndAudience";
import { AboutCredibility } from "@/components/AboutCredibility";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShotcutCrew | Verified Creative Production Marketplace",
  description: "Plan, assemble and execute on demand. ShotcutCrew connects clients with verified photographers, videographers, editors, studios and equipment providers.",
  openGraph: {
    title: "ShotcutCrew | Verified Creative Production Marketplace",
    description: "Plan, assemble and execute on demand. ShotcutCrew connects clients with verified photographers, videographers, editors, studios and equipment providers.",
  },
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ShotcutCrew",
    url: "https://shotcutcrew.com",
    logo: "https://shotcutcrew.com/logo.jpg",
    description: "AI-powered planning, verified creators, coordinator support, and transparent payment tracking.",
    sameAs: [
      "https://x.com/shotcutcrew",
      "https://www.instagram.com/shotcutcrew",
      "https://www.linkedin.com/company/shotcutcrew"
    ]
  };

  return (
    <main className="relative min-h-screen flex flex-col w-full selection:bg-orange-500/30 selection:text-stone-900 bg-[#fffcf8] overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,244,230,0.95)_0%,rgba(255,250,244,0.86)_24%,rgba(255,249,243,0.92)_52%,rgba(255,247,240,0.96)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_12%,rgba(251,146,60,0.14),transparent_26%),radial-gradient(circle_at_82%_14%,rgba(244,114,182,0.1),transparent_24%),radial-gradient(circle_at_50%_58%,rgba(251,191,36,0.08),transparent_30%),radial-gradient(circle_at_78%_88%,rgba(56,189,248,0.08),transparent_22%)]" />
      <div className="relative z-10 flex flex-col w-full">
        <Header />
        <Hero />
        <SocialProof />
        <ProblemSolution />
        <HowItWorks />
        <CoreFeatures />
        <TrustSection />
        <CreatorTiersAndAudience />
        <AboutCredibility />
        <FAQ />
        <Footer />
      </div>
    </main>
  );
}
