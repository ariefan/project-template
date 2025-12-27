"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { ModeToggle } from "@/components/layouts/header/mode-toggle";

type NavigationProps = {
  className?: string;
};

export function Navigation({ className }: NavigationProps) {
  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full border-border/40 border-b bg-background/80 backdrop-blur-xl transition-all duration-300",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link className="flex items-center space-x-2" href="/">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.7_0.15_260)] to-[oklch(0.65_0.12_320)]">
              <span className="font-bold text-lg text-white">A</span>
            </div>
            <span className="font-bold text-xl">AppName</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            <Link
              className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="#features"
            >
              Features
            </Link>
            <Link
              className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="#stats"
            >
              Pricing
            </Link>
            <Link
              className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="#cta"
            >
              About
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            <ModeToggle variant="auto" />
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
