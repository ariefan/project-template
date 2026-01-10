"use client";

import {
  Check,
  Crop,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Cropper, { type Point } from "react-easy-crop";
import { Button } from "../components/button";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from "../components/dialog";
import { Slider } from "../components/slider";
import { cn } from "../lib/utils";

export type AspectRatio = "free" | "square" | "4:3" | "16:9" | "1:1";

export interface CropResult {
  blob: Blob;
  file: File;
  url: string;
}

const ASPECT_RATIOS: Record<AspectRatio, number | undefined> = {
  free: undefined,
  square: 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
  "1:1": 1,
};

/**
 * Creates a cropped image from the source with transformations applied.
 */
async function createCroppedImage(
  imageSrc: string,
  croppedAreaPixels: { x: number; y: number; width: number; height: number },
  rotation: number,
  flipH: boolean,
  flipV: boolean,
  mimeType: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  // Calculate dimensions considering rotation
  const isRotated = rotation === 90 || rotation === 270;
  const srcWidth = isRotated ? image.height : image.width;
  const srcHeight = isRotated ? image.width : image.height;

  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  // Apply transformations
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

  // Draw the cropped image
  const scaleX = image.width / srcWidth;
  const scaleY = image.height / srcHeight;
  const offsetX = isRotated ? (image.width - image.height) / 2 : 0;
  const offsetY = isRotated ? (image.height - image.width) / 2 : 0;

  ctx.drawImage(
    image,
    (croppedAreaPixels.x - canvas.width / 2) * scaleX + offsetX,
    (croppedAreaPixels.y - canvas.height / 2) * scaleY + offsetY,
    croppedAreaPixels.width * scaleX,
    croppedAreaPixels.height * scaleY
  );
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop image"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      0.95
    );
  });
}

const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  free: "Free",
  square: "Square",
  "4:3": "4:3",
  "16:9": "16:9",
  "1:1": "1:1",
};

export interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onCropComplete: (result: CropResult) => void;
}

/**
 * Image crop dialog component.
 *
 * Provides WhatsApp-style image cropping with:
 * - Zoom and pan
 * - Rotation (90° increments)
 * - Flip horizontal/vertical
 * - Aspect ratio presets
 * - Touch-friendly controls
 */
export function ImageCropDialog({
  open,
  onOpenChange,
  imageFile,
  onCropComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("free");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [cropping, setCropping] = useState(false);

  const cropperRef = useRef<Cropper>(null);

  // Load image when file changes
  const loadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      // Reset state
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
    };
    reader.readAsDataURL(file);
  }, []);

  // Load image when dialog opens with a file
  const prevFileRef = useRef<File | null>(null);
  if (open && imageFile && imageFile !== prevFileRef.current) {
    prevFileRef.current = imageFile;
    loadImage(imageFile);
  }

  // Cleanup image URL on unmount
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setImageSrc("");
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        prevFileRef.current = null;
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Crop and get the result
  const handleApply = useCallback(async () => {
    if (!(cropperRef.current && imageFile)) {
      return;
    }

    setCropping(true);

    try {
      const cropper = cropperRef.current;
      // @ts-expect-error - getCroppedAreaPixels is available on the ref
      const croppedAreaPixels = await cropper.getCroppedAreaPixels();

      const blob = await createCroppedImage(
        imageSrc,
        croppedAreaPixels,
        rotation,
        flipH,
        flipV,
        imageFile.type
      );

      const url = URL.createObjectURL(blob);
      const file = new File([blob], imageFile.name, { type: imageFile.type });

      onCropComplete({ blob, file, url });
      handleOpenChange(false);
    } catch (error) {
      console.error("Crop failed:", error);
    } finally {
      setCropping(false);
    }
  }, [
    imageFile,
    imageSrc,
    rotation,
    flipH,
    flipV,
    onCropComplete,
    handleOpenChange,
  ]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleFlipH = useCallback(() => {
    setFlipH((prev) => !prev);
  }, []);

  const handleFlipV = useCallback(() => {
    setFlipV((prev) => !prev);
  }, []);

  if (!imageSrc) {
    return null;
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogOverlay className="bg-black/90 backdrop-blur-sm" />
      <DialogContent
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "h-[90vh] w-[95vw] max-w-2xl gap-0 bg-background p-0",
          "flex flex-col overflow-hidden"
        )}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Crop Image</DialogTitle>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h2 className="font-medium text-sm">Crop Image</h2>
          <Button
            disabled={cropping}
            onClick={() => handleOpenChange(false)}
            size="icon-sm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Crop Area */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
          <div className="size-full">
            <Cropper
              aspect={ASPECT_RATIOS[aspectRatio]}
              crop={crop}
              cropShape="rect"
              image={imageSrc}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              ref={cropperRef}
              showGrid
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  backgroundColor: "black",
                },
              }}
              zoom={zoom}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="shrink-0 border-t p-4">
          {/* Aspect ratio selector */}
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(ASPECT_RATIO_LABELS).map(([key, label]) => (
              <Button
                className="h-8 px-3 text-xs"
                key={key}
                onClick={() => setAspectRatio(key as AspectRatio)}
                size="sm"
                variant={aspectRatio === key ? "default" : "outline"}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Zoom slider */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Zoom</span>
              <span className="text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <Slider
              max={3}
              min={1}
              onValueChange={([value]) => setZoom(value ?? 1)}
              step={0.01}
              value={[zoom]}
            />
          </div>

          {/* Rotation and flip controls */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <Button
              disabled={cropping}
              onClick={handleRotate}
              size="icon"
              title="Rotate 90°"
              variant="outline"
            >
              <RotateCw className="size-4" />
            </Button>
            <Button
              disabled={cropping}
              onClick={handleFlipH}
              size="icon"
              title="Flip horizontal"
              variant="outline"
            >
              <FlipHorizontal className="size-4" />
            </Button>
            <Button
              disabled={cropping}
              onClick={handleFlipV}
              size="icon"
              title="Flip vertical"
              variant="outline"
            >
              <FlipVertical className="size-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={cropping}
              onClick={() => handleOpenChange(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={cropping}
              onClick={handleApply}
            >
              {cropping ? (
                <>
                  <Crop className="mr-2 h-4 w-4 animate-spin" />
                  Cropping...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Apply
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
