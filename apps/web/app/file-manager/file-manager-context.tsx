"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory: boolean;
}

export type SortBy = "name" | "type" | "size" | "modified";
export type SortDirection = "asc" | "desc";
export type ViewMode = "grid" | "list";

interface FileManagerContextValue {
  currentPath: string;
  setCurrentPath: (path: string) => void;
  files: FileInfo[];
  setFiles: (files: FileInfo[]) => void;
}

const FileManagerContext = createContext<FileManagerContextValue | null>(null);

FileManagerContext.displayName = "FileManagerContext";

interface FileManagerProviderProps {
  children: ReactNode;
}

export function FileManagerProvider({ children }: FileManagerProviderProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileInfo[]>([]);

  return (
    <FileManagerContext.Provider
      value={{ currentPath, setCurrentPath, files, setFiles }}
    >
      {children}
    </FileManagerContext.Provider>
  );
}

export function useFileManager(): FileManagerContextValue {
  const context = useContext(FileManagerContext);
  if (!context) {
    throw new Error("useFileManager must be used within FileManagerProvider");
  }
  return context;
}
