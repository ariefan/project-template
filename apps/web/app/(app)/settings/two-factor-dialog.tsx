"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth";

export function TwoFactorDialog() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"initial" | "verify">("initial");
  const [_qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [_backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const is2FAEnabled = session?.user?.twoFactorEnabled;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="outline">Configure</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            {is2FAEnabled
              ? "Two-factor authentication is currently enabled."
              : "Protect your account with an extra layer of security."}
          </DialogDescription>
        </DialogHeader>

        {is2FAEnabled ? (
          <div className="space-y-4">
            <p className="text-sm">
              Your account is secured with 2FA. To disable it, click the button
              below.
            </p>
            <Button
              onClick={() => {
                // handle disable
                toast.info(
                  "Disabling 2FA is not fully implemented yet without password re-entry."
                );
              }}
              variant="destructive"
            >
              Disable 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              Enabling 2FA will require you to enter a code from your
              authenticator app every time you log in.
            </p>
            {step === "initial" && (
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  id="password-2fa"
                  placeholder="Enter password to continue"
                  type="password"
                />
                <Button
                  disabled={loading}
                  onClick={async () => {
                    const pw = (
                      document.getElementById(
                        "password-2fa"
                      ) as HTMLInputElement
                    ).value;
                    if (!pw) {
                      toast.error("Password required");
                      return;
                    }

                    setLoading(true);
                    try {
                      // Type assertion to workaround type checking issues with external library types
                      // in this specific monorepo setup where types might not propagate correctly
                      // @ts-expect-error
                      const res = await authClient.twoFactor.enable({
                        password: pw,
                      });
                      if (res.data) {
                        setSecret(res.data.secret);
                        setQrCode(res.data.totpURI);
                        setBackupCodes(res.data.backupCodes);
                        setStep("verify");
                      } else {
                        toast.error(
                          res.error?.message || "Failed to start 2FA setup"
                        );
                      }
                    } catch (e) {
                      toast.error("Error starting 2FA");
                      console.error(e);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue setup
                </Button>
              </div>
            )}

            {step === "verify" && (
              <div className="space-y-4">
                <div className="break-all rounded-lg bg-muted p-4 font-mono text-xs">
                  <p className="mb-2 font-bold">Secret Key: {secret}</p>
                  <p className="text-muted-foreground">
                    Scan the QR code or enter the secret key in your
                    authenticator app.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    maxLength={6}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    value={totpCode}
                  />
                  <Button
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        // @ts-expect-error
                        const res = await authClient.twoFactor.verifyTotp({
                          code: totpCode,
                        });
                        if (res.data) {
                          toast.success("2FA Enabled Successfully!");
                          setOpen(false);
                        } else {
                          toast.error("Invalid code");
                        }
                      } catch (_e) {
                        toast.error("Verification failed");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Verify and Enable
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
