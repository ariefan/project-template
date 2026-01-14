"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { Eye, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth";

/**
 * Banner displayed when an admin is impersonating another user.
 * Shows at the top of the app with a button to stop impersonating.
 */
export function ImpersonationBanner() {
  const router = useRouter();
  const { data: session, refetch } = useSession();

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
    onSuccess: async () => {
      await refetch();
      router.refresh();
    },
  });

  if (!isImpersonating) {
    return null;
  }

  const userName = session?.user?.name || session?.user?.email || "this user";

  return (
    <Alert className="mb-4 border-amber-500/50 bg-amber-500/10 text-amber-600 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-400">
      <Eye className="size-5" />
      <AlertTitle className="font-semibold tracking-tight">
        Impersonation Active
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          You are currently viewing the app as <strong>{userName}</strong>.
        </span>
        <Button
          className="shrink-0"
          disabled={stopImpersonationMutation.isPending}
          onClick={() => stopImpersonationMutation.mutate()}
          size="sm"
          variant="outline"
        >
          {stopImpersonationMutation.isPending ? (
            <Spinner className="mr-2" />
          ) : (
            <LogOut className="mr-2 size-4" />
          )}
          Stop Impersonating
        </Button>
      </AlertDescription>
    </Alert>
  );
}
