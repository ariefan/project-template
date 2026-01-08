"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@workspace/ui/components/sidebar";
import { Download, Share2, X } from "lucide-react";
import { env } from "@/lib/env";
import type { FileInfo } from "./file-manager-context";
import {
  formatBytes,
  getFileIcon,
  getFileType,
  getFileTypeBadge,
} from "./lib/file-utils";

interface FileDetailsSidebarProps {
  file: FileInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (file: FileInfo) => void;
}

export function FileDetailsSidebar({
  file,
  isOpen,
  onClose,
  onDownload,
}: FileDetailsSidebarProps) {
  if (!(file && isOpen)) {
    return null;
  }

  const fileType = getFileType(file.name, file.isDirectory);
  const isImage = fileType === "image";

  return (
    <Sidebar side="right" variant="floating">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {getFileIcon(fileType, "size-5")}
            <span className="truncate font-medium text-sm">{file.name}</span>
          </div>
          <Button
            className="h-7 w-7"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {isImage && !file.isDirectory ? (
              <div className="mb-4 flex items-center justify-center rounded-lg bg-muted p-4">
                {/* biome-ignore lint/performance/noImgElement: Dynamic preview URL from backend */}
                <img
                  alt={file.name}
                  className="max-h-48 max-w-full rounded object-contain"
                  height={192}
                  src={`${env.NEXT_PUBLIC_API_URL}/local-files/preview/${file.path}`}
                  width={192}
                />
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-center rounded-lg bg-muted p-8">
                {getFileIcon(fileType, "size-16")}
              </div>
            )}

            {/* File Details */}
            <div className="space-y-3 px-2">
              <h3 className="font-medium text-sm">File Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Type</span>
                  <span className="font-medium text-sm">
                    {getFileTypeBadge(fileType)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Size</span>
                  <span className="font-medium text-sm">
                    {file.isDirectory ? "—" : formatBytes(file.size)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">
                    Modified
                  </span>
                  <span className="font-medium text-sm">
                    {new Date(file.modified).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Path</span>
                  <span className="font-medium font-mono text-xs">
                    /{file.path}
                  </span>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => onDownload?.(file)}
            size="sm"
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              // TODO: implement share
            }}
            size="sm"
            variant="outline"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
