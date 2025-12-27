import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Code, Headphones, Shield, Zap } from "lucide-react";

type FeaturesProps = {
  className?: string;
};

const features = [
  {
    icon: Zap,
    title: "Fast & Reliable",
    description:
      "Lightning-fast performance with 99.9% uptime guaranteed. Built on modern infrastructure for maximum reliability.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description:
      "Enterprise-grade security with end-to-end encryption. Your data is protected with industry-leading standards.",
  },
  {
    icon: Code,
    title: "Easy Integration",
    description:
      "Seamlessly integrate with your existing tools. Comprehensive APIs and SDKs for all major platforms.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description:
      "Expert support team available around the clock. Get help whenever you need it, wherever you are.",
  },
];

export function Features({ className }: FeaturesProps) {
  return (
    <section className={cn("py-16 sm:py-24 lg:py-32", className)} id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold text-3xl tracking-tight sm:text-4xl">
            Everything you need to succeed
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features designed to help you build, ship, and scale with
            confidence.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                className="group hover:-translate-y-1 relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-md transition-all duration-300 hover:border-border hover:shadow-xl"
                key={feature.title}
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.7_0.15_260)] to-[oklch(0.65_0.12_320)]">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
