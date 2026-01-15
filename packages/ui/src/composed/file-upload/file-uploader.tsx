"use client";

import * as React from "react";
import { Button } from "../../components/button";
import { cn } from "../../lib/utils";
import { FileUploadProvider, useFileUpload } from "./file-upload-context";
import { FileUploadDropzone } from "./file-upload-dropzone";
import { FileUploadList } from "./file-upload-list";
import { FileUploadTrigger } from "./file-upload-trigger";
import type { FileUploadOptions, UploadFile } from "./types";

interface FileUploaderContentProps {
  className?: string;
  dropzoneClassName?: string;
  listClassName?: string;
  dropzoneLabel?: string;
  dropzoneDescription?: string;
  dropzoneIcon?: React.ReactNode;
  showTrigger?: boolean;
  showUploadAll?: boolean;
  onClear?: () => void;
}

function FileUploaderContent({
  className,
  dropzoneClassName,
  listClassName,
  dropzoneLabel,
  dropzoneDescription,
  dropzoneIcon,
  showTrigger = true,
  showUploadAll = true,
  onClear,
}: FileUploaderContentProps) {
  const { files, clearFiles, uploadAll, options } = useFileUpload();

  const handleClear = () => {
    clearFiles();
    onClear?.();
  };

  const hasFiles = files.length > 0;
  const hasIdleFiles = files.some((f) => f.status === "idle");
  const isUploading = files.some((f) => f.status === "uploading");

  // If simple mode (no multiple), dropzone often acts as both display and trigger
  // But for this robust component, we usually show list below dropzone or replace dropzone

  return (
    <div className={cn("space-y-4", className)}>
      {!hasFiles || options.multiple ? (
         <FileUploadDropzone
            className={dropzoneClassName}
            description={dropzoneDescription}
            icon={dropzoneIcon}
            label={dropzoneLabel}
         />
      ) : null}

      {hasFiles && (
        <>
            <FileUploadList className={listClassName} showUploadAction={!options.autoUpload} />

            <div className="flex items-center justify-between gap-2">
                {showTrigger && options.multiple && (
                    <FileUploadTrigger size="sm" />
                )}

                <div className="flex items-center gap-2 ml-auto">
                    <Button
                        disabled={isUploading}
                        onClick={handleClear}
                        size="sm"
                        variant="ghost"
                    >
                        Clear All
                    </Button>

                    {showUploadAll && !options.autoUpload && hasIdleFiles && (
                        <Button
                            disabled={isUploading}
                            onClick={uploadAll}
                            size="sm"
                        >
                            {isUploading ? "Uploading..." : "Upload All"}
                        </Button>
                    )}
                </div>
            </div>
        </>
      )}
    </div>
  );
}

export interface FileUploaderProps extends FileUploadOptions {
  initialFiles?: UploadFile[];
  className?: string;
  dropzoneClassName?: string;
  listClassName?: string;
  dropzoneLabel?: string;
  dropzoneDescription?: string;
  dropzoneIcon?: React.ReactNode;
  showTrigger?: boolean;
  showUploadAll?: boolean;
}

/**
 * FileUploader
 * A robust, high-level file upload component that handles most use cases.
 */
export function FileUploader({
  initialFiles,
  className,
  dropzoneClassName,
  listClassName,
  dropzoneLabel,
  dropzoneDescription,
  dropzoneIcon,
  showTrigger,
  showUploadAll,
  ...options
}: FileUploaderProps) {
  return (
    <FileUploadProvider initialFiles={initialFiles} {...options}>
      <FileUploaderContent
        className={className}
        dropzoneClassName={dropzoneClassName}
        dropzoneDescription={dropzoneDescription}
        dropzoneIcon={dropzoneIcon}
        dropzoneLabel={dropzoneLabel}
        listClassName={listClassName}
        showTrigger={showTrigger}
        showUploadAll={showUploadAll}
      />
    </FileUploadProvider>
  );
}
