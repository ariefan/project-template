import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type HeroProps = {
  className?: string;
};

export function Hero({ className }: HeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden py-20 sm:py-32 lg:py-40",
        className
      )}
    >
      {/* Background gradient effects */}
      <div className="-z-10 absolute inset-0">
        <div className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2">
          <div className="h-[500px] w-[500px] rounded-full bg-[oklch(0.7_0.08_280_/_0.15)] blur-3xl" />
        </div>
        <div className="absolute top-1/4 right-1/4">
          <div className="h-[300px] w-[300px] rounded-full bg-[oklch(0.65_0.1_320_/_0.1)] blur-3xl" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Headline with gradient */}
          <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-bold text-[clamp(2.5rem,5vw,4rem)] text-transparent leading-tight tracking-tight">
            Build Something Amazing Together
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Transform your workflow with our powerful platform. Collaborate
            seamlessly, ship faster, and scale with confidence.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="group" size="lg">
              <Link href="/login">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>

          {/* Optional: Trust indicators */}
          <div className="mt-12 flex items-center justify-center gap-8 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Free 14-day trial</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
