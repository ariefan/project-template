import type { Metadata } from "next";
import { Features } from "@/components/landing/features";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navigation } from "@/components/landing/navigation";
import { Stats } from "@/components/landing/stats";

export const metadata: Metadata = {
  title: "AppName - Build Something Amazing Together",
  description:
    "Transform your workflow with our powerful platform. Collaborate seamlessly, ship faster, and scale with confidence.",
  openGraph: {
    title: "AppName - Build Something Amazing Together",
    description:
      "Transform your workflow with our powerful platform. Collaborate seamlessly, ship faster, and scale with confidence.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <Stats />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
