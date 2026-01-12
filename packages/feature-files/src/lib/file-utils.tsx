"use client";

import { Badge } from "@workspace/ui/components/badge";
import type { LucideIcon } from "lucide-react";
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
} from "lucide-react";

export type FileType =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "code"
  | "other";

const FILE_ICON_SIZE = "size-4";

// Top-level regex for performance
const TRAILING_SEPARATOR_REGEX = /[\\/]+$/;

export function getFileType(fileName: string, isDirectory: boolean): FileType {
  if (isDirectory) {
    return "folder";
  }

  // Strip trailing path separators that might cause issues
  const cleanName = fileName.replace(TRAILING_SEPARATOR_REGEX, "");
  const ext = cleanName.split(".").pop()?.toLowerCase() || "";

  const imageExts = ["jpg", "jpeg", "png", "gif", "svg", "webp", "ico", "bmp"];
  const videoExts = ["mp4", "webm", "mov", "avi", "mkv", "flv"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];
  const documentExts = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "rtf",
    "csv",
  ];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz"];
  const codeExts = [
    "js",
    "ts",
    "jsx",
    "tsx",
    "html",
    "css",
    "json",
    "py",
    "java",
    "cpp",
    "c",
    "md",
    "yaml",
    "yml",
  ];

  if (imageExts.includes(ext)) {
    return "image";
  }
  if (videoExts.includes(ext)) {
    return "video";
  }
  if (audioExts.includes(ext)) {
    return "audio";
  }
  if (documentExts.includes(ext)) {
    return "document";
  }
  if (archiveExts.includes(ext)) {
    return "archive";
  }
  if (codeExts.includes(ext)) {
    return "code";
  }

  return "other";
}

const FILE_TYPE_COLORS: Record<FileType, string> = {
  folder: "text-blue-500",
  image: "text-purple-500",
  video: "text-pink-500",
  audio: "text-orange-500",
  document: "text-blue-600",
  archive: "text-amber-600",
  code: "text-green-600",
  other: "text-gray-500",
};

const FILE_TYPE_ICONS: Record<FileType, LucideIcon> = {
  folder: Folder,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  archive: FileArchive,
  code: FileCode,
  other: File,
};

export function getFileIcon(
  fileType: FileType,
  className: string = FILE_ICON_SIZE
) {
  const Icon = FILE_TYPE_ICONS[fileType] || File;
  const colorClass = FILE_TYPE_COLORS[fileType];

  return <Icon className={`${className} ${colorClass}`} />;
}

export function getFileTypeBadge(fileType: FileType) {
  const badges: Record<FileType, { label: string; variant: string }> = {
    folder: { label: "Folder", variant: "default" },
    image: { label: "Image", variant: "secondary" },
    video: { label: "Video", variant: "secondary" },
    audio: { label: "Audio", variant: "secondary" },
    document: { label: "Document", variant: "outline" },
    archive: { label: "Archive", variant: "outline" },
    code: { label: "Code", variant: "outline" },
    other: { label: "File", variant: "secondary" },
  };

  const badge = badges[fileType];
  return <Badge variant={badge.variant as never}>{badge.label}</Badge>;
}

export function getFileSizeColor(size: number): string {
  const mb = size / (1024 * 1024);
  if (mb < 1) {
    return "text-green-600";
  }
  if (mb < 10) {
    return "text-yellow-600";
  }
  return "text-red-600";
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

import type { FileInfo, SortBy } from "../context/file-manager-context";

export function compareFiles(
  a: FileInfo,
  b: FileInfo,
  sortBy: SortBy,
  sortDirection: "asc" | "desc"
): number {
  if (a.isDirectory && !b.isDirectory) {
    return -1;
  }
  if (!a.isDirectory && b.isDirectory) {
    return 1;
  }

  let comparison = 0;
  switch (sortBy) {
    case "name":
      comparison = a.name.localeCompare(b.name);
      break;
    case "type":
      comparison = getFileType(a.name, a.isDirectory).localeCompare(
        getFileType(b.name, b.isDirectory)
      );
      break;
    case "size":
      comparison = a.size - b.size;
      break;
    case "modified":
      comparison =
        new Date(a.modified).getTime() - new Date(b.modified).getTime();
      break;
    default:
      comparison = 0;
  }

  return sortDirection === "desc" ? -comparison : comparison;
}
