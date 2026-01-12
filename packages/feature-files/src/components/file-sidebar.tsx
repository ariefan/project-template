"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Progress } from "@workspace/ui/components/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  HardDrive,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileManagerApi, type FileApiResponse } from "../lib/api";
import { NewButtonMenu } from "./new-button-menu";

interface TreeItem {
  name: string;
  path: string;
  children: TreeItem[];
}

function buildDirectoryTree(files: FileApiResponse[]): TreeItem[] {
  const directories = files.filter((f) => f.isDirectory);
  const dirMap = new Map<string, TreeItem>();

  for (const dir of directories) {
    dirMap.set(dir.path, { name: dir.name, path: dir.path, children: [] });
  }

  const roots: TreeItem[] = [];

  for (const dir of directories) {
    const node = dirMap.get(dir.path);
    if (!node) {
      continue;
    }

    const pathParts = dir.path.split("/");
    if (pathParts.length === 1) {
      roots.push(node);
    } else {
      const parentPath = pathParts.slice(0, -1).join("/");
      const parent = dirMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  const sortDirs = (dirs: TreeItem[]) => {
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    for (const dir of dirs) {
      sortDirs(dir.children);
    }
  };
  sortDirs(roots);

  return roots;
}

interface TreeProps {
  currentPath: string;
  item: TreeItem;
  onNavigate: (path: string) => void;
}

function Tree({ currentPath, item, onNavigate }: TreeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children.length > 0;
  const isActive = currentPath === item.path;

  useEffect(() => {
    if (currentPath.startsWith(item.path)) {
      setIsOpen(true);
    }
  }, [currentPath, item.path]);

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsOpen((prev) => !prev);
    }
    onNavigate(item.path);
  }, [hasChildren, item.path, onNavigate]);

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          className="data-[active=true]:bg-transparent"
          isActive={isActive}
          onClick={handleClick}
        >
          <div className="size-4" />
          <Folder className="size-4 text-blue-500" />
          {item.name}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        onOpenChange={setIsOpen}
        open={isOpen}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive} onClick={handleClick}>
            <ChevronRight className="transition-transform" />
            {isOpen ? (
              <FolderOpen className="size-4 text-blue-500" />
            ) : (
              <Folder className="size-4 text-blue-500" />
            )}
            {item.name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <Tree
                currentPath={currentPath}
                item={child}
                key={child.path}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

interface FileSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onCreateFolder: () => void;
  onUploadFiles: () => void;
  apiBaseUrl: string;
}

export function FileSidebar({
  currentPath,
  onNavigate,
  onCreateFolder,
  onUploadFiles,
  apiBaseUrl,
}: FileSidebarProps) {
  const [directories, setDirectories] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileApiResponse[]>([]);

  const api = useMemo(() => createFileManagerApi(apiBaseUrl), [apiBaseUrl]);

  useEffect(() => {
    async function loadDirectories() {
      setLoading(true);
      try {
        const fetchedFiles = await api.fetchAllFiles();
        setFiles(fetchedFiles);
        const dirTree = buildDirectoryTree(fetchedFiles);
        setDirectories(dirTree);
      } catch {
        // Ignore error
      } finally {
        setLoading(false);
      }
    }
    loadDirectories();
  }, [api]);

  // Calculate storage (only files, not directories)
  const totalSize = files
    .filter((f) => !f.isDirectory)
    .reduce((acc, f) => acc + f.size, 0);
  const maxStorage = 15 * 1024 * 1024 * 1024;
  const usagePercent = Math.min((totalSize / maxStorage) * 100, 100);
  const maxStorageGB = maxStorage / (1024 * 1024 * 1024);

  // Format usage dynamically, always show unit
  function formatUsage(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 0.5) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 0.5) {
      return `${mb.toFixed(1)} MB`;
    }
    const kb = bytes / 1024;
    if (kb >= 0.5) {
      return `${kb.toFixed(0)} KB`;
    }
    return `${bytes} B`;
  }

  const usageDisplay = formatUsage(totalSize);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <HardDrive className="size-8 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium text-xl">Storage</span>
            <span className="text-muted-foreground text-xs">
              {usageDisplay} / {maxStorageGB} GB
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* New Button Section */}
        <SidebarGroup className="px-3">
          <NewButtonMenu
            onCreateFolder={onCreateFolder}
            onUploadFiles={onUploadFiles}
          />
        </SidebarGroup>

        {/* Folders Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="flex items-center justify-center px-2 py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : // biome-ignore lint/style/noNestedTernary: Compact loading/empty state
            directories.length === 0 ? (
              <div className="px-2 py-1 text-muted-foreground text-sm">
                No folders found
              </div>
            ) : (
              <SidebarMenu>
                {directories.map((item) => (
                  <Tree
                    currentPath={currentPath}
                    item={item}
                    key={item.path}
                    onNavigate={onNavigate}
                  />
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-medium">
              {usageDisplay} / {maxStorageGB} GB
            </span>
          </div>
          <Progress value={usagePercent} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
