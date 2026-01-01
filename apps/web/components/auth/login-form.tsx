"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { SiGithub } from "react-icons/si";
import { authClient } from "@/lib/auth";

interface LoginFormProps extends React.ComponentProps<"form"> {
  className?: string;
}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function isEmail(value: string): boolean {
    return value.includes("@");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Username sign-in is provided by usernameClient plugin (types not inferred)
      const signIn = authClient.signIn as typeof authClient.signIn & {
        username: (opts: {
          username: string;
          password: string;
        }) => Promise<{ error?: { message?: string } }>;
      };

      const result = isEmail(identifier)
        ? await signIn.email({ email: identifier, password })
        : await signIn.username({ username: identifier, password });

      if (result.error) {
        setError(result.error.message ?? "Failed to sign in");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialSignIn(provider: "google" | "github") {
    setError(null);
    setIsLoading(true);

    try {
      await authClient.signIn.social({
        provider,
        callbackURL: redirectTo,
      });
    } catch {
      setError(`Failed to sign in with ${provider}`);
      setIsLoading(false);
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-bold text-2xl">Login to your account</h1>
          <p className="text-balance text-muted-foreground text-sm">
            Enter your email or username below to login
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-center text-destructive text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="identifier">Email or Username</FieldLabel>
          <Input
            autoComplete="username"
            disabled={isLoading}
            id="identifier"
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="email@example.com or username"
            required
            type="text"
            value={identifier}
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              className="ml-auto text-sm underline-offset-4 hover:underline"
              href="/forgot-password"
              tabIndex={-1}
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            autoComplete="current-password"
            disabled={isLoading}
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </Field>

        <Field>
          <Button disabled={isLoading} type="submit">
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </Field>

        <FieldSeparator>Or continue with</FieldSeparator>

        <Field>
          <Button
            disabled={isLoading}
            onClick={() => handleSocialSignIn("google")}
            type="button"
            variant="outline"
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
          <Button
            disabled={isLoading}
            onClick={() => handleSocialSignIn("github")}
            type="button"
            variant="outline"
          >
            <SiGithub className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <Link className="underline underline-offset-4" href="/register">
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
