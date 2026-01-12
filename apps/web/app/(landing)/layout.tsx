import type { ReactNode } from "react";
import { Footer } from "@/components/landing/footer";
import { Navigation } from "@/components/landing/navigation";

interface LandingLayoutProps {
  children: ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <Navigation />
      {children}
      <Footer />
    </div>
  );
}
