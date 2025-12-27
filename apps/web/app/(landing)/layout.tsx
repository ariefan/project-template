import type { ReactNode } from "react";

type LandingLayoutProps = {
  children: ReactNode;
};

export default function LandingLayout({ children }: LandingLayoutProps) {
  return <>{children}</>;
}
