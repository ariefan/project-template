"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { FilePreviewDialog } from "@workspace/ui/composed/file-preview/file-preview-dialog";
import { AlertCircle, FileText, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

export default function FilePreviewPage() {
  const [open, setOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");

  const handlePreview = (url: string, name: string, type: string) => {
    setFileUrl(url);
    setFileName(name);
    setFileType(type);
    setOpen(true);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">File Preview</h1>
        <p className="mt-2 text-muted-foreground">
          Demonstration of the FilePreviewDialog component for viewing images
          and PDFs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* PDF Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-full bg-red-500/10 p-2 text-red-500">
                <FileText className="size-4" />
              </span>
              PDF Preview
            </CardTitle>
            <CardDescription>
              Preview PDF documents with native browser rendering or fallback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                handlePreview(
                  "/demo/sample-document.pdf",
                  "contract-draft.pdf",
                  "application/pdf"
                )
              }
              variant="outline"
            >
              Preview PDF
            </Button>
          </CardContent>
        </Card>

        {/* Error State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-full bg-orange-500/10 p-2 text-orange-500">
                <AlertCircle className="size-4" />
              </span>
              Error State
            </CardTitle>
            <CardDescription>
              Handling of broken links or missing files with retry option.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                handlePreview(
                  "/demo/missing-file.jpg",
                  "missing-file.jpg",
                  "image/jpeg"
                )
              }
              variant="outline"
            >
              Trigger Error
            </Button>
          </CardContent>
        </Card>

        {/* JPG Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/10 p-2 text-indigo-500">
                <ImageIcon className="size-4" />
              </span>
              JPG Preview
            </CardTitle>
            <CardDescription>Preview converted JPG image.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                handlePreview(
                  "/demo/sample-jpg.jpg",
                  "sample-jpg.jpg",
                  "image/jpeg"
                )
              }
              variant="outline"
            >
              Preview JPG
            </Button>
          </CardContent>
        </Card>

        {/* GIF Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-full bg-pink-500/10 p-2 text-pink-500">
                <ImageIcon className="size-4" />
              </span>
              GIF Preview
            </CardTitle>
            <CardDescription>Preview animated GIF.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                handlePreview(
                  "/demo/sample-gif.gif",
                  "sample-gif.gif",
                  "image/gif"
                )
              }
              variant="outline"
            >
              Preview GIF
            </Button>
          </CardContent>
        </Card>

        {/* Transparent PNG Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-500/10 p-2 text-cyan-500">
                <ImageIcon className="size-4" />
              </span>
              PNG Preview
            </CardTitle>
            <CardDescription>Preview PNG with transparency.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                handlePreview(
                  "/demo/sample-png.png",
                  "sample-png.png",
                  "image/png"
                )
              }
              variant="outline"
            >
              Preview PNG
            </Button>
          </CardContent>
        </Card>

        {/* SVG Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-full bg-orange-500/10 p-2 text-orange-500">
                <ImageIcon className="size-4" />
              </span>
              SVG Preview
            </CardTitle>
            <CardDescription>Preview Scalable Vector Graphics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                handlePreview(
                  "/demo/sample-svg.svg",
                  "sample-svg.svg",
                  "image/svg+xml"
                )
              }
              variant="outline"
            >
              Preview SVG
            </Button>
          </CardContent>
        </Card>

        {/* Video Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-full bg-purple-500/10 p-2 text-purple-500">
                <ImageIcon className="size-4" />
              </span>
              Video Preview
            </CardTitle>
            <CardDescription>Preview MP4 video (Remote URL).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                handlePreview(
                  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
                  "flower.mp4",
                  "video/mp4"
                )
              }
              variant="outline"
            >
              Preview Video
            </Button>
          </CardContent>
        </Card>

        {/* Audio Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-full bg-teal-500/10 p-2 text-teal-500">
                <ImageIcon className="size-4" />
              </span>
              Audio Preview
            </CardTitle>
            <CardDescription>Preview MP3 audio (Remote URL).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                handlePreview(
                  "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
                  "t-rex-roar.mp3",
                  "audio/mpeg"
                )
              }
              variant="outline"
            >
              Preview Audio
            </Button>
          </CardContent>
        </Card>
      </div>

      <FilePreviewDialog
        fileName={fileName}
        fileType={fileType}
        fileUrl={fileUrl}
        onOpenChange={setOpen}
        open={open}
      />
    </div>
  );
}
