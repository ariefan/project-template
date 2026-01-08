"use client";

import { Upload } from "lucide-react";

interface DragDropOverlayProps {
  isVisible: boolean;
}

export function DragDropOverlay({ isVisible }: DragDropOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border-4 border-primary border-dashed bg-background p-12 shadow-2xl">
        <Upload className="h-16 w-16 text-primary" />
        <p className="font-semibold text-2xl">Drop files to upload</p>
        <p className="text-muted-foreground">
          Files will be uploaded to current directory
        </p>
      </div>
    </div>
  );
}
