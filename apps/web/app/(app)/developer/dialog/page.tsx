"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import {
  Archive,
  Copy,
  LayoutTemplate,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DialogPage() {
  // State for different dialog demos
  const [showDefault, setShowDefault] = useState(false);
  const [showDestructive, setShowDestructive] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showWithChildren, setShowWithChildren] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [showStandard, setShowStandard] = useState(false);

  const handleConfirm = () => {
    toast("Confirmed", {
      description: "Action has been confirmed successfully.",
    });
  };

  const handleDestructiveConfirm = () => {
    toast.error("Deleted", {
      description: "Item has been permanently deleted.",
    });
  };

  const handleLoadingConfirm = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    setShowLoading(false);
    toast.success("Saved", {
      description: "Changes have been saved successfully.",
    });
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Dialogs</h1>
        <p className="mt-2 text-muted-foreground">
          Demonstration of dialog patterns: <strong>ConfirmDialog</strong> for
          alerts/decisions and <strong>Standard Dialog</strong> for rich
          forms/content.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-4 font-semibold text-xl tracking-tight">
            Confirm Dialog
          </h2>
          <CardDescription className="mb-6">
            Use for simple "Yes/No" decisions, alerts, or destructive actions.
            Automatically handles mobile responsiveness (Drawer) and loading
            states.
          </CardDescription>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Default Dialog */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-500/10 p-2 text-blue-500">
                    <Copy className="size-4" />
                  </span>
                  Default
                </CardTitle>
                <CardDescription>
                  Standard confirmation dialog for non-destructive actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowDefault(true)} variant="outline">
                  Open Dialog
                </Button>
                <ConfirmDialog
                  confirmLabel="Duplicate"
                  description="Are you sure you want to duplicate this project? A copy will be created in your workspace."
                  icon={Copy}
                  onConfirm={() => {
                    handleConfirm();
                    setShowDefault(false);
                  }}
                  onOpenChange={setShowDefault}
                  open={showDefault}
                  title="Duplicate Project"
                />
              </CardContent>
            </Card>

            {/* Destructive Dialog */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded-full bg-destructive/10 p-2 text-destructive">
                    <Trash2 className="size-4" />
                  </span>
                  Destructive
                </CardTitle>
                <CardDescription>
                  Warning dialog for destructive actions like delete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowDestructive(true)}
                  variant="destructive"
                >
                  Delete Item
                </Button>
                <ConfirmDialog
                  confirmLabel="Delete Project"
                  description="This action cannot be undone. This will permanently delete your project and remove your data from our servers."
                  onConfirm={() => {
                    handleDestructiveConfirm();
                    setShowDestructive(false);
                  }}
                  onOpenChange={setShowDestructive}
                  open={showDestructive}
                  title="Delete Project"
                  variant="destructive"
                />
              </CardContent>
            </Card>

            {/* Warning Dialog */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded-full bg-yellow-500/10 p-2 text-yellow-600 dark:text-yellow-500">
                    <ShieldAlert className="size-4" />
                  </span>
                  Warning
                </CardTitle>
                <CardDescription>
                  Alert dialog for potentially risky actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="border-yellow-200 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-400 dark:hover:bg-yellow-950/50"
                  onClick={() => setShowWarning(true)}
                  variant="outline"
                >
                  Revoke Access
                </Button>
                <ConfirmDialog
                  confirmLabel="Revoke Access"
                  description="This will revoke API access for all connected applications. Existing tokens will stop working immediately."
                  onConfirm={() => {
                    handleConfirm();
                    setShowWarning(false);
                  }}
                  onOpenChange={setShowWarning}
                  open={showWarning}
                  title="Revoke Access"
                  variant="warning"
                />
              </CardContent>
            </Card>

            {/* Async/Loading Dialog */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <Save className="size-4" />
                  </span>
                  Async Action
                </CardTitle>
                <CardDescription>
                  Dialog with loading state for async operations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowLoading(true)} variant="outline">
                  Save Changes
                </Button>
                <ConfirmDialog
                  confirmLabel="Save Changes"
                  description="Do you want to save the changes made to the configuration?"
                  icon={Save}
                  isLoading={isLoading}
                  onConfirm={handleLoadingConfirm}
                  onOpenChange={setShowLoading}
                  open={showLoading}
                  title="Save Changes"
                />
              </CardContent>
            </Card>

            {/* Custom Icon & Styling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-500/10 p-2 text-purple-500">
                    <Archive className="size-4" />
                  </span>
                  Custom Icon
                </CardTitle>
                <CardDescription>
                  Dialog with custom icon and colors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowCustom(true)} variant="outline">
                  Archive
                </Button>
                <ConfirmDialog
                  confirmLabel="Archive"
                  description="Archiving will make this project read-only. You can unarchive it later."
                  icon={Archive}
                  iconClassName="text-purple-500 bg-purple-500/10"
                  onConfirm={() => {
                    handleConfirm();
                    setShowCustom(false);
                  }}
                  onOpenChange={setShowCustom}
                  open={showCustom}
                  title="Archive Project"
                  variant="default"
                />
              </CardContent>
            </Card>

            {/* With Children/Custom Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded-full bg-green-500/10 p-2 text-green-500">
                    <Copy className="size-4" />
                  </span>
                  Custom Content
                </CardTitle>
                <CardDescription>
                  Dialog passing custom children content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowWithChildren(true)}
                  variant="outline"
                >
                  Export Data
                </Button>
                <ConfirmDialog
                  confirmLabel="Export"
                  description="Export your project data to CSV."
                  onConfirm={() => {
                    toast("Export Started", {
                      description: `Exporting data... (Don't ask again: ${dontAskAgain})`,
                    });
                    setShowWithChildren(false);
                  }}
                  onOpenChange={setShowWithChildren}
                  open={showWithChildren}
                  title="Export Data"
                >
                  <div className="mt-4 flex items-center space-x-2 rounded-md bg-muted/50 p-3">
                    <Switch
                      checked={dontAskAgain}
                      id="dont-ask"
                      onCheckedChange={setDontAskAgain}
                    />
                    <Label className="font-medium text-sm" htmlFor="dont-ask">
                      Don't show this again
                    </Label>
                  </div>
                </ConfirmDialog>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div>
          <h2 className="mb-4 font-semibold text-xl tracking-tight">
            Standard Dialog
          </h2>
          <CardDescription className="mb-6">
            Use for complex content, forms, or views that require more space and
            custom interactivity.
          </CardDescription>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Form Dialog */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-500/10 p-2 text-slate-500">
                    <LayoutTemplate className="size-4" />
                  </span>
                  Rich Form
                </CardTitle>
                <CardDescription>
                  Standard dialog with form inputs and grid layout.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog onOpenChange={setShowStandard} open={showStandard}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Edit Profile</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Edit profile</DialogTitle>
                      <DialogDescription>
                        Make changes to your profile here. Click save when
                        you're done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right" htmlFor="name">
                          Name
                        </Label>
                        <Input
                          className="col-span-3"
                          defaultValue="Pedro Duarte"
                          id="name"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right" htmlFor="username">
                          Username
                        </Label>
                        <Input
                          className="col-span-3"
                          defaultValue="@peduarte"
                          id="username"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => setShowStandard(false)}
                        type="submit"
                      >
                        Save changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
