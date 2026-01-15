"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { useFileUpload } from "./file-upload-context";
import { FileUploadItem } from "./file-upload-item";

interface FileUploadListProps {
  className?: string;
  showUploadAction?: boolean;
}

export function FileUploadList({
  className,
  showUploadAction,
}: FileUploadListProps) {
  const { files, removeFile, retryFile, uploadFile } = useFileUpload();

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
        {files.map((file) => (
          <div
            key={file.id}
            className="animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <FileUploadItem
              file={file}
              onRemove={removeFile}
              onRetry={retryFile}
              onUpload={showUploadAction ? uploadFile : undefined}
              showUploadAction={showUploadAction}
            />
          </div>
        ))}
    </div>
  );
}
