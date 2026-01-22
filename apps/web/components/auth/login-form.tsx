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
import { CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { SiGithub } from "react-icons/si";
import { authClient } from "@/lib/auth";

interface LoginFormProps extends React.ComponentProps<"form"> {
  className?: string;
}

type LoginMode = "password" | "magic-link";

export function LoginForm({ className, ...props }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  function isEmail(value: string): boolean {
    return value.includes("@");
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  async function handleMagicLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!isEmail(identifier)) {
      setError("Please enter a valid email address for magic link login");
      return;
    }

    setIsLoading(true);

    try {
      // magicLink method is provided by magicLinkClient plugin (types not inferred)
      const signIn = authClient.signIn as typeof authClient.signIn & {
        magicLink: (opts: {
          email: string;
          callbackURL: string;
        }) => Promise<{ error?: { message?: string } }>;
      };

      const result = await signIn.magicLink({
        email: identifier,
        callbackURL: redirectTo,
      });

      if (result.error) {
        setError(result.error.message ?? "Failed to send magic link");
        return;
      }

      setMagicLinkSent(true);
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

  const getButtonText = () => {
    if (isLoading) {
      return loginMode === "password" ? "Signing in..." : "Sending...";
    }
    return loginMode === "password" ? "Login" : "Send Magic Link";
  };

  // Magic link sent confirmation
  if (magicLinkSent) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
            <h1 className="font-bold text-2xl">Check your email</h1>
            <p className="text-balance text-muted-foreground text-sm">
              We've sent a magic link to <strong>{identifier}</strong>.
              <br />
              Click the link in the email to sign in.
            </p>
          </div>

          <Field>
            <Button
              onClick={() => {
                setMagicLinkSent(false);
                setIdentifier("");
              }}
              type="button"
              variant="outline"
            >
              Use a different email
            </Button>
          </Field>
        </FieldGroup>
      </div>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={
        loginMode === "password" ? handlePasswordSubmit : handleMagicLinkSubmit
      }
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-bold text-2xl">Login to your account</h1>
          <p className="text-balance text-muted-foreground text-sm">
            {loginMode === "password"
              ? "Enter your email or username below to login"
              : "Enter your email to receive a magic link"}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-center text-destructive text-sm">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="identifier">
            {loginMode === "password" ? "Email or Username" : "Email"}
          </FieldLabel>
          <Input
            autoComplete="username"
            disabled={isLoading}
            id="identifier"
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              loginMode === "password"
                ? "email@example.com or username"
                : "email@example.com"
            }
            required
            type={loginMode === "password" ? "text" : "email"}
            value={identifier}
          />
        </Field>

        {loginMode === "password" && (
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
        )}

        <Field>
          <Button disabled={isLoading} type="submit">
            {getButtonText()}
          </Button>
        </Field>

        {/* Toggle between password and magic link */}
        <Field>
          <Button
            className="gap-2"
            disabled={isLoading}
            onClick={() => {
              setLoginMode(
                loginMode === "password" ? "magic-link" : "password"
              );
              setError(null);
            }}
            type="button"
            variant="ghost"
          >
            <Mail className="h-4 w-4" />
            {loginMode === "password"
              ? "Sign in with Magic Link"
              : "Sign in with Password"}
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

        <div className="mt-2 text-center text-muted-foreground text-xs">
          <p className="mb-2 font-medium uppercase tracking-wider">
            Demo Accounts
          </p>
          <div className="grid gap-2">
            {[
              { email: "admin@example.com", label: "Owner" },
              { email: "user@example.com", label: "Member" },
              { email: "viewer@example.com", label: "Viewer" },
              { email: "onboarding@example.com", label: "No Org" },
            ].map((creds) => (
              <Button
                className="h-8 w-full justify-between font-normal"
                key={creds.email}
                onClick={() => {
                  setIdentifier(creds.email);
                  setPassword("password123");
                  setLoginMode("password");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <code className="bg-muted px-1 py-0.5">{creds.email}</code>
                <span className="text-muted-foreground">{creds.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </FieldGroup>
    </form>
  );
}
