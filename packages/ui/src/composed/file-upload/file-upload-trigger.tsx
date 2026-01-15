"use client";

import { Plus } from "lucide-react";
import * as React from "react";
import { Button, type ButtonProps } from "../../components/button";
import { cn } from "../../lib/utils";
import { useFileUpload } from "./file-upload-context";

interface FileUploadTriggerProps extends ButtonProps {
  asChild?: boolean;
}

export function FileUploadTrigger({
  className,
  children,
  ...props
}: FileUploadTriggerProps) {
  const { addFiles, options } = useFileUpload();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Button
        className={cn("gap-2", className)}
        disabled={options.disabled}
        onClick={handleClick}
        variant="outline"
        {...props}
      >
        {children || (
            <>
                <Plus className="h-4 w-4" />
                Add files
            </>
        )}
      </Button>
      <input
        accept={
          options.accept
            ? Object.keys(options.accept).join(",")
            : undefined
        }
        className="hidden"
        disabled={options.disabled}
        multiple={options.multiple}
        onChange={handleFileSelect}
        ref={fileInputRef}
        type="file"
      />
    </>
  );
}
