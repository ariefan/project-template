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
import { Fingerprint, Key, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";

interface Passkey {
  id: string;
  name?: string;
  createdAt: Date;
}

export function PasskeyDialog() {
  const [open, setOpen] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: passkeys, isLoading } = useQuery({
    queryKey: ["passkeys"],
    queryFn: async () => {
      // @ts-expect-error - listPasskeys exists at runtime
      const { data, error } = await authClient.passkey.listPasskeys();
      if (error) {
        throw error;
      }
      return data as Passkey[];
    },
    enabled: open,
  });

  const addPasskeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await authClient.passkey.addPasskey({
        name: name || undefined,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Passkey added successfully");
      setNewPasskeyName("");
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["passkeys"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add passkey");
    },
  });

  const deletePasskeyMutation = useMutation({
    mutationFn: async (id: string) => {
      // @ts-expect-error - Expected types mismatch in monorepo
      const { data, error } = await authClient.passkey.deletePasskey({
        id,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Passkey deleted");
      queryClient.invalidateQueries({ queryKey: ["passkeys"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete passkey");
    },
  });

  async function handleAddPasskey() {
    setIsAdding(true);
    try {
      await addPasskeyMutation.mutateAsync(newPasskeyName);
    } catch {
      // Error handled in mutation
    } finally {
      setIsAdding(false);
    }
  }

  const renderPasskeyList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!passkeys || passkeys.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <Fingerprint className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No passkeys found</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {passkeys.map((passkey) => (
          <div
            className="flex items-center justify-between rounded-lg border p-3"
            key={passkey.id}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {passkey.name || "Unnamed Passkey"}
                </p>
                <p className="text-muted-foreground text-xs">
                  Added on {new Date(passkey.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              disabled={deletePasskeyMutation.isPending}
              onClick={() => deletePasskeyMutation.mutate(passkey.id)}
              size="icon"
              variant="ghost"
            >
              {deletePasskeyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="outline">Manage</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Passkeys</DialogTitle>
          <DialogDescription>
            Manage your passkeys for passwordless login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* List existing passkeys */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Your Passkeys</h4>
            {renderPasskeyList()}
          </div>

          {/* Add new passkey */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Add New Passkey</h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="sr-only" htmlFor="passkey-name">
                  Passkey Name
                </Label>
                <Input
                  id="passkey-name"
                  onChange={(e) => setNewPasskeyName(e.target.value)}
                  placeholder="e.g. MacBook Pro TouchID"
                  value={newPasskeyName}
                />
              </div>
              <Button
                disabled={isAdding || addPasskeyMutation.isPending}
                onClick={handleAddPasskey}
              >
                {isAdding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
