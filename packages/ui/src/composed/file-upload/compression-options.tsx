"use client";

import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { Checkbox } from "../../components/checkbox";
import { Label } from "../../components/label";
import { Slider } from "../../components/slider";
import type { CompressionOptions } from "./types";

interface CompressionOptionsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  enableCropping: boolean;
  onEnableCroppingChange: (enabled: boolean) => void;
  options: CompressionOptions;
  onOptionsChange: (options: CompressionOptions) => void;
}

export function CompressionOptionsPanel({
  isOpen,
  onOpenChange,
  enableCropping,
  onEnableCroppingChange,
  options,
  onOptionsChange,
}: CompressionOptionsPanelProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <button
        className="flex w-full items-center justify-between font-medium text-sm"
        onClick={() => onOpenChange(!isOpen)}
        type="button"
      >
        <span>Compression Options</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Enable cropping toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="flex flex-1 flex-col gap-1">
              <Label className="cursor-pointer" htmlFor="enable-cropping">
                Enable image cropping
              </Label>
              <p className="text-muted-foreground text-xs">
                Crop, rotate, and flip images before compression
              </p>
            </div>
            <Checkbox
              checked={enableCropping}
              id="enable-cropping"
              onCheckedChange={(checked: boolean) =>
                onEnableCroppingChange(checked)
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxSizeMB">Max file size (MB)</Label>
              <span className="text-muted-foreground text-sm">
                {options.maxSizeMB} MB
              </span>
            </div>
            <Slider
              id="maxSizeMB"
              max={10}
              min={0.1}
              onValueChange={([value]: number[]) => {
                if (value !== undefined) {
                  onOptionsChange({
                    ...options,
                    maxSizeMB: value,
                  });
                }
              }}
              step={0.1}
              value={[options.maxSizeMB]}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxDimension">Max width/height (px)</Label>
              <span className="text-muted-foreground text-sm">
                {options.maxWidthOrHeight} px
              </span>
            </div>
            <Slider
              id="maxDimension"
              max={4096}
              min={480}
              onValueChange={([value]: number[]) => {
                if (value !== undefined) {
                  onOptionsChange({
                    ...options,
                    maxWidthOrHeight: value,
                  });
                }
              }}
              step={32}
              value={[options.maxWidthOrHeight]}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={options.useWebWorker}
                onCheckedChange={(checked: boolean) =>
                  onOptionsChange({
                    ...options,
                    useWebWorker: checked,
                  })
                }
              />
              <Label className="cursor-pointer">Use Web Worker</Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={options.alwaysKeepResolution}
                onCheckedChange={(checked: boolean) =>
                  onOptionsChange({
                    ...options,
                    alwaysKeepResolution: checked,
                  })
                }
              />
              <Label className="cursor-pointer">Keep resolution</Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
