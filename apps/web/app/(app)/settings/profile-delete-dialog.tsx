"use client";

import { Button } from "@workspace/ui/components/button";
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth";

export function DeleteAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await authClient.deleteUser({
        callbackURL: "/", // Redirect after deletion
      });
      toast.success("Account deleted successfully");
      router.push("/");
    } catch (error) {
      toast.error("Failed to delete account");
      console.error(error);
      setLoading(false); // Only reset if failed
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="destructive">
        Delete Account
      </Button>
      <ConfirmDialog
        confirmLabel="Delete Account"
        description="This action cannot be undone. This will permanently delete your account and remove your data from our servers."
        isLoading={loading}
        onConfirm={handleDelete}
        onOpenChange={setOpen}
        open={open}
        title="Are you absolutely sure?"
        variant="destructive"
      />
    </>
  );
}
