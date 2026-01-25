"use client";

import { Badge } from "../../components/badge";
import { ImagePreviewCard } from "./image-preview-card";
import type {
  CombinedItem,
  CompressedFileWithPreview,
  InitialUrl,
} from "./types";
import { formatBytes } from "./utils";

export interface ImageUploaderItemProps {
  item: CombinedItem;
  layout: "grid" | "carousel";
  onDownload: (file: CompressedFileWithPreview) => void;
  onRemove: () => void;
  onView: (url: string, name: string, type: string) => void;
  showCompressionDetails: boolean;
}

export function ImageUploaderItem({
  item,
  layout,
  onDownload,
  onRemove,
  onView,
  showCompressionDetails,
}: ImageUploaderItemProps) {
  if (item.type === "url") {
    const urlData = item.data as InitialUrl;
    return (
      <ImagePreviewCard
        alt={urlData.name || ""}
        className={layout === "carousel" ? "aspect-video w-full" : undefined}
        onDownload={() => window.open(urlData.url, "_blank")}
        onRemove={onRemove}
        onView={() => onView(urlData.url, urlData.name || "Preview", "image/*")}
        src={urlData.url}
      />
    );
  }

  const fileData = item.data as CompressedFileWithPreview;
  const savings = (
    ((fileData.originalSize - fileData.compressedSize) /
      fileData.originalSize) *
    100
  ).toFixed(1);

  return (
    <ImagePreviewCard
      alt={fileData.name}
      className={layout === "carousel" ? "aspect-video w-full" : undefined}
      onDownload={() => onDownload(fileData)}
      onRemove={onRemove}
      onView={
        fileData.preview
          ? () => onView(fileData.preview ?? "", fileData.name, fileData.type)
          : undefined
      }
      src={fileData.preview || ""}
    >
      <div className="space-y-0.5">
        <p className="truncate font-medium text-[10px] text-white">
          {fileData.name}
        </p>
        <div className="flex justify-between text-[10px] text-white/80">
          <span>{formatBytes(fileData.compressedSize)}</span>
          {showCompressionDetails && (
            <Badge
              className="text-xs"
              variant={Number.parseFloat(savings) > 0 ? "default" : "secondary"}
            >
              {Number.parseFloat(savings) > 0 ? `-${savings}%` : "0%"}
            </Badge>
          )}
        </div>
      </div>
    </ImagePreviewCard>
  );
}
