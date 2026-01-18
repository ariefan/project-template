"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader2, Lock } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

export interface CreateBackupOptions {
  includeFiles: boolean;
  encrypt: boolean;
  password?: string;
}

interface BackupCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (options: CreateBackupOptions) => void;
  isPending: boolean;
  title?: string;
  description?: string;
  showIncludeFiles?: boolean;
}

export function BackupCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  title = "Create Backup",
  description = "Configure backup options before starting.",
  showIncludeFiles = true,
}: BackupCreateDialogProps) {
  const id = useId();
  const [includeFiles, setIncludeFiles] = useState(true);
  const [encrypt, setEncrypt] = useState(true); // Default to true per requirements
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (encrypt && !password) {
      toast.error("Password is required for encrypted backups");
      return;
    }

    if (encrypt && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    onSubmit({
      includeFiles,
      encrypt,
      password: encrypt ? password : undefined,
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-6 py-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Include Files Option */}
            {showIncludeFiles && (
              <div className="flex items-start space-x-3 rounded-md border p-3">
                <Checkbox
                  checked={includeFiles}
                  id={`${id}-files`}
                  onCheckedChange={(c) => setIncludeFiles(!!c)}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    className="cursor-pointer font-medium"
                    htmlFor={`${id}-files`}
                  >
                    Include Storage Files
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Include uploaded files and assets in the backup archive.
                    Increases backup size.
                  </p>
                </div>
              </div>
            )}

            {/* Encryption Option */}
            <div className="space-y-4 rounded-md border p-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={encrypt}
                  id={`${id}-encrypt`}
                  onCheckedChange={(c) => setEncrypt(!!c)}
                />
                <div className="space-y-1 leading-none">
                  <div className="flex items-center gap-2">
                    <Label
                      className="cursor-pointer font-medium"
                      htmlFor={`${id}-encrypt`}
                    >
                      Encrypt Backup
                    </Label>
                    <Badge
                      className="h-5 px-1.5 text-[10px]"
                      variant="secondary"
                    >
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Secure your backup with AES-256 encryption. Requires a
                    password to restore.
                  </p>
                </div>
              </div>

              {encrypt && (
                <div className="ml-7 space-y-2 pt-2">
                  <Label htmlFor={`${id}-password`}>Encryption Password</Label>
                  <div className="relative">
                    <Lock className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      autoComplete="new-password"
                      className="pl-9"
                      id={`${id}-password`}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter strong password"
                      type="password"
                      value={password}
                    />
                  </div>
                  <p className="font-medium text-amber-600 text-xs">
                    ⚠️ Save this password. Getting it back is impossible if lost.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {encrypt ? "Start Encrypted Backup" : "Start Backup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
