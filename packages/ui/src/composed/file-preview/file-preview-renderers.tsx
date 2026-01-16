import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState } from "react";

export function ImagePreview({
  fileUrl,
  fileName,
  zoom,
  setZoom,
  isLoading,
  setIsLoading,
  hasError,
  setHasError,
}: {
  fileUrl: string;
  fileName?: string;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  hasError: boolean;
  setHasError: (v: boolean) => void;
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Reset pan when zoom is 1 or file changes
  useEffect(() => {
    if (zoom === 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Mouse handlers for panning
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Mouse handlers for panning
    <div
      className="relative flex size-full items-center justify-center overflow-hidden"
      data-file-preview-backdrop
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {hasError ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-muted-foreground text-sm">
            Failed to load preview
          </p>
          <Button
            onClick={() => {
              setIsLoading(true);
              setHasError(false);
            }}
            size="sm"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      ) : (
        // biome-ignore lint/correctness/useImageSize: Dynamic content
        // biome-ignore lint/performance/noImgElement: Framework-agnostic
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Mouse handlers for panning
        <img
          alt={fileName ?? "Preview"}
          className={cn(
            "max-h-full max-w-full object-contain transition-transform duration-75",
            isLoading && "opacity-0",
            zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          )}
          draggable={false}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          onLoad={() => setIsLoading(false)}
          onMouseDown={handleMouseDown}
          onWheel={(e) => {
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -0.25 : 0.25;
            setZoom((z) => Math.min(Math.max(z + delta, 0.5), 3));
          }}
          src={fileUrl}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        />
      )}
    </div>
  );
}

export function VideoPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <div
      className="flex size-full items-center justify-center"
      data-file-preview-backdrop
    >
      {/* biome-ignore lint/a11y/useMediaCaption: Preview only */}
      <video
        className="max-h-full max-w-full rounded-md"
        controls
        src={fileUrl}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export function AudioPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <div
      className="flex size-full items-center justify-center"
      data-file-preview-backdrop
    >
      {/* biome-ignore lint/a11y/useMediaCaption: Preview only */}
      <audio className="w-full max-w-md" controls src={fileUrl}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}

export function PdfPreview({ fileUrl }: { fileUrl: string }) {
  return (
    <div className="size-full">
      <object
        className="size-full rounded-md border"
        data={fileUrl}
        type="application/pdf"
      >
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-muted-foreground">
            Unable to display PDF directly.
          </p>
          <Button asChild variant="outline">
            <a href={fileUrl} rel="noreferrer" target="_blank">
              Download PDF
            </a>
          </Button>
        </div>
      </object>
    </div>
  );
}
