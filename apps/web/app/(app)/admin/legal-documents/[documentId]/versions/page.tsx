"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Eye, GitBranch, Plus, Rocket } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layouts/page-header";

interface Version {
  id: string;
  version: number;
  title: string;
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  createdAt: string;
  requiresReAcceptance: boolean;
  changelog?: string;
}

// Mock data - replace with actual API call
const mockVersions: Version[] = [
  {
    id: "ldver_001",
    version: 2,
    title: "Terms of Service v2.0",
    status: "draft",
    createdAt: new Date().toISOString(),
    requiresReAcceptance: true,
    changelog: "Updated data handling section",
  },
  {
    id: "ldver_002",
    version: 1,
    title: "Terms of Service v1.0",
    status: "published",
    publishedAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
    createdAt: new Date(Date.now() - 86_400_000 * 60).toISOString(),
    requiresReAcceptance: false,
  },
];

const STATUS_CONFIG = {
  draft: { variant: "secondary" as const, label: "Draft" },
  published: { variant: "default" as const, label: "Published" },
  archived: { variant: "outline" as const, label: "Archived" },
};

export default function VersionsPage() {
  const params = useParams();
  const _router = useRouter();
  const documentId = params.documentId as string;

  // TODO: Fetch actual versions
  const versions = mockVersions;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/legal-documents/${documentId}`}>
                <ArrowLeft className="mr-2 size-4" />
                Back to Document
              </Link>
            </Button>
            <Button>
              <Plus className="mr-2 size-4" />
              New Version
            </Button>
          </div>
        }
        description="View and manage all versions of this document"
        title="Document Versions"
      />

      {versions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitBranch />
            </EmptyMedia>
            <EmptyTitle>No versions yet</EmptyTitle>
            <EmptyDescription>
              Create the first version of this document.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <Card key={version.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{version.title}</CardTitle>
                      <Badge variant={STATUS_CONFIG[version.status].variant}>
                        {STATUS_CONFIG[version.status].label}
                      </Badge>
                      {version.requiresReAcceptance && (
                        <Badge className="text-xs" variant="destructive">
                          Re-acceptance Required
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      Version {version.version} • Created{" "}
                      {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                      })}
                      {version.publishedAt &&
                        ` • Published ${formatDistanceToNow(
                          new Date(version.publishedAt),
                          { addSuffix: true }
                        )}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="mr-2 size-3" />
                      Preview
                    </Button>
                    {version.status === "draft" && (
                      <Button size="sm">
                        <Rocket className="mr-2 size-3" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {version.changelog && (
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Changelog:</span>{" "}
                    {version.changelog}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
