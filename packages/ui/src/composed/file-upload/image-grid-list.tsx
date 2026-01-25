"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../../components/carousel";
import { ImageUploaderItem } from "./image-uploader-item";
import type { CombinedItem, CompressedFileWithPreview } from "./types";

export interface ImageGridListProps {
  items: CombinedItem[];
  layout: "grid" | "carousel";
  onRemove: (item: CombinedItem) => void;
  onDownload: (file: CompressedFileWithPreview) => void;
  onView: (url: string, name: string, type: string) => void;
  showCompressionDetails: boolean;
}

export function ImageGridList({
  items,
  layout,
  onRemove,
  onDownload,
  onView,
  showCompressionDetails,
}: ImageGridListProps) {
  const renderItem = (item: CombinedItem) => (
    <ImageUploaderItem
      item={item}
      key={item.id}
      layout={layout}
      onDownload={onDownload}
      onRemove={() => onRemove(item)}
      onView={onView}
      showCompressionDetails={showCompressionDetails}
    />
  );

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {items.map((item) => renderItem(item))}
      </div>
    );
  }

  return (
    <Carousel
      className="mx-auto min-h-[120px] w-full"
      opts={{ align: "start" }}
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {items.map((item) => (
          <CarouselItem className="basis-full pl-2 md:pl-4" key={item.id}>
            {renderItem(item)}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2 bg-background/80 hover:bg-background" />
      <CarouselNext className="right-2 bg-background/80 hover:bg-background" />
    </Carousel>
  );
}
