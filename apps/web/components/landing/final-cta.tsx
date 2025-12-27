import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type FinalCTAProps = {
  className?: string;
};

export function FinalCTA({ className }: FinalCTAProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden py-20 sm:py-28 lg:py-32",
        className
      )}
      id="cta"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[oklch(0.3_0.05_260)] to-[oklch(0.25_0.03_320)]" />

      {/* Glow effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-[oklch(0.6_0.2_280_/_0.2)] blur-3xl" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold text-3xl text-white tracking-tight sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Join thousands of teams already building amazing products. Start
            your free trial today, no credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              className="group shadow-xl"
              size="lg"
              variant="secondary"
            >
              <Link href="/login">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              className="text-white hover:bg-white/10 hover:text-white"
              size="lg"
              variant="ghost"
            >
              <Link href="#features">View Pricing</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
