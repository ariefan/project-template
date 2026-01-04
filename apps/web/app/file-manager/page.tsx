"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Copy,
  Download,
  FileArchiveIcon,
  FileCodeIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Filter,
  FolderIcon,
  FolderPlus,
  Grid3x3,
  ImageIcon,
  List,
  MoreHorizontal,
  Move,
  Search,
  Share2,
  SortAsc,
  Star,
  StarOff,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";

// Mock data for files and folders
const mockFiles = [
  {
    id: "1",
    name: "Project Proposal.pdf",
    type: "pdf",
    size: "2.4 MB",
    modified: "2024-01-15",
    starred: true,
  },
  {
    id: "2",
    name: "Budget Spreadsheet.xlsx",
    type: "spreadsheet",
    size: "1.8 MB",
    modified: "2024-01-14",
    starred: false,
  },
  {
    id: "3",
    name: "Team Photo.jpg",
    type: "image",
    size: "4.2 MB",
    modified: "2024-01-13",
    starred: true,
  },
  {
    id: "4",
    name: "Meeting Notes.docx",
    type: "document",
    size: "856 KB",
    modified: "2024-01-12",
    starred: false,
  },
  {
    id: "5",
    name: "Project Archive.zip",
    type: "archive",
    size: "15.3 MB",
    modified: "2024-01-11",
    starred: false,
  },
  {
    id: "6",
    name: "index.html",
    type: "code",
    size: "12 KB",
    modified: "2024-01-10",
    starred: false,
  },
  {
    id: "7",
    name: "styles.css",
    type: "code",
    size: "8 KB",
    modified: "2024-01-10",
    starred: false,
  },
  {
    id: "8",
    name: "app.tsx",
    type: "code",
    size: "24 KB",
    modified: "2024-01-09",
    starred: true,
  },
];

const mockFolders = [
  {
    id: "f1",
    name: "Documents",
    itemCount: 12,
    modified: "2024-01-15",
    starred: true,
  },
  {
    id: "f2",
    name: "Images",
    itemCount: 45,
    modified: "2024-01-14",
    starred: false,
  },
  {
    id: "f3",
    name: "Projects",
    itemCount: 8,
    modified: "2024-01-13",
    starred: true,
  },
  {
    id: "f4",
    name: "Archives",
    itemCount: 3,
    modified: "2024-01-12",
    starred: false,
  },
];

function getFileIcon(type: string) {
  switch (type) {
    case "image":
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    case "document":
      return <FileTextIcon className="h-8 w-8 text-red-500" />;
    case "spreadsheet":
      return <FileSpreadsheetIcon className="h-8 w-8 text-green-500" />;
    case "archive":
      return <FileArchiveIcon className="h-8 w-8 text-yellow-500" />;
    case "code":
      return <FileCodeIcon className="h-8 w-8 text-purple-500" />;
    default:
      return <FileIcon className="h-8 w-8 text-gray-500" />;
  }
}

function getFileTypeBadge(type: string) {
  const typeMap: Record<
    string,
    { label: string; variant: "default" | "secondary" }
  > = {
    image: { label: "IMG", variant: "default" },
    document: { label: "DOC", variant: "secondary" },
    spreadsheet: { label: "XLSX", variant: "secondary" },
    archive: { label: "ZIP", variant: "secondary" },
    code: { label: "CODE", variant: "secondary" },
    pdf: { label: "PDF", variant: "secondary" },
  };

  const { label, variant } = typeMap[type] || {
    label: "FILE",
    variant: "secondary",
  };
  return <Badge variant={variant}>{label}</Badge>;
}

export default function FileManagerPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("name");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleStar = (id: string) => {
    // In a real app, this would update the backend
    console.log("Toggle star:", id);
  };

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Documents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Projects</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search files and folders..."
              type="search"
            />
          </div>

          {/* View Toggle */}
          <div className="flex rounded-md border">
            <Button
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
              size="icon"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
              size="icon"
              variant={viewMode === "list" ? "secondary" : "ghost"}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Sort */}
          <Select onValueChange={setSortBy} value={sortBy}>
            <SelectTrigger className="w-[140px]">
              <SortAsc className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline">
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Filter files</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Actions */}
          <div className="ml-auto flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline">
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New folder</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline">
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload files</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Download selected
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Move className="mr-2 h-4 w-4" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selection Info */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
            <span className="font-medium">
              {selectedItems.length} items selected
            </span>
            <Button
              onClick={() => setSelectedItems([])}
              size="sm"
              variant="ghost"
            >
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* Folders Section */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Folders</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockFolders.map((folder) => (
            <div
              className="group relative flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              key={folder.id}
            >
              <div className="flex items-start justify-between">
                <FolderIcon className="h-10 w-10 text-blue-500" />
                <Button
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(folder.id);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  {folder.starred ? (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <button
                className="flex flex-1 flex-col items-start gap-1 text-left"
                onClick={() => console.log("Navigate to folder:", folder.name)}
                type="button"
              >
                <h3 className="truncate font-medium">{folder.name}</h3>
                <p className="text-muted-foreground text-sm">
                  {folder.itemCount} items
                </p>
                <p className="text-muted-foreground text-xs">
                  Modified {folder.modified}
                </p>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Files Section */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Files</h2>
        {viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mockFiles.map((file) => (
              <div
                className={`group relative flex flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-accent ${
                  selectedItems.includes(file.id) ? "ring-2 ring-primary" : ""
                }`}
                key={file.id}
              >
                <div className="flex items-start justify-between">
                  {getFileIcon(file.type)}
                  <div className="flex gap-1">
                    <Button
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(file.id);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      {file.starred ? (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Move className="mr-2 h-4 w-4" />
                          Move
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <button
                  className="flex flex-1 flex-col items-start gap-1 text-left"
                  onClick={() => toggleSelect(file.id)}
                  type="button"
                >
                  <h3 className="truncate font-medium">{file.name}</h3>
                  <div className="flex items-center gap-2">
                    {getFileTypeBadge(file.type)}
                    <span className="text-muted-foreground text-sm">
                      {file.size}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Modified {file.modified}
                  </p>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-sm">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-sm">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-sm">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-sm">
                    Modified
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockFiles.map((file) => (
                  <tr
                    className={`border-b transition-colors hover:bg-accent ${
                      selectedItems.includes(file.id) ? "bg-accent" : ""
                    }`}
                    key={file.id}
                  >
                    <td className="px-4 py-3">
                      <button
                        className="flex w-full items-center gap-3 text-left"
                        onClick={() => toggleSelect(file.id)}
                        type="button"
                      >
                        {getFileIcon(file.type)}
                        <div className="flex flex-col">
                          <span className="font-medium">{file.name}</span>
                          {file.starred && (
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">{getFileTypeBadge(file.type)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {file.size}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {file.modified}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="h-8 w-8"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Move className="mr-2 h-4 w-4" />
                            Move
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
