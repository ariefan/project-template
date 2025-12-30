import type { ReactNode } from "react";

interface LandingLayoutProps {
  children: ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return <>{children}</>;
}
