"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { DeleteAccountDialog } from "./profile-delete-dialog";
import { TwoFactorDialog } from "./security-2fa-dialog";
import { PasskeyDialog } from "./security-passkey-dialog";
import { ChangePasswordDialog } from "./security-password-dialog";
import { SessionsCard } from "./security-sessions";

export function SecurityTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>
          Manage your security preferences and authentication methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-muted-foreground text-sm">
                Add an extra layer of security to your account
              </p>
            </div>
            <TwoFactorDialog />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Passkeys</p>
              <p className="text-muted-foreground text-sm">
                Use biometric authentication for passwordless login
              </p>
            </div>
            <PasskeyDialog />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-muted-foreground text-sm">
                Update your account password
              </p>
            </div>
            <ChangePasswordDialog />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Active Sessions</p>
              <p className="text-muted-foreground text-sm">
                View and manage your active sessions
              </p>
            </div>
            <SessionsCard />
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-4 font-medium text-destructive text-lg">
            Danger Zone
          </h3>
          <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-muted-foreground text-sm">
                Permanently delete your account and all data
              </p>
            </div>
            <DeleteAccountDialog />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
