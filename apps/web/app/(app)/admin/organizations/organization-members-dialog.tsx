"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Spinner } from "@workspace/ui/components/spinner";
import { format } from "date-fns";
import { listOrganizationMembers } from "@/actions/system-organizations-members";

interface OrganizationMembersDialogProps {
  organization: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrganizationMember {
  id: string;
  role: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export function OrganizationMembersDialog({
  organization,
  open,
  onOpenChange,
}: OrganizationMembersDialogProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ["organization-members", organization?.id],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error("Organization ID required");
      }
      return listOrganizationMembers(organization.id);
    },
    enabled: !!organization && open,
  });

  const members = (result?.data ?? []) as OrganizationMember[];

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <div className="flex h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  } else if (members.length === 0) {
    content = (
      <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
        No members found.
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        {members.map((member) => (
          <div className="flex items-center justify-between" key={member.id}>
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarImage src={member.user.image ?? undefined} />
                <AvatarFallback>
                  {member.user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">{member.user.name}</div>
                <div className="text-muted-foreground text-xs">
                  {member.user.email}
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge className="capitalize" variant="outline">
                {member.role}
              </Badge>
              <div className="mt-1 text-[10px] text-muted-foreground">
                Joined {format(new Date(member.createdAt), "MMM d, yyyy")}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Organization Members</DialogTitle>
          <DialogDescription>
            Managing members for{" "}
            <span className="font-semibold">
              {organization?.name || "Organization"}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="mt-4 max-h-[400px]">{content}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
