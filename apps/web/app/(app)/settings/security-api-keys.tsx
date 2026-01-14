"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  AlertTriangle,
  Check,
  Copy,
  Key,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";

interface ApiKey {
  id: string;
  name: string | null;
  start: string; // Key prefix (e.g., "sk_...xxxx")
  createdAt: Date;
  expiresAt: Date | null;
}

const EXPIRATION_OPTIONS = [
  { label: "7 days", value: "604800" },
  { label: "30 days", value: "2592000" },
  { label: "90 days", value: "7776000" },
  { label: "1 year", value: "31536000" },
  { label: "Never", value: "never" },
] as const;

export function ApiKeysDialog() {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [expiration, setExpiration] = useState<string>("2592000");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      // @ts-expect-error - apiKey methods exist at runtime
      const { data, error } = await authClient.apiKey.list();
      if (error) {
        throw error;
      }
      return data as ApiKey[];
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async ({
      name,
      expiresIn,
    }: {
      name: string;
      expiresIn?: number;
    }) => {
      // @ts-expect-error - apiKey methods exist at runtime
      const { data, error } = await authClient.apiKey.create({
        name: name || undefined,
        expiresIn,
      });
      if (error) {
        throw error;
      }
      return data as { key: string };
    },
    onSuccess: (data) => {
      setNewlyCreatedKey(data.key);
      setNewKeyName("");
      setExpiration("2592000");
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      // @ts-expect-error - apiKey methods exist at runtime
      const { error } = await authClient.apiKey.delete({ keyId });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("API key revoked");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revoke API key");
    },
  });

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    const expiresIn =
      expiration === "never" ? undefined : Number.parseInt(expiration, 10);
    await createMutation.mutateAsync({ name: newKeyName.trim(), expiresIn });
  }

  async function handleCopyKey() {
    if (newlyCreatedKey) {
      await navigator.clipboard.writeText(newlyCreatedKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDismissNewKey() {
    setNewlyCreatedKey(null);
  }

  function renderKeyList() {
    if (isLoading) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!apiKeys || apiKeys.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <Key className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No API keys</p>
          <p className="text-xs">Create one to get started</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {apiKeys.map((key) => (
          <div
            className="flex items-center justify-between rounded-lg border p-3"
            key={key.id}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {key.name || "Unnamed Key"}
                </p>
                <p className="font-mono text-muted-foreground text-xs">
                  {key.start}...
                </p>
                <p className="text-muted-foreground text-xs">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                  {key.expiresAt && (
                    <>
                      {" "}
                      · Expires {new Date(key.expiresAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
            </div>
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(key.id)}
              size="icon"
              variant="ghost"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="outline">Manage</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
          <DialogDescription>
            Manage API keys for programmatic access to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Newly created key display */}
          {newlyCreatedKey && (
            <div className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 text-sm dark:text-amber-200">
                    Save your API key
                  </p>
                  <p className="text-amber-700 text-xs dark:text-amber-300">
                    This key will only be shown once. Copy it now and store it
                    securely.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="font-mono text-xs"
                  readOnly
                  value={newlyCreatedKey}
                />
                <Button onClick={handleCopyKey} size="icon" variant="outline">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                className="w-full"
                onClick={handleDismissNewKey}
                size="sm"
                variant="outline"
              >
                I've saved my key
              </Button>
            </div>
          )}

          {/* Existing keys list */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Your API Keys</h4>
            {renderKeyList()}
          </div>

          {/* Create new key */}
          {isCreating ? (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm">Create API Key</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="api-key-name">Name</Label>
                  <Input
                    id="api-key-name"
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production Server"
                    value={newKeyName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key-expiration">Expiration</Label>
                  <Select onValueChange={setExpiration} value={expiration}>
                    <SelectTrigger id="api-key-expiration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={createMutation.isPending}
                    onClick={handleCreate}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Key
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreating(false);
                      setNewKeyName("");
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => setIsCreating(true)}
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
