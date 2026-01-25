"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Crop, Eye, FileImage, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import * as React from "react";
import { Button } from "../../components/button";
import { ConfirmDialog } from "../confirm-dialog"; // Import ConfirmDialog
import { FilePreviewDialog } from "../file-preview/file-preview-dialog";
import { CompressionOptionsPanel } from "./compression-options";
import { DropzonePrimitive } from "./dropzone-primitive";
import { ImageCropDialog } from "./image-crop-dialog";
import { ImageGridList } from "./image-grid-list";
import type { ImageUploaderProps, ImageUploaderRef } from "./types";
import { useImageUploaderController } from "./use-image-uploader";

function EmptyDropzone({
  isDragging,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  fileInputRef,
  size = "default",
  accept,
  maxFiles,
}: {
  isDragging: boolean;
  onFileSelect: (files: FileList | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  size?: "default" | "sm";
  accept?: Record<string, string[]>;
  maxFiles?: number;
}) {
  const acceptStr = accept
    ? Object.values(accept).flat().join(",")
    : "image/*";
  const isMultiple = maxFiles !== 1;

  if (size === "sm") {
    return (
      <DropzonePrimitive
        className={cn(
          "h-9 w-full justify-start gap-3 border px-3 py-1",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-accent-foreground/50 hover:bg-accent/50"
        )}
        compact={true}
        onClick={() => {
          fileInputRef.current?.click();
        }}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <FileImage className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-1 items-center gap-2">
          <p className="font-normal text-muted-foreground text-sm">
            Select image...
          </p>
        </div>
        <input
          accept={acceptStr}
          className="hidden"
          multiple={isMultiple}
          onChange={(e) => onFileSelect(e.target.files)}
          ref={fileInputRef}
          type="file"
        />
      </DropzonePrimitive>
    );
  }

  return (
    <DropzonePrimitive
      className={cn(
        "gap-4",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      )}
      compact={false}
      onClick={() => {
        fileInputRef.current?.click();
      }}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
    >
      <FileImage className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1 text-center sm:text-left">
        <p className="font-medium text-lg">Drop images here</p>
        <p className="text-muted-foreground text-sm">or click to browse</p>
      </div>
      <input
        accept={acceptStr}
        className="hidden"
        multiple={isMultiple}
        onChange={(e) => onFileSelect(e.target.files)}
        ref={fileInputRef}
        type="file"
      />
    </DropzonePrimitive>
  );
}

function ProcessingIndicator({
  totalInQueue,
  processedCount,
}: {
  totalInQueue: number;
  processedCount: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <Crop className="h-5 w-5 animate-pulse text-primary" />
      <div className="flex flex-1 flex-col">
        <p className="font-medium text-sm">
          Processing {totalInQueue} image
          {totalInQueue > 1 ? "s" : ""}
        </p>
        <p className="text-muted-foreground text-xs">
          {processedCount} of {totalInQueue} cropped
        </p>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}

export const ImageUploader = React.forwardRef<
  ImageUploaderRef,
  ImageUploaderProps
>((props, ref) => {
  const {
    className,
    showCompressionOptions = false,
    showCompressionDetails = false,
    showConfirmButton = false,
    onConfirm,
    isUploading = false,
    initialUrls,
    onRemoveUrl,
    layout = "grid",
  } = props;

  const controller = useImageUploaderController(props, ref);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = React.useState(false);
  const compactExpanded =
    props.size === "sm" &&
    controller.combinedItems.length + controller.totalInQueue > 1;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Options */}
      {showCompressionOptions && (
        <CompressionOptionsPanel
          enableCropping={controller.enableCropping}
          isOpen={controller.isCompressionOptionsOpen}
          onEnableCroppingChange={controller.setEnableCropping}
          onOpenChange={controller.setIsCompressionOptionsOpen}
          onOptionsChange={controller.setCompressionOptions}
          options={controller.compressionOptions}
        />
      )}

      {/* File Preview Dialog */}
      <FilePreviewDialog
        fileName={controller.previewName}
        fileType={controller.previewType}
        fileUrl={controller.previewUrl}
        onOpenChange={controller.setPreviewOpen}
        open={controller.previewOpen}
      />

      {/* Upload Area */}
      {controller.hasAnyFiles ? (
        props.size === "sm" ? (
          <div className="space-y-2">
            <DropzonePrimitive
              className={cn(
                "w-full flex-row flex-wrap items-center justify-start gap-2 border",
                compactExpanded ? "min-h-24 px-1.5 py-1.5" : "min-h-9 px-1 py-1",
                controller.isDragging
                  ? "border-primary bg-primary/5"
                  : "border-input hover:border-accent-foreground/50 hover:bg-accent/50"
              )}
              compact={true}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  controller.fileInputRef.current?.click();
                }
              }}
              onDragLeave={controller.handleDragLeave}
              onDragOver={controller.handleDragOver}
              onDrop={controller.handleDrop}
            >
              {controller.combinedItems.map((item, i) => {
                const src =
                  item.type === "url" ? item.data.url : item.data.preview;
                return (
                  <div
                    key={i}
                    className={cn(
                      "group relative shrink-0 overflow-hidden rounded-sm border bg-muted",
                      compactExpanded ? "size-20" : "size-7"
                    )}
                  >
                    <img
                      alt="Preview"
                      className="size-full object-cover"
                      src={src}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      {/* View Button */}
                      <button
                        className="flex size-6 items-center justify-center rounded-full bg-background/20 text-white transition-colors hover:bg-background/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          controller.setPreviewUrl(src);
                          controller.setPreviewName(
                            item.type === "file"
                              ? item.data.name
                              : "Image"
                          );
                          controller.setPreviewType(
                            item.type === "file"
                              ? item.data.type
                              : "image/jpeg"
                          );
                          controller.setPreviewOpen(true);
                        }}
                        title="View"
                        type="button"
                      >
                        <Eye className="size-3" />
                      </button>

                      {/* Remove Button (Only if expanded) */}
                      {compactExpanded && (
                        <button
                          className="flex size-6 items-center justify-center rounded-full bg-background/20 text-white transition-colors hover:bg-destructive hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === "url") {
                              controller.setDeleteTarget({
                                type: "url",
                                id: item.id,
                              });
                            } else {
                              const idx = controller.compressedFiles.indexOf(
                                item.data as any
                              );
                              if (idx !== -1)
                                controller.setDeleteTarget({
                                  type: "file",
                                  id: idx,
                                });
                            }
                          }}
                          title="Remove"
                          type="button"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {controller.isCompressing && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}

              {(props.maxFiles === undefined ||
                controller.combinedItems.length + controller.totalInQueue <
                  props.maxFiles) && (
                <button
                  className={cn(
                    "flex items-center justify-center rounded-sm border border-dashed hover:bg-muted",
                    compactExpanded ? "size-12" : "size-7"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    controller.fileInputRef.current?.click();
                  }}
                  title="Add image"
                  type="button"
                >
                  <Plus
                    className={cn(
                      "text-muted-foreground",
                      compactExpanded ? "size-4" : "size-3"
                    )}
                  />
                </button>
              )}

              <button
                className={cn(
                  "flex items-center justify-center rounded-sm border border-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                  compactExpanded ? "size-12" : "size-7"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsClearConfirmOpen(true);
                }}
                title="Clear all"
                type="button"
              >
                <Trash2
                  className={compactExpanded ? "size-4" : "size-3"}
                />
              </button>

              <input
                accept={
                  props.accept
                    ? Object.values(props.accept).flat().join(",")
                    : "image/*"
                }
                className="hidden"
                multiple={props.maxFiles !== 1}
                onChange={(e) => controller.handleFileSelect(e.target.files)}
                ref={controller.fileInputRef}
                type="file"
              />
            </DropzonePrimitive>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Crop queue indicator */}
            {controller.hasFilesInQueue && (
              <ProcessingIndicator
                processedCount={controller.processedCrops.length}
                totalInQueue={controller.totalInQueue}
              />
            )}

            {/* Add more files button */}
            <DropzonePrimitive
              className="py-2"
              compact={true}
              onClick={() => {
                controller.fileInputRef.current?.click();
              }}
              onDragLeave={controller.handleDragLeave}
              onDragOver={controller.handleDragOver}
              onDrop={controller.handleDrop}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  controller.fileInputRef.current?.click();
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add more images
              <input
                accept={
                  props.accept
                    ? Object.values(props.accept).flat().join(",")
                    : "image/*"
                }
                className="hidden"
                multiple={props.maxFiles !== 1}
                onChange={(e) => controller.handleFileSelect(e.target.files)}
                ref={controller.fileInputRef}
                type="file"
              />
            </DropzonePrimitive>

            {/* Images list (Unified) */}
            {controller.hasAnyFiles &&
              (controller.compressedFiles.length > 0 ||
                controller.hasInitialUrls) && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-xs">
                      Images (
                      {(initialUrls?.length || 0) +
                        controller.compressedFiles.length}
                      )
                    </h3>
                    {controller.compressedFiles.length > 0 && (
                      <Button
                        className="text-muted-foreground text-xs"
                        disabled={controller.isCompressing}
                        onClick={controller.clearAll}
                        size="sm"
                        variant="ghost"
                      >
                        Clear new
                      </Button>
                    )}
                  </div>
                  <ImageGridList
                    items={controller.combinedItems}
                    layout={layout}
                    onDownload={controller.downloadFile}
                    onRemove={(item) => {
                      if (item.type === "url") {
                        controller.setDeleteTarget({
                          type: "url",
                          id: item.id,
                        });
                      } else {
                        // Find index in compressedFiles
                        const index = controller.compressedFiles.indexOf(
                          // biome-ignore lint/suspicious/noExplicitAny: complex type
                          item.data as any
                        );
                        controller.setDeleteTarget({
                          type: "file",
                          id: index,
                        });
                      }
                    }}
                    onView={(url, name, type) => {
                      controller.setPreviewUrl(url);
                      controller.setPreviewName(name);
                      controller.setPreviewType(type);
                      controller.setPreviewOpen(true);
                    }}
                    showCompressionDetails={showCompressionDetails}
                  />
                </div>
              )}

            {/* Loading state */}
            {controller.isCompressing && (
              <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 py-4 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing images...
              </div>
            )}

            {/* Confirm Button */}
            {showConfirmButton &&
              !props.autoUpload &&
              onConfirm &&
              controller.compressedFiles.length > 0 && (
                <Button
                  className="w-full"
                  disabled={isUploading || controller.isCompressing}
                  onClick={() => onConfirm(controller.compressedFiles)}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Confirm Upload ({controller.compressedFiles.length})
                    </>
                  )}
                </Button>
              )}
          </div>
        )
      ) : (
        <EmptyDropzone
          accept={props.accept}
          fileInputRef={controller.fileInputRef}
          isDragging={controller.isDragging}
          maxFiles={props.maxFiles}
          onDragLeave={controller.handleDragLeave}
          onDragOver={controller.handleDragOver}
          onDrop={controller.handleDrop}
          onFileSelect={(files) => controller.handleFileSelect(files)}
          size={props.size}
        />
      )}

      {/* Crop Dialog */}
      <ImageCropDialog
        aspectRatio={props.aspectRatio}
        circularCrop={props.circularCrop}
        imageFile={controller.fileToCrop}
        lockAspectRatio={props.lockAspectRatio}
        onCropComplete={controller.handleCropComplete}
        onOpenChange={(open: boolean) => {
          if (open) {
            controller.setCropDialogOpen(open);
          } else {
            controller.handleSkipCrop();
          }
        }}
        onSelectFile={controller.setFileToCrop}
        open={controller.cropDialogOpen}
        queue={controller.cropQueue}
      />

      <ConfirmDialog
        description="This action cannot be undone."
        onCancel={() => controller.setDeleteTarget(null)}
        onConfirm={() => {
          if (controller.deleteTarget?.type === "file") {
            controller.removeCompressedFile(
              controller.deleteTarget.id as number
            );
          } else if (controller.deleteTarget?.type === "url") {
            onRemoveUrl?.(controller.deleteTarget.id as string);
          }
          controller.setDeleteTarget(null);
        }}
        onOpenChange={(open) => !open && controller.setDeleteTarget(null)}
        open={!!controller.deleteTarget}
        title="Are you sure?"
        variant="destructive"
      />
      <ConfirmDialog
        description="Are you sure you want to remove all images?"
        onCancel={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          controller.clearAll();
          setIsClearConfirmOpen(false);
        }}
        onOpenChange={setIsClearConfirmOpen}
        open={isClearConfirmOpen}
        title="Clear All Images"
        variant="destructive"
      />
    </div>
  );
});
