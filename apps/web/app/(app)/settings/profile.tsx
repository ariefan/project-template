"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { Label } from "@workspace/ui/components/label";
import {
  type CompressedFileWithPreview,
  ImageUploader,
} from "@workspace/ui/composed/file-upload";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  Camera,
  Check,
  Loader2,
  MailCheck,
  MailX,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, useActiveOrganization, useSession } from "@/lib/auth";
import { env } from "@/lib/env";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component requires multiple state handlers
export function ProfileTab() {
  const { data: session, isPending: sessionLoading } = useSession();

  // Derived state for phone button text
  const phoneButtonText = session?.user?.phoneNumberVerified
    ? "Update"
    : "Verify";
  const { data: organization } = useActiveOrganization();
  const user = session?.user;

  // Form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [image, setImage] = useState<string | null>(null);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Initialize form when user loads
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setUsername(user.username ?? "");
      setPhoneNumber(user.phoneNumber ?? "");
      setImage(user.image ?? null);
    }
  }, [user]);

  // Prevent flash or redirect if session is loading
  if (sessionLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Save basic profile (name, image)
  async function handleProfileSave() {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      await authClient.updateUser({
        name,
        image,
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  // Update username
  async function handleUsernameUpdate() {
    setIsUpdatingUsername(true);
    try {
      // @ts-expect-error - Better Auth username.update exists at runtime
      await authClient.username.update({
        username: username || undefined,
      });
      toast.success("Username updated successfully");
    } catch (error) {
      toast.error("Failed to update username");
      console.error(error);
    } finally {
      setIsUpdatingUsername(false);
    }
  }

  // Update phone number (will trigger OTP)
  async function handlePhoneUpdate() {
    setIsUpdatingPhone(true);
    try {
      // @ts-expect-error - Better Auth phoneNumber.update exists at runtime
      await authClient.phoneNumber.update({
        phoneNumber: phoneNumber || undefined,
      });
      toast.success("Verification code sent to your phone");
      setIsOtpDialogOpen(true);
    } catch (error) {
      toast.error("Failed to update phone number");
      console.error(error);
    } finally {
      setIsUpdatingPhone(false);
    }
  }

  // Mock OTP verification
  async function handleOtpVerify() {
    if (otpValue.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      // In the future, this would call authClient.phoneNumber.verify({ phoneNumber, code: otpValue })
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Phone number verified successfully! (Mock)");
      setIsOtpDialogOpen(false);
    } catch (error) {
      toast.error("Incorrect verification code");
      console.error(error);
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  // Resend email verification
  async function handleResendVerification() {
    setIsVerifyingEmail(true);
    try {
      // @ts-expect-error - Better Auth sendVerificationEmail exists at runtime
      await authClient.sendVerificationEmail();
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      toast.error("Failed to send verification email");
      console.error(error);
    } finally {
      setIsVerifyingEmail(false);
    }
  }

  // Handle image upload to storage
  const uploadAvatar = async (files: CompressedFileWithPreview[]) => {
    const file = files[0];
    if (!(file && organization?.id)) {
      if (!organization?.id) {
        toast.error("No active organization found for storage");
      }
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open(
          "POST",
          `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${organization.id}/files`
        );

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              // Assuming the API returns the file object with a URL or ID that can be turned into a URL
              // Based on storage-tester, we'll need to get the download URL or public URL
              // For now, let's assume it returns { data: { id, url, ... } }
              resolve(
                data.data?.url ||
                  `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${organization.id}/files/${data.data?.id}/download`
              );
            } catch {
              reject(new Error("Failed to parse upload response"));
            }
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      setImage(response);
      setIsImageDialogOpen(false);
      toast.success("Image uploaded. Don't forget to save changes!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image"
      );
      console.error(error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Remove image
  function handleRemoveImage() {
    setImage(null);
  }

  const isEmailVerified = user?.emailVerified ?? false;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your personal information and profile picture
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-10 md:flex-row">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="group relative">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-background bg-muted shadow-xl ring-1 ring-muted transition-transform duration-300 group-hover:scale-[1.02]">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  // biome-ignore lint/performance/noImgElement: User uploaded avatar
                  <img
                    alt={name}
                    className="h-full w-full object-cover"
                    height={128}
                    src={image}
                    width={128}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30 font-bold text-4xl text-primary/40">
                    {name?.charAt(0).toUpperCase() || (
                      <UserIcon className="h-12 w-12" />
                    )}
                  </div>
                )}
              </div>

              <Dialog
                onOpenChange={setIsImageDialogOpen}
                open={isImageDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="absolute right-0 bottom-0 h-9 w-9 rounded-full border-2 border-background p-0 shadow-lg"
                    size="icon"
                    variant="secondary"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Update Profile Picture</DialogTitle>
                    <DialogDescription>
                      Upload, crop, and compress your profile picture
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <ImageUploader
                      defaultOptions={{
                        maxSizeMB: 0.5,
                        maxWidthOrHeight: 400,
                      }}
                      isUploading={isUploadingImage}
                      onConfirm={uploadAvatar}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {image && (
              <Button
                className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleRemoveImage}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove Photo
              </Button>
            )}
          </div>

          {/* Form Section */}
          <div className="flex-1 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  value={name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground text-sm">
                      @
                    </span>
                    <Input
                      className="pl-7"
                      id="username"
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      value={username}
                    />
                  </div>
                  <Button
                    disabled={isUpdatingUsername || username === user?.username}
                    onClick={handleUsernameUpdate}
                    type="button"
                    variant="outline"
                  >
                    {isUpdatingUsername ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    disabled
                    id="email"
                    type="email"
                    value={user?.email ?? ""}
                  />
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    {isEmailVerified ? (
                      <div className="flex items-center gap-1 font-semibold text-green-600 text-xs">
                        <MailCheck className="h-3.5 w-3.5" />
                        <span>VERIFIED</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-semibold text-amber-600 text-xs">
                        <MailX className="h-3.5 w-3.5" />
                        <span>UNVERIFIED</span>
                      </div>
                    )}
                  </div>
                </div>
                {!isEmailVerified && (
                  <Button
                    disabled={isVerifyingEmail}
                    onClick={handleResendVerification}
                    type="button"
                    variant="outline"
                  >
                    {isVerifyingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Resend"
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  type="tel"
                  value={phoneNumber}
                />
                <Button
                  disabled={
                    isUpdatingPhone || phoneNumber === user?.phoneNumber
                  }
                  onClick={handlePhoneUpdate}
                  type="button"
                  variant="outline"
                >
                  {isUpdatingPhone ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    phoneButtonText
                  )}
                </Button>
              </div>
              {user?.phoneNumberVerified && (
                <p className="flex items-center gap-1 font-medium text-green-600 text-xs">
                  <Check className="h-3 w-3" />
                  Phone number is verified
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t py-4">
        <p className="text-muted-foreground text-xs italic">
          Profile information is shared across your active organization. Last
          updated:{" "}
          {new Date(user?.updatedAt ?? Date.now()).toLocaleDateString()}
        </p>
        <Button disabled={isSaving} onClick={handleProfileSave}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </CardFooter>

      {/* OTP Verification Dialog */}
      <Dialog onOpenChange={setIsOtpDialogOpen} open={isOtpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Phone Number</DialogTitle>
            <DialogDescription>
              We've sent a 6-digit verification code to {phoneNumber}. Enter it
              below to verify your number.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <InputOTP
              maxLength={6}
              onChange={setOtpValue}
              onComplete={handleOtpVerify}
              pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
              value={otpValue}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-muted-foreground text-sm">
              Didn't receive the code?{" "}
              <button
                className="text-primary hover:underline"
                onClick={handlePhoneUpdate}
                type="button"
              >
                Resend
              </button>
            </p>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={isVerifyingOtp || otpValue.length !== 6}
              onClick={handleOtpVerify}
            >
              {isVerifyingOtp && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
