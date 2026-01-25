"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle2, Mail, Terminal } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { SiGithub } from "react-icons/si";
import { authClient } from "@/lib/auth";

interface LoginFormProps extends React.ComponentProps<"form"> {
  className?: string;
}

type LoginMode = "password" | "magic-link";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Full platform access (God Mode)",
  support: "Read-only access to all tenants",
  user: "Authenticated User (Base Role)",
  owner: "Organization Owner (Billing & Settings)",
  admin: "Organization Admin (Team Management)",
  member: "Standard Member (Read/Write)",
  viewer: "Read-only Member",
  editor: "Can publish & manage content",
  moderator: "Can manage comments & community",
  contributor: "Can draft content (Review required)",
};

export function LoginForm({ className, ...props }: LoginFormProps) {
  // ... existing code ...

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<
    Array<{ email: string; roles: string[] }>
  >([]);

  // Fetch demo accounts in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // Import env dynamically to avoid issues in non-browser context if needed,
      // but here we are in a component so static import is fine.
      // However, to keep it clean and avoid global import side-effects:
      import("@/lib/env").then(({ env }) => {
        fetch(`${env.NEXT_PUBLIC_API_URL}/v1/developer/demo-accounts`)
          .then((res) => res.json())
          .then((data) => {
            if (data.users) {
              setDemoAccounts(data.users);
            }
          })
          .catch((err) => console.error("Failed to fetch demo accounts:", err));
      });
    }
  }, []);

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

        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 flex justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 text-muted-foreground text-xs"
                  size="sm"
                  variant="ghost"
                >
                  <Terminal className="h-4 w-4" />
                  Developer Demo Accounts
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Developer Demo Accounts</DialogTitle>
                  <DialogDescription>
                    Select an account to auto-fill credentials for testing.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
                      Tenant Scope (Org)
                    </p>
                    {demoAccounts
                      ?.filter(
                        (u) =>
                          !u.roles?.some((r) =>
                            ["super_admin", "support"].includes(r)
                          )
                      )
                      .map((item) => (
                        <DialogClose asChild key={item.email}>
                          <Button
                            className="h-auto flex-col items-start px-3 py-2 text-left"
                            onClick={() => {
                              setIdentifier(item.email);
                              setPassword("password123");
                              setLoginMode("password");
                              // Small timeout to allow state update before focus
                              setTimeout(() => {
                                const submitBtn = document.querySelector(
                                  'button[type="submit"]'
                                ) as HTMLButtonElement;
                                submitBtn?.focus();
                              }, 0);
                            }}
                            variant="outline"
                          >
                            <div className="flex w-full items-center justify-between">
                              <span className="font-semibold text-xs capitalize">
                                {item.email.split("@")[0]?.replace("_", " ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {item.email}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.roles
                                // UX Best Practice: Hide "user" role entirely as it serves as the base role/noise.
                                .filter((role) => role !== "user")
                                .map((role) => (
                                  <TooltipProvider key={role}>
                                    <Tooltip delayDuration={300}>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          className="h-5 cursor-help px-1.5 font-mono font-normal text-[10px] hover:bg-secondary/80"
                                          variant="secondary"
                                        >
                                          {role}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {ROLE_DESCRIPTIONS[
                                            role as keyof typeof ROLE_DESCRIPTIONS
                                          ] || role}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                            </div>
                          </Button>
                        </DialogClose>
                      ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
                      System Scope (Global)
                    </p>
                    {demoAccounts
                      ?.filter((u) =>
                        u.roles?.some((r) =>
                          ["super_admin", "support"].includes(r)
                        )
                      )
                      .map((item) => (
                        <DialogClose asChild key={item.email}>
                          <Button
                            className="h-auto flex-col items-start px-3 py-2 text-left"
                            onClick={() => {
                              setIdentifier(item.email);
                              setPassword("password123");
                              setLoginMode("password");
                              setTimeout(() => {
                                const submitBtn = document.querySelector(
                                  'button[type="submit"]'
                                ) as HTMLButtonElement;
                                submitBtn?.focus();
                              }, 0);
                            }}
                            variant="outline"
                          >
                            <div className="flex w-full items-center justify-between">
                              <span className="font-semibold text-xs capitalize">
                                {item.email.split("@")[0]?.replace("_", " ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {item.email}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.roles
                                // UX Best Practice: Hide "user" role entirely as it serves as the base role/noise.
                                .filter((role) => role !== "user")
                                .map((role) => (
                                  <TooltipProvider key={role}>
                                    <Tooltip delayDuration={300}>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          className="h-5 cursor-help px-1.5 font-mono font-normal text-[10px] hover:bg-secondary/80"
                                          variant="secondary"
                                        >
                                          {role}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {ROLE_DESCRIPTIONS[
                                            role as keyof typeof ROLE_DESCRIPTIONS
                                          ] || role}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                            </div>
                          </Button>
                        </DialogClose>
                      ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </FieldGroup>
    </form>
  );
}
