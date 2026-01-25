"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { Eye, LogOut } from "lucide-react";
import * as React from "react";
import { authClient, useSession } from "@/lib/auth";

/**
 * Banner displayed when an admin is impersonating another user.
 * Shows at the top of the app with a button to stop impersonating.
 */
export function ImpersonationBanner() {
  // const router = useRouter(); // Unused
  const { data: session } = useSession(); // Removed unused refetch
  const [mounted, setMounted] = React.useState(false); // Added mounted state

  React.useEffect(() => {
    // Added useEffect for mounted state
    setMounted(true);
  }, []);

  // Check if current session is an impersonation session
  // Better Auth sets `impersonatedBy` on the session when impersonating
  const impersonatedBy = (session?.session as { impersonatedBy?: string })
    ?.impersonatedBy;
  const isImpersonating = Boolean(impersonatedBy);

  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      // @ts-expect-error - Better Auth admin.stopImpersonating exists at runtime
      const result = await authClient.admin.stopImpersonating();
      if (result.error) {
        throw new Error(result.error.message || "Failed to stop impersonating");
      }
      return result;
    },
    onSuccess: () => {
      // Force a hard redirect to the dashboard to restore the admin's context
      window.location.href = "/dashboard";
    },
  });

  if (!(mounted && isImpersonating)) {
    return null;
  }

  const userName = session?.user?.name || session?.user?.email || "this user";

  return (
    <div className="sticky top-0 z-50 flex h-12 w-full items-center justify-between border-amber-500/20 border-b bg-amber-50 px-4 text-amber-900 shadow-sm dark:bg-amber-950/50 dark:text-amber-200">
      <div className="flex items-center gap-2 font-medium text-sm">
        <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-amber-500 text-white">
          <Eye className="size-3.5" />
        </div>
        <span>
          Viewing as <strong className="font-bold">{userName}</strong>
        </span>
        <span className="hidden text-amber-500/60 sm:inline">•</span>
        <span className="hidden text-amber-500/80 text-xs sm:inline">
          Administrative Impersonation Active
        </span>
      </div>

      <Button
        className="h-8 border-amber-500/50 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-500/50"
        disabled={stopImpersonationMutation.isPending}
        onClick={() => stopImpersonationMutation.mutate()}
        size="sm"
        variant="default"
      >
        {stopImpersonationMutation.isPending ? (
          <Spinner className="mr-2 h-3 w-3" />
        ) : (
          <LogOut className="mr-2 size-3.5" />
        )}
        Stop Impersonating
      </Button>
    </div>
  );
}
