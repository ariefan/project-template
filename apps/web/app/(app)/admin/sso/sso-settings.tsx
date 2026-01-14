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

interface OIDCConfig {
  clientId: string;
  clientSecret: string;
}

interface SSOProvider {
  id: string;
  providerId: string;
  issuer: string;
  domain: string;
  oidcConfig: OIDCConfig | null;
  samlConfig: unknown | null;
  organizationId: string;
}

export function SsoSettings() {
  const { data: activeOrg, isPending: isOrgLoading } = useActiveOrganization();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [providers, setProviders] = useState<SSOProvider[]>([]);

  const [newProvider, setNewProvider] = useState({
    name: "", // maps to providerId
    issuer: "",
    clientId: "",
    clientSecret: "",
    domain: "",
  });

  const fetchProviders = useCallback(async () => {
    if (!activeOrg?.id) {
      return;
    }
    setFetching(true);

    try {
      // Use custom endpoint since better-auth client doesn't expose list by org
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/orgs/${activeOrg.id}/sso-providers`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch providers");
      }

      const json = await response.json();
      setProviders(json.data || []);
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
    if (!activeOrg?.id) {
      return;
    }

    try {
      setLoading(true);
      // Use custom endpoint since better-auth client doesn't expose delete by org in the way we want
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/orgs/${activeOrg.id}/sso-providers/${providerId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete provider");
      }

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
            <TableHead>Name (Provider ID)</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.providerId}</TableCell>
              <TableCell className="font-mono text-xs">{p.issuer}</TableCell>
              <TableCell className="font-mono text-xs">{p.domain}</TableCell>
              <TableCell>
                <Button
                  onClick={() => handleDeleteProvider(p.providerId)}
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
                    <Label>Provider ID (Name)</Label>
                    <Input
                      onChange={(e) =>
                        setNewProvider({ ...newProvider, name: e.target.value })
                      }
                      placeholder="e.g. okta-oidc"
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
                    <Label>Domain</Label>
                    <Input
                      onChange={(e) =>
                        setNewProvider({
                          ...newProvider,
                          domain: e.target.value,
                        })
                      }
                      placeholder="example.com"
                      value={newProvider.domain}
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
                        const { error } = await authClient.sso.register({
                          providerId: newProvider.name,
                          issuer: newProvider.issuer,
                          domain: newProvider.domain,
                          organizationId: activeOrg.id,
                          oidcConfig: {
                            clientId: newProvider.clientId,
                            clientSecret: newProvider.clientSecret,
                          },
                        });

                        if (error) {
                          throw error;
                        }

                        toast.success("Provider added successfully");
                        setOpen(false);
                        fetchProviders();
                      } catch (_e) {
                        // biome-ignore lint/suspicious/noExplicitAny: error handling
                        const err = _e as any;
                        toast.error(
                          `Failed to add provider: ${err.message || err.statusText}`
                        );
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
