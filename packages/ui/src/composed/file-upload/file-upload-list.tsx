"use client";

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
          className="fade-in slide-in-from-top-1 animate-in duration-200"
          key={file.id}
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
