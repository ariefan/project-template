import { Button } from "@workspace/ui/components/button";
import { CirclePlus, FileX, FolderOpen, Upload } from "lucide-react";

interface EmptyStateProps {
  type: "no-files" | "no-results";
  searchQuery?: string;
  onCreateFolder?: () => void;
  onUpload?: () => void;
}

export function EmptyState({
  type,
  searchQuery,
  onCreateFolder,
  onUpload,
}: EmptyStateProps) {
  if (type === "no-results") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
          <FileX className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">No results found</h3>
        <p className="text-muted-foreground text-sm">
          No files match "{searchQuery}"
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
        <FolderOpen className="size-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">This folder is empty</h3>
      <p className="text-muted-foreground text-sm">
        Upload files or create a new folder to get started
      </p>
      <div className="mt-4 flex gap-2">
        <Button onClick={onCreateFolder} size="sm" variant="outline">
          <CirclePlus className="mr-2 h-4 w-4" />
          New Folder
        </Button>
        <Button onClick={onUpload} size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>
    </div>
  );
}
