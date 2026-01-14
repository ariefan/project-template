"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item";
import { Globe, Laptop, Loader2, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth";

interface Session {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent?: boolean;
}

export function SessionsCard() {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: currentSession } = useSession();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authClient.listSessions();
      if (data) {
        setSessions(
          data.map((s) => ({
            ...s,
            isCurrent: s.id === currentSession?.session.id,
          }))
        );
      }
    } catch (_error) {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [currentSession?.session.id]);

  async function handleRevoke(sessionId: string) {
    try {
      await authClient.revokeSession({ token: sessionId });
      setSessions(sessions.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch (_error) {
      toast.error("Failed to revoke session");
    }
  }

  // Effect to load sessions when dialog opens
  useEffect(() => {
    if (open) {
      fetchSessions();
    }
  }, [open, fetchSessions]);

  function getIcon(userAgent?: string | null) {
    if (!userAgent) {
      return <Globe className="size-6" />;
    }
    if (userAgent.toLowerCase().includes("mobile")) {
      return <Smartphone className="size-6" />;
    }
    return <Laptop className="size-6" />;
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="outline">View All</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Active Sessions</DialogTitle>
          <DialogDescription>
            Manage devices and browsers where you are currently signed in.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <p className="py-4 text-center text-muted-foreground">
            No sessions found.
          </p>
        )}

        {!loading && sessions.length > 0 && (
          <div className="space-y-4">
            <ItemGroup>
              {sessions.map((session, index) => (
                <div key={session.id}>
                  <Item>
                    <ItemMedia>
                      <div className="rounded-full bg-muted p-2">
                        {getIcon(session.userAgent)}
                      </div>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>
                        {session.userAgent || "Unknown Device"}
                      </ItemTitle>
                      <ItemDescription className="text-muted-foreground text-xs">
                        {session.ipAddress || "Unknown IP"} •{" "}
                        {new Date(session.createdAt).toLocaleDateString()}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      {session.isCurrent && (
                        <span className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
                          Current
                        </span>
                      )}
                      {!session.isCurrent && (
                        <Button
                          onClick={() => handleRevoke(session.id)}
                          size="sm"
                          variant="outline"
                        >
                          Revoke
                        </Button>
                      )}
                    </ItemActions>
                  </Item>
                  {index < sessions.length - 1 && <ItemSeparator />}
                </div>
              ))}
            </ItemGroup>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
