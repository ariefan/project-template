"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";

type VerificationStatus = "loading" | "success" | "error" | "no-token";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerificationStatus>(
    token ? "loading" : "no-token"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function verifyEmail() {
      try {
        const result = await authClient.verifyEmail({
          query: { token: token as string },
        });

        if (result.error) {
          setError(result.error.message ?? "Verification failed");
          setStatus("error");
          return;
        }

        setStatus("success");
      } catch {
        setError("An unexpected error occurred");
        setStatus("error");
      }
    }

    verifyEmail();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h1 className="font-bold text-2xl">Verifying your email...</h1>
        <p className="text-muted-foreground text-sm">Please wait a moment.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="font-bold text-2xl">Email verified!</h1>
        <p className="text-balance text-muted-foreground text-sm">
          Your email has been verified. You can now access all features.
        </p>
        <Link
          className="text-sm underline underline-offset-4"
          href="/dashboard"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (status === "no-token") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <XCircle className="h-6 w-6 text-yellow-600" />
        </div>
        <h1 className="font-bold text-2xl">No verification token</h1>
        <p className="text-balance text-muted-foreground text-sm">
          Please use the link from your verification email. If you need a new
          verification email, please sign in and request one from your account
          settings.
        </p>
        <Link className="text-sm underline underline-offset-4" href="/login">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <XCircle className="h-6 w-6 text-destructive" />
      </div>
      <h1 className="font-bold text-2xl">Verification failed</h1>
      <p className="text-balance text-muted-foreground text-sm">
        {error ?? "The verification link may have expired or is invalid."}
      </p>
      <p className="text-muted-foreground text-xs">
        Please sign in to request a new verification email from your account
        settings.
      </p>
      <Link className="text-sm underline underline-offset-4" href="/login">
        Back to login
      </Link>
    </div>
  );
}
