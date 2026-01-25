import type { ReactNode } from "react";
import { ImpersonationBanner } from "@/components/layouts/impersonation-banner";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <ImpersonationBanner />
      <div className="flex-1 overflow-auto bg-muted/50 p-4 pt-12 md:p-8 md:pt-16">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
