"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Check, Rocket } from "lucide-react";
import Link from "next/link";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  featureName,
}: UpgradeModalProps) {
  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="overflow-hidden border-border/50 p-0 shadow-2xl sm:max-w-[500px]">
        <div className="flex flex-col items-center space-y-4 bg-primary/5 p-8 text-center">
          <div className="flex h-16 w-16 rotate-3 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-300 hover:rotate-0">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-black text-3xl uppercase italic tracking-tighter">
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription className="font-medium text-lg text-muted-foreground italic">
              {featureName ? (
                <>
                  The{" "}
                  <span className="text-foreground underline decoration-2 decoration-primary underline-offset-4">
                    {featureName}
                  </span>{" "}
                  feature is not available on your current plan.
                </>
              ) : (
                "You've reached a limit on your current plan."
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-8">
          <p className="text-center font-semibold text-muted-foreground/60 text-sm uppercase tracking-widest">
            Upgrade to Pro to unlock:
          </p>

          <div className="grid grid-cols-1 gap-4">
            {[
              "Unlimited API Requests",
              "Advanced Analytics & Reporting",
              "Priority 24/7 Support",
              "Custom Branding & Domains",
            ].map((feature, i) => (
              <div
                className="flex items-center gap-3 font-bold text-sm italic"
                key={i}
              >
                <div className="rounded-full bg-primary/10 p-1">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                {feature}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              asChild
              className="h-14 font-black text-lg uppercase tracking-tight shadow-primary/20 shadow-xl"
              size="lg"
            >
              <Link href="/pricing" onClick={onClose}>
                Choose a Pro Plan
              </Link>
            </Button>
            <Button
              className="font-bold text-muted-foreground"
              onClick={onClose}
              variant="ghost"
            >
              Maybe later
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
      </DialogContent>
    </Dialog>
  );
}
