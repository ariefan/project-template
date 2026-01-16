import { Upload } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { DropzonePrimitive } from "./dropzone-primitive";
import { useFileUpload } from "./file-upload-context";
import { formatBytes } from "./utils";

interface FileUploadDropzoneProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  labelClassName?: string;
  description?: string | null;
  icon?: React.ReactNode;
  compact?: boolean;
}

export function FileUploadDropzone({
  className,
  labelClassName,
  label = "Drop files here",
  description = "or click to browse",
  icon,
  compact = false,
  ...props
}: FileUploadDropzoneProps) {
  const { addFiles, isDragging, setIsDragging, options } = useFileUpload();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
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
    <DropzonePrimitive
      className={className}
      compact={compact}
      disabled={options.disabled}
      isDragging={isDragging}
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
      {icon || <Upload className="h-10 w-10 text-muted-foreground" />}
      <div className="space-y-1 text-center sm:text-left">
        <p className={cn(labelClassName)}>{label}</p>
        {description && (
          <p className="text-muted-foreground text-sm">
            {description}
            {options.maxSize && ` • Max ${formatBytes(options.maxSize)}`}
          </p>
        )}
      </div>
    </DropzonePrimitive>
  );
}
