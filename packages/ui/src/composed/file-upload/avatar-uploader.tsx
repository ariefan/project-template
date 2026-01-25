"use client";

import { useImageUploaderController } from "./use-image-uploader";
import { cn } from "@workspace/ui/lib/utils";
import { Camera, Loader2, Upload, User, X } from "lucide-react";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/avatar";
import { Button } from "../../components/button";
import { ConfirmDialog } from "../confirm-dialog";
import { DropzonePrimitive } from "./dropzone-primitive";
import { ImageCropDialog } from "./image-crop-dialog";
import type { CompressedFileWithPreview, ImageUploaderProps, ImageUploaderRef } from "./types";

export interface AvatarUploaderProps extends Omit<ImageUploaderProps, "layout" | "maxFiles" | "circularCrop"> {
  fallback?: React.ReactNode;
  initials?: string;
}

export const AvatarUploader = React.forwardRef<ImageUploaderRef, AvatarUploaderProps>(
  (props, ref) => {
    const {
      className,
      showCompressionOptions = false, // Usually false for avatars
      showConfirmButton = false, // Usually auto-upload or handled externally
      onConfirm,
      isUploading = false,
      initialUrls,
      onRemoveUrl,
      fallback = <User className="size-full p-2 text-muted-foreground" />,
      initials,
      // Force specific props for avatar behavior
      ...restProps
    } = props;

    // Force single file, circular crop, and 1:1 aspect ratio
    const controller = useImageUploaderController(
      {
        ...restProps,
        maxFiles: 1,
        circularCrop: false,
        lockAspectRatio: true,
        aspectRatio: 1,
        enableCropping: true,
        initialUrls,
        showCompressionOptions,
        showConfirmButton,
        onConfirm,
        isUploading,
        onRemoveUrl,
      },
      ref
    );

    // Determine what to display
    const hasNewFile = controller.compressedFiles.length > 0;
    const hasInitialUrl = initialUrls && initialUrls.length > 0;

    // Get the display URL
    let displayUrl = "";
    if (hasNewFile) {
      displayUrl = controller.compressedFiles[0]?.preview || "";
    } else if (hasInitialUrl && initialUrls?.[0]) {
      displayUrl = initialUrls[0].url || "";
    }

    const handleDelete = () => {
      if (hasNewFile) {
        controller.removeCompressedFile(0);
      } else if (hasInitialUrl && initialUrls?.[0]) {
        controller.setDeleteTarget({ type: "url", id: initialUrls[0].id });
      }
    };

    const hasImage = !!displayUrl;

    return (
      <div className={cn("flex flex-col items-center gap-4", className)}>
        <DropzonePrimitive
          className={cn(
            "relative flex size-32 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-all hover:bg-muted/50",
            (controller.isDragging || controller.isCompressing) && "border-primary bg-primary/10",
            hasImage && "border-solid p-0 hover:scale-105"
          )}
          onClick={() => {
            if (!hasImage) controller.fileInputRef.current?.click();
          }}
          onDragLeave={controller.handleDragLeave}
          onDragOver={controller.handleDragOver}
          onDrop={controller.handleDrop}
          // Disabled click propagation if has image (handled by buttons)
          disabled={hasImage || controller.isCompressing}
        >
          {/* Default State (Empty) */}
          {!hasImage && !controller.isCompressing && (
             <div className="flex flex-col items-center gap-1 p-2 text-center text-xs text-muted-foreground">
                {initials ? (
                   <span className="font-semibold text-4xl text-muted-foreground/50">{initials}</span>
                ) : (
                  <>
                    <Upload className="size-6" />
                    <span>Upload</span>
                  </>
                )}
             </div>
          )}

           {/* Loading State */}
           {controller.isCompressing && (
             <div className="flex flex-col items-center gap-2">
               <Loader2 className="size-8 animate-spin text-primary" />
               <span className="text-xs">Processing...</span>
             </div>
           )}

          {/* Image Display */}
          {hasImage && !controller.isCompressing && (
            <div className="group relative size-full">
              <Avatar className="size-full rounded-full">
                <AvatarImage src={displayUrl} alt="Avatar" className="object-cover" />
                <AvatarFallback className="bg-transparent">
                    {initials ? (
                         <span className="font-semibold text-4xl text-muted-foreground">{initials}</span>
                    ) : (
                         fallback
                    )}
                </AvatarFallback>
              </Avatar>
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-2">
                       <Button
                          size="icon"
                          variant="secondary"
                          className="size-8 rounded-full"
                          type="button"
                          onClick={(e) => {
                             e.stopPropagation();
                             controller.fileInputRef.current?.click();
                          }}
                       >
                         <Camera className="size-4" />
                       </Button>
                       <Button
                          size="icon"
                          variant="destructive"
                          className="size-8 rounded-full"
                          type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDelete();
                          }}
                       >
                         <X className="size-4" />
                       </Button>
                  </div>
              </div>
            </div>
          )}

          <input
            accept="image/*"
            className="hidden"
            multiple={false}
            onChange={(e) => controller.handleFileSelect(e.target.files)}
            ref={controller.fileInputRef}
            type="file"
          />
        </DropzonePrimitive>

        {showConfirmButton && onConfirm && hasNewFile && (
           <Button 
             className="w-full max-w-[200px]"
             disabled={isUploading || controller.isCompressing}
             onClick={() => onConfirm(controller.compressedFiles)}
           >
              {isUploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isUploading ? "Uploading..." : "Save Avatar"}
           </Button>
        )}

        {/* Crop Dialog (Reused) */}
        <ImageCropDialog
          aspectRatio={1}
          circularCrop={false}
          imageFile={controller.fileToCrop}
          lockAspectRatio={true}
          onCropComplete={controller.handleCropComplete}
          onOpenChange={(open) => {
            if (open) controller.setCropDialogOpen(open);
            else controller.handleSkipCrop();
          }}
          onSelectFile={controller.setFileToCrop}
          open={controller.cropDialogOpen}
          queue={controller.cropQueue}
        />

         <ConfirmDialog
            description="Are you sure you want to remove this avatar?"
            onCancel={() => controller.setDeleteTarget(null)}
            onConfirm={() => {
               if (controller.deleteTarget?.type === "url" && onRemoveUrl && controller.deleteTarget?.id) {
                   onRemoveUrl(controller.deleteTarget.id.toString());
               }
               controller.setDeleteTarget(null);
            }}
            onOpenChange={(open) => !open && controller.setDeleteTarget(null)}
            open={!!controller.deleteTarget}
            title="Remove Avatar"
            variant="destructive"
         />
      </div>
    );
  }
);
