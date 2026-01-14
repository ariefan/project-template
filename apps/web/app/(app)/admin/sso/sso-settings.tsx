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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, useActiveOrganization } from "@/lib/auth";

interface OIDCProvider {
  id: string;
  name: string;
  issuer: string;
  clientId: string;
  createdAt: Date;
}

export function SsoSettings() {
  const { data: activeOrg, isPending: isOrgLoading } = useActiveOrganization();
  const [mounted, setMounted] = useState(false);
  // const [debugData, setDebugData] = useState<any>(null); // Removed

  useEffect(() => {
    setMounted(true);
  }, []);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [providers, setProviders] = useState<OIDCProvider[]>([]);

  const [newProvider, setNewProvider] = useState({
    name: "",
    issuer: "",
    clientId: "",
    clientSecret: "",
  });

  const fetchProviders = useCallback(async () => {
    if (!activeOrg?.id) {
      return;
    }
    setFetching(true);

    try {
      // @ts-expect-error - sso plugin method
      const { data, error } = await authClient.organization.listOidcProviders({
        organizationId: activeOrg.id,
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch providers");
      }

      setProviders((data as unknown as OIDCProvider[]) || []);
    } catch (_e) {
      // biome-ignore lint/suspicious/noExplicitAny: error handling
      const err = _e as any;
      toast.error(
        `Failed to load SSO providers: ${err.message || "Unknown error"}`
      );
    } finally {
      setFetching(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  async function handleDeleteProvider(providerId: string) {
    // biome-ignore lint/suspicious/noAlert: simple confirmation for admin action
    if (!confirm("Are you sure you want to remove this provider?")) {
      return;
    }
    try {
      setLoading(true);
      // @ts-expect-error - sso plugin method
      await authClient.organization.deleteOidcProvider({
        providerId,
      });
      toast.success("Provider removed");
      fetchProviders();
    } catch (_e) {
      toast.error("Failed to remove provider");
    } finally {
      setLoading(false);
    }
  }

  // Hydration mismatch fix: Don't render conditional content until mounted
  if (!mounted || isOrgLoading) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Please select an organization to configure SSO.
      </div>
    );
  }

  const renderContent = () => {
    if (fetching) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (providers.length === 0) {
      return (
        <div className="py-6 text-center text-muted-foreground text-sm">
          No identity providers configured.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Client ID</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="font-mono text-xs">{p.issuer}</TableCell>
              <TableCell className="font-mono text-xs">{p.clientId}</TableCell>
              <TableCell>
                <Button
                  onClick={() => handleDeleteProvider(p.id)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Debug View Removed */}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Identity Providers</CardTitle>
              <CardDescription>
                Connect your organization to Okta, Google Workspace, or other
                OIDC/SAML providers.
              </CardDescription>
            </div>
            <Dialog onOpenChange={setOpen} open={open}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Identity Provider</DialogTitle>
                  <DialogDescription>
                    Configure a new OIDC identity provider.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Provider Name</Label>
                    <Input
                      onChange={(e) =>
                        setNewProvider({ ...newProvider, name: e.target.value })
                      }
                      placeholder="e.g. Okta"
                      value={newProvider.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wrapper / Issuer URL</Label>
                    <Input
                      onChange={(e) =>
                        setNewProvider({
                          ...newProvider,
                          issuer: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      value={newProvider.issuer}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      onChange={(e) =>
                        setNewProvider({
                          ...newProvider,
                          clientId: e.target.value,
                        })
                      }
                      value={newProvider.clientId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <Input
                      onChange={(e) =>
                        setNewProvider({
                          ...newProvider,
                          clientSecret: e.target.value,
                        })
                      }
                      type="password"
                      value={newProvider.clientSecret}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        // @ts-expect-error - sso plugin method
                        await authClient.organization.createOidcProvider({
                          name: newProvider.name,
                          issuer: newProvider.issuer,
                          clientId: newProvider.clientId,
                          clientSecret: newProvider.clientSecret,
                        });
                        toast.success("Provider added successfully");
                        setOpen(false);
                        fetchProviders();
                      } catch (_e) {
                        toast.error("Failed to add provider");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Provider
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
