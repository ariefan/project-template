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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth";

export function TwoFactorDialog() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"initial" | "verify" | "success">("initial");
  const [_qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [_backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [method, setMethod] = useState<"totp" | "sms">("totp");

  const is2FAEnabled = session?.user?.twoFactorEnabled;

  function handleDownloadCodes() {
    if (!_backupCodes) {
      return;
    }
    const text = _backupCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function verifyTotp(code: string) {
    // @ts-expect-error - verifyTotp exists
    const res = await authClient.twoFactor.verifyTotp({
      code,
    });
    return res;
  }

  async function enableSms(password: string, code: string) {
    // @ts-expect-error - enable exists
    const res = await authClient.twoFactor.enable({
      password,
      code,
    });
    return res;
  }

  function handleSuccess(codes: string[] | null) {
    if (codes) {
      setStep("success");
    } else {
      setOpen(false);
    }
  }

  async function handleTotpVerify() {
    const res = await verifyTotp(totpCode);
    if (res.data) {
      toast.success("2FA Enabled Successfully!");
      // If we have backup codes (likely from enable step earlier), show them.
      // Otherwise close.
      handleSuccess(_backupCodes);
    } else {
      toast.error("Invalid code");
    }
  }

  async function handleSmsVerify(password: string) {
    const res = await enableSms(password, totpCode);
    if (res.data) {
      toast.success("SMS 2FA Enabled Successfully!");
      setBackupCodes(res.data.backupCodes);
      // biome-ignore lint/suspicious/noExplicitAny: Res data type definition might miss backupCodes depending on version
      handleSuccess((res.data as any).backupCodes);
    } else {
      toast.error(res.error?.message || "Invalid code");
    }
  }

  // Refactored to reduce cognitive complexity
  async function handleVerifySubmit() {
    setLoading(true);
    const pw_sms = (document.getElementById("password-sms") as HTMLInputElement)
      ?.value;
    const pw_totp = (
      document.getElementById("password-totp") as HTMLInputElement
    )?.value;
    const password = pw_sms || pw_totp;

    try {
      if (method === "totp") {
        await handleTotpVerify();
      } else {
        await handleSmsVerify(password);
      }
    } catch (_e) {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  }

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
              Your account is secured with 2FA. To disable it, enter your
              password below.
            </p>
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter password to disable"
                type="password"
                value={disablePassword}
              />
              <Button
                disabled={loading || !disablePassword}
                onClick={async () => {
                  setLoading(true);
                  try {
                    // @ts-expect-error - twoFactor methods exist at runtime
                    const res = await authClient.twoFactor.disable({
                      password: disablePassword,
                    });
                    if (res.error) {
                      toast.error(res.error.message || "Failed to disable 2FA");
                    } else {
                      toast.success("2FA disabled successfully");
                      setOpen(false);
                      setDisablePassword("");
                    }
                  } catch (_e) {
                    toast.error("Error disabling 2FA");
                  } finally {
                    setLoading(false);
                  }
                }}
                variant="destructive"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable 2FA
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {step === "initial" && (
              <Tabs
                defaultValue="totp"
                onValueChange={(v) => setMethod(v as "totp" | "sms")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="totp">Authenticator App</TabsTrigger>
                  <TabsTrigger value="sms">SMS</TabsTrigger>
                </TabsList>

                <TabsContent className="space-y-4 pt-4" value="totp">
                  <p className="text-sm">
                    Use an authenticator app like Google Authenticator or Authy
                    to generate verification codes.
                  </p>
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      id="password-totp"
                      placeholder="Enter password to continue"
                      type="password"
                    />
                    <Button
                      disabled={loading}
                      onClick={async () => {
                        const pw = (
                          document.getElementById(
                            "password-totp"
                          ) as HTMLInputElement
                        ).value;
                        if (!pw) {
                          toast.error("Password required");
                          return;
                        }

                        setLoading(true);
                        try {
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
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Continue with App
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent className="space-y-4 pt-4" value="sms">
                  <p className="text-sm">
                    Receive verification codes via SMS message to your mobile
                    phone.
                  </p>
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      id="password-sms"
                      placeholder="Enter password to continue"
                      type="password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      type="tel"
                      value={phoneNumber}
                    />
                    <Button
                      disabled={loading || !phoneNumber}
                      onClick={async () => {
                        const pw = (
                          document.getElementById(
                            "password-sms"
                          ) as HTMLInputElement
                        ).value;
                        if (!pw) {
                          toast.error("Password required");
                          return;
                        }

                        setLoading(true);
                        try {
                          // @ts-expect-error
                          const res = await authClient.twoFactor.sendOtp({
                            phoneNumber,
                          });

                          if (res.error) {
                            toast.error(
                              res.error.message || "Failed to send SMS"
                            );
                            return;
                          }

                          setStep("verify");
                          toast.success("OTP sent to your phone");
                        } catch (e) {
                          toast.error("Error sending SMS");
                          console.error(e);
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Send Code
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {step === "verify" && (
              <div className="space-y-4">
                {method === "totp" ? (
                  <div className="break-all rounded-lg bg-muted p-4 font-mono text-xs">
                    <p className="mb-2 font-bold">Secret Key: {secret}</p>
                    <p className="text-muted-foreground">
                      Scan the QR code or enter the secret key in your
                      authenticator app.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted p-4 text-sm">
                    <p className="mb-1 font-medium">Verify Phone Number</p>
                    <p className="text-muted-foreground">
                      Enter the code sent to {phoneNumber}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    maxLength={6}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    value={totpCode}
                  />
                  <Button disabled={loading} onClick={handleVerifySubmit}>
                    Verify and Enable
                  </Button>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-500/50 bg-green-50 p-4 dark:bg-green-950/20">
                  <h4 className="mb-2 font-medium text-green-800 text-sm dark:text-green-200">
                    2FA Enabled Successfully
                  </h4>
                  <p className="text-green-700 text-xs dark:text-green-300">
                    Please save these backup codes in a safe place. You can use
                    them to access your account if you lose your authenticator
                    device.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {_backupCodes?.map((code, i) => (
                    <div
                      className="rounded bg-muted p-2 text-center font-mono text-xs"
                      // biome-ignore lint/suspicious/noArrayIndexKey: code is not guaranteed unique, but should be
                      key={i}
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleDownloadCodes}
                    variant="outline"
                  >
                    Download Codes
                  </Button>
                  <Button className="flex-1" onClick={() => setOpen(false)}>
                    I&apos;ve Saved Them
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
