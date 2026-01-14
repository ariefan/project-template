"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item";
import { DeleteAccountDialog } from "./profile-delete-dialog";
import { TwoFactorDialog } from "./security-2fa-dialog";
import { ApiKeysDialog } from "./security-api-keys";
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
        <ItemGroup className="rounded-lg border" title="Authentication">
          <Item>
            <ItemContent className="gap-1">
              <ItemTitle>Password</ItemTitle>
              <ItemDescription>
                Change your password to keep your account secure
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChangePasswordDialog />
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item>
            <ItemContent className="gap-1">
              <ItemTitle>Two-Factor Authentication</ItemTitle>
              <ItemDescription>
                Add an extra layer of security to your account
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <TwoFactorDialog />
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item>
            <ItemContent className="gap-1">
              <ItemTitle>Passkeys</ItemTitle>
              <ItemDescription>
                Use biometric authentication for passwordless login
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <PasskeyDialog />
            </ItemActions>
          </Item>
        </ItemGroup>

        <ItemGroup className="rounded-lg border" title="Access Control">
          <Item>
            <ItemContent className="gap-1">
              <ItemTitle>Active Sessions</ItemTitle>
              <ItemDescription>
                Manage devices where you're currently logged in
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <SessionsCard />
            </ItemActions>
          </Item>
          <ItemSeparator />
          <Item>
            <ItemContent className="gap-1">
              <ItemTitle>API Keys</ItemTitle>
              <ItemDescription>
                Manage API keys for programmatic access
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <ApiKeysDialog />
            </ItemActions>
          </Item>
        </ItemGroup>

        <ItemGroup
          className="rounded-lg border border-destructive/50"
          title="Danger Zone"
        >
          <Item>
            <ItemContent className="gap-1">
              <ItemTitle className="text-destructive">Delete Account</ItemTitle>
              <ItemDescription>
                Permanently remove your account and all data
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <DeleteAccountDialog />
            </ItemActions>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
