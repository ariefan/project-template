import { Download, Eye, FileImage, MoreVertical, X } from "lucide-react";
import * as React from "react";
import { Button } from "../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import { cn } from "../../lib/utils";

export interface ImagePreviewCardProps {
  src: string;
  alt: string;
  onView?: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function ImagePreviewCard({
  src,
  alt,
  onView,
  onDownload,
  onRemove,
  children,
  className,
}: ImagePreviewCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isSmall = width < 100;

  return (
    <div
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg border bg-card",
        className
      )}
      ref={containerRef}
    >
      {/* Thumbnail */}
      {src ? (
        // biome-ignore lint/correctness/useImageSize: Dynamic content
        // biome-ignore lint/performance/noImgElement: Framework-agnostic
        <img alt={alt} className="size-full object-cover" src={src} />
      ) : (
        <div className="flex size-full items-center justify-center bg-muted">
          <FileImage className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
        {/* Actions at top */}
        <div className="flex justify-end">
          {isSmall ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="size-6 p-0 text-white hover:bg-white/20 hover:text-white"
                  size="icon"
                  variant="ghost"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="mr-2 size-4" /> View
                  </DropdownMenuItem>
                )}
                {onDownload && (
                  <DropdownMenuItem onClick={onDownload}>
                    <Download className="mr-2 size-4" /> Download
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onRemove}
                  >
                    <X className="mr-2 size-4" /> Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex justify-end gap-0.5">
              {onView && (
                <Button
                  className="size-6.5 p-0"
                  onClick={onView}
                  size="icon"
                  title="View"
                  variant="secondary"
                >
                  <Eye className="size-3.5" />
                </Button>
              )}
              {onDownload && (
                <Button
                  className="size-6.5 p-0"
                  onClick={onDownload}
                  size="icon"
                  title="Download"
                  variant="secondary"
                >
                  <Download className="size-3.5" />
                </Button>
              )}
              {onRemove && (
                <Button
                  className="size-6.5 p-0"
                  onClick={onRemove}
                  size="icon"
                  title="Remove"
                  variant="destructive"
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* File info at bottom */}
        {children}
      </div>

      {/* Filename visible at bottom when not hovering/open */}
      <div className="absolute right-0 bottom-0 left-0 rounded-b-lg bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 transition-opacity group-hover:opacity-0">
        <p className="truncate font-medium text-white text-xs" title={alt}>
          {alt}
        </p>
      </div>
    </div>
  );
}
