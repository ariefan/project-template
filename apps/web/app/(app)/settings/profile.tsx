"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Loader2,
  MailCheck,
  MailX,
  RefreshCw,
  Upload,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth";

export function ProfileTab() {
  const { data: session, isPending: sessionLoading } = useSession();
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

  // Initialize form when user loads
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setUsername(user.username ?? "");
      setPhoneNumber(user.phoneNumber ?? "");
      setImage(user.image ?? null);
    }
  }, [user]);

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
    } catch (error) {
      toast.error("Failed to update phone number");
      console.error(error);
    } finally {
      setIsUpdatingPhone(false);
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

  // Handle image upload
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImage(base64);
    };
    reader.readAsDataURL(file);
  }

  // Remove image
  function handleRemoveImage() {
    setImage(null);
  }

  if (sessionLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isEmailVerified = user?.emailVerified ?? false;

  return (
    <div className="space-y-6">
      {/* Profile Image Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Add a profile picture to personalize your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                // biome-ignore lint/correctness/useImageSize: User uploaded image, size unknown
                // biome-ignore lint/performance/noImgElement: User uploaded image, dynamic source
                <img
                  alt={name}
                  className="h-full w-full object-cover"
                  src={image}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-3xl text-muted-foreground">
                  {name?.charAt(0).toUpperCase() ?? (
                    <UserIcon className="h-8 w-8" />
                  )}
                </div>
              )}
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-col gap-2">
              <div>
                <Label
                  className="cursor-pointer text-foreground text-sm hover:underline"
                  htmlFor="image-upload"
                >
                  <Upload className="mr-1 inline h-4 w-4" />
                  Upload new image
                </Label>
                <Input
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                  onChange={handleImageUpload}
                  type="file"
                />
                <p className="text-muted-foreground text-xs">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
              {image && (
                <Button
                  onClick={handleRemoveImage}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Field */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                value={name}
              />
              <p className="text-muted-foreground text-xs">
                This is your public display name
              </p>
            </div>

            {/* Username Field */}
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
                  disabled={isUpdatingUsername}
                  onClick={handleUsernameUpdate}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isUpdatingUsername ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Update"
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Unique identifier for mentions and links
              </p>
            </div>
          </div>

          {/* Email Field with Verification Status */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                disabled
                id="email"
                type="email"
                value={user?.email ?? ""}
              />
              {isEmailVerified ? (
                <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-green-600 text-sm">
                  <MailCheck className="h-4 w-4" />
                  <span>Verified</span>
                </div>
              ) : (
                <Button
                  disabled={isVerifyingEmail}
                  onClick={handleResendVerification}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isVerifyingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Verify
                    </>
                  )}
                </Button>
              )}
            </div>
            {!isEmailVerified && (
              <p className="flex items-center gap-1.5 text-amber-600 text-sm">
                <MailX className="h-4 w-4" />
                Email not verified. Check your inbox or resend verification.
              </p>
            )}
          </div>

          {/* Phone Number Field */}
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
                disabled={isUpdatingPhone}
                onClick={handlePhoneUpdate}
                size="sm"
                type="button"
                variant="outline"
              >
                {isUpdatingPhone ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Used for SMS login and two-factor authentication
            </p>
            {user?.phoneNumberVerified && (
              <p className="flex items-center gap-1.5 text-green-600 text-sm">
                <MailCheck className="h-4 w-4" />
                Phone number verified
              </p>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4 border-t pt-4">
            <Button disabled={isSaving} onClick={handleProfileSave}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <p className="text-muted-foreground text-sm">
              Changes are saved immediately
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
