"use client";

import {
  Check,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  RotateCw,
} from "lucide-react";
import * as React from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { toast } from "sonner";

import { Button } from "../../components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/dialog";
import { Slider } from "../../components/slider";

export interface CropResult {
  blob: Blob;
  url: string;
  file: File;
}

export interface ImageCropDialogProps {
  imageFile: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (result: CropResult) => void;
  queue?: File[];
  onSelectFile?: (file: File) => void;
  aspectRatio?: number;
  lockAspectRatio?: boolean;
  circularCrop?: boolean;
}

export function ImageCropDialog({
  imageFile,
  open,
  onOpenChange,
  onCropComplete,
  queue = [],
  onSelectFile,
  aspectRatio,
  lockAspectRatio = false,
  circularCrop = false,
}: ImageCropDialogProps) {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [flipH, setFlipH] = React.useState(false);
  const [flipV, setFlipV] = React.useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(
    null
  );
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Aspect ratios
  const ASPECTS = [
    { label: "Free", value: undefined },
    { label: "Square", value: 1 / 1 },
    { label: "4:3", value: 4 / 3 },
    { label: "16:9", value: 16 / 9 },
  ];
  const [aspect, setAspect] = React.useState<number | undefined>(aspectRatio);

  React.useEffect(() => {
    if (aspectRatio !== undefined) {
      setAspect(aspectRatio);
    }
  }, [aspectRatio]);

  // Load image when file changes
  React.useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () =>
      setImageSrc(reader.result?.toString() || null)
    );
    reader.readAsDataURL(imageFile);

    // Reset state
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCrop({ x: 0, y: 0 });
    // Keep aspect ratio if it was passed via props, otherwise reset to Free (undefined)
    setAspect(aspectRatio);

    return () => {
      // Cleanup?
    };
  }, [imageFile, aspectRatio]);

  const onCropChange = (newCrop: Point) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropCompleteHandler = (
    _croppedArea: Area,
    croppedAreaPixelsValue: Area
  ) => {
    setCroppedAreaPixels(croppedAreaPixelsValue);
  };

  const createCroppedImage = async () => {
    if (!(imageSrc && croppedAreaPixels && imageFile)) {
      return;
    }

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        flipH,
        flipV
      );
      if (croppedImage) {
        onCropComplete({
          blob: croppedImage.blob,
          url: croppedImage.url,
          file: imageFile,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to crop image");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to create the cropped image with flip support
  const getCroppedImg = async (
    imgSrc: string,
    pixelCrop: Area,
    rot = 0,
    flipHorizontal = false,
    flipVertical = false
  ): Promise<{ blob: Blob; url: string } | null> => {
    const image = await createImage(imgSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    // set each dimensions to double largest dimension to allow for a safe area for the
    // image to rotate in without being clipped by canvas context
    canvas.width = safeArea;
    canvas.height = safeArea;

    // translate canvas context to a central location on image to allow rotating around the center.
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rot * Math.PI) / 180);
    // Apply flip transformations
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    // draw rotated image and store data.
    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // paste generated rotate image with correct offsets for x,y crop values.
    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    // As Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve({ blob, url });
      }, imageFile?.type || "image/jpeg");
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const handleFlipH = () => {
    setFlipH((prev) => !prev);
  };

  const handleFlipV = () => {
    setFlipV((prev) => !prev);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
          <DialogDescription>
            Adjust the image crop, zoom, rotation, and flip.
          </DialogDescription>
        </DialogHeader>

        {/* Thumbnails moved to bottom */}

        <div className="relative h-[300px] w-full overflow-hidden rounded-lg bg-black/5">
          {imageSrc && (
            <Cropper
              aspect={aspect === 0 ? undefined : aspect} // 0 is handled as undefined (free) if passed explicitly
              crop={crop}
              cropShape={circularCrop ? "round" : "rect"}
              image={imageSrc}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteHandler}
              onRotationChange={setRotation}
              onZoomChange={onZoomChange}
              rotation={rotation}
              showGrid={!circularCrop}
              transform={[
                `translate(${crop.x}px, ${crop.y}px)`,
                `rotateZ(${rotation}deg)`,
                `scale(${zoom})`,
                flipH ? "scaleX(-1)" : "",
                flipV ? "scaleY(-1)" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              zoom={zoom}
            />
          )}
        </div>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <span className="w-16 text-muted-foreground text-sm">Zoom</span>
            <Slider
              max={3}
              min={1}
              onValueChange={([value]: number[]) => {
                if (value !== undefined) {
                  setZoom(value);
                }
              }}
              step={0.1}
              value={[zoom]}
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="w-16 text-muted-foreground text-sm">Rotation</span>
            <Slider
              max={360}
              min={0}
              onValueChange={([value]: number[]) => {
                if (value !== undefined) {
                  setRotation(value);
                }
              }}
              step={1}
              value={[rotation]}
            />
          </div>
          {!(lockAspectRatio || circularCrop) && (
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-muted-foreground text-sm">
                Ratio
              </span>
              <div className="flex flex-wrap gap-2">
                {ASPECTS.map((a) => (
                  <Button
                    className="h-7 text-xs"
                    key={a.label}
                    onClick={() => setAspect(a.value)}
                    size="sm"
                    variant={aspect === a.value ? "default" : "outline"}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-muted-foreground text-sm">
              Transform
            </span>
            <div className="flex gap-2">
              <Button
                className="h-7 text-xs"
                disabled={isProcessing}
                onClick={() => setRotation((r) => (r + 90) % 360)}
                size="sm"
                variant="outline"
              >
                <RotateCw className="mr-1 h-3 w-3" />
                90°
              </Button>
              <Button
                className="h-7 text-xs"
                disabled={isProcessing}
                onClick={handleFlipH}
                size="sm"
                variant={flipH ? "default" : "outline"}
              >
                <FlipHorizontal className="mr-1 h-3 w-3" />
                Flip H
              </Button>
              <Button
                className="h-7 text-xs"
                disabled={isProcessing}
                onClick={handleFlipV}
                size="sm"
                variant={flipV ? "default" : "outline"}
              >
                <FlipVertical className="mr-1 h-3 w-3" />
                Flip V
              </Button>
            </div>
          </div>
        </div>

        {/* Thumbnail Queue (Bottom) */}
        {queue.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {queue.map((file, i) => {
              const isSelected = file.name === imageFile?.name;
              return (
                <button
                  className={`relative h-14 w-14 flex-shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary ring-offset-1"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  key={`${file.name}-${i}`}
                  onClick={() => onSelectFile?.(file)}
                  type="button"
                >
                  <QueueThumbnail file={file} />
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={isProcessing} onClick={createCroppedImage}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QueueThumbnail({ file }: { file: File }) {
  const [preview, setPreview] = React.useState<string>("");

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!preview) {
    return <div className="h-full w-full bg-muted" />;
  }

  // biome-ignore lint/a11y/useAltText: Thumbnail
  // biome-ignore lint/performance/noImgElement: Thumbnail
  // biome-ignore lint/correctness/useImageSize: Thumbnail
  return <img className="h-full w-full object-cover" src={preview} />;
}
