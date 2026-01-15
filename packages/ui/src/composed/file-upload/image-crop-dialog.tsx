"use client";

import { Check, Loader2, RotateCw, X } from "lucide-react";
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
import { cn } from "../../lib/utils";

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
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Image cropping is complex
export function ImageCropDialog({
  imageFile,
  open,
  onOpenChange,
  onCropComplete,
}: ImageCropDialogProps) {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
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
  const [aspect, setAspect] = React.useState<number | undefined>(undefined);

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
    setCrop({ x: 0, y: 0 });
    setAspect(undefined);

    return () => {
      // Cleanup?
    };
  }, [imageFile]);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = (
    _croppedArea: Area,
    croppedAreaPixels: Area
  ) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !imageFile) {
      return;
    }

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
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

  // Helper to create the cropped image
  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<{ blob: Blob; url: string } | null> => {
    const image = await createImage(imageSrc);
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
    ctx.rotate((rotation * Math.PI) / 180);
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
          // biome-ignore lint/style/noArguments: legacy
          reject(new Error("Canvas is empty"));
          return;
        }
        // biome-ignore lint/performance/noDelete: memory management
        // blob.name = imageFile?.name;
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
      image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
      image.src = url;
    });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
          <DialogDescription>
            Adjust the image crop, zoom, and rotation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[300px] w-full overflow-hidden rounded-lg bg-black/5">
          {imageSrc && (
            <Cropper
              aspect={aspect}
              crop={crop}
              image={imageSrc}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteHandler}
              onRotationChange={setRotation}
              onZoomChange={onZoomChange}
              rotation={rotation}
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
                if (value !== undefined) setZoom(value);
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
                if (value !== undefined) setRotation(value);
              }}
              step={1}
              value={[rotation]}
            />
          </div>
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
              <Button
                className="h-7 text-xs"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                size="sm"
                variant="outline"
              >
                <RotateCw className="mr-1 h-3 w-3" />
                Rotate 90°
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Skip/Cancel
          </Button>
          <Button disabled={isProcessing} onClick={createCroppedImage}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
