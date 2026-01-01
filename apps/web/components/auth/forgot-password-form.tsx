"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth";

interface ForgotPasswordFormProps extends React.ComponentProps<"form"> {
  className?: string;
}

export function ForgotPasswordForm({
  className,
  ...props
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // forgetPassword is available at runtime but may not be in the type definitions
      // @ts-expect-error - Better Auth method available via emailAndPassword plugin
      const result = await authClient.forgetPassword({
        email,
        redirectTo: "/reset-password",
      });

      if (result?.error) {
        setError(result.error.message ?? "Failed to send reset email");
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="font-bold text-2xl">Check your email</h1>
          <p className="text-balance text-muted-foreground text-sm">
            We&apos;ve sent a password reset link to <strong>{email}</strong>.
            Click the link in the email to reset your password.
          </p>
          <p className="text-muted-foreground text-xs">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <button
              className="underline underline-offset-4"
              onClick={() => setIsSuccess(false)}
              type="button"
            >
              try again
            </button>
          </p>
        </div>
        <Link
          className="flex items-center justify-center gap-2 text-sm underline-offset-4 hover:underline"
          href="/login"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-bold text-2xl">Forgot your password?</h1>
          <p className="text-balance text-muted-foreground text-sm">
            Enter your email address and we&apos;ll send you a link to reset
            your password
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-center text-destructive text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            autoComplete="email"
            disabled={isLoading}
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="m@example.com"
            required
            type="email"
            value={email}
          />
        </Field>

        <Field>
          <Button disabled={isLoading} type="submit">
            {isLoading ? "Sending..." : "Send reset link"}
          </Button>
          <FieldDescription className="text-center">
            Remember your password?{" "}
            <Link className="underline underline-offset-4" href="/login">
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
