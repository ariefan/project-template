"use client";

import { Upload } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { useFileUpload } from "./file-upload-context";
import { formatBytes } from "./utils";

interface FileUploadDropzoneProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function FileUploadDropzone({
  className,
  label = "Drop files here",
  description = "or click to browse",
  icon,
  ...props
}: FileUploadDropzoneProps) {
  const { addFiles, isDragging, setIsDragging, options } = useFileUpload();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: Dropzone interactivity
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        options.disabled && "cursor-not-allowed opacity-60",
        className
      )}
      onClick={options.disabled ? undefined : handleClick}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={(e) => {
        if (!options.disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={options.disabled ? -1 : 0}
      {...props}
    >
      <input
        accept={
          options.accept ? Object.keys(options.accept).join(",") : undefined
        }
        className="hidden"
        disabled={options.disabled}
        multiple={options.multiple}
        onChange={handleFileSelect}
        ref={fileInputRef}
        type="file"
      />
      {icon || <Upload className="mb-4 h-12 w-12 text-muted-foreground" />}
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground text-sm">
        {description}
        {options.maxSize && ` • Max ${formatBytes(options.maxSize)}`}
      </p>
    </div>
  );
}
