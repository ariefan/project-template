import fs from "node:fs/promises";
import path from "node:path";
import { createStorageProvider, type StorageConfig } from "@workspace/storage";
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth.server";

// Initialize storage provider
// In production, we would check env vars for S3 config
// Point to apis/api/uploads (shared storage directory)
const STORAGE_ROOT = path.resolve(process.cwd(), "..", "api", "uploads");
const storageConfig: StorageConfig = {
  type: "local",
  localPath: STORAGE_ROOT,
};

function handleError(error: unknown) {
  console.error("Storage API Error:", error);
  const message =
    error instanceof Error ? error.message : "Internal Server Error";
  return new NextResponse(message, { status: 500 });
}

// Ensure storage root exists
const ensureStorageInit = async () => {
  try {
    await fs.mkdir(STORAGE_ROOT, { recursive: true });
  } catch {
    // Ignore if exists
  }
};
const storage = createStorageProvider(storageConfig);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  await ensureStorageInit();
  const session = await getSession();
  if (!session?.data?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: urlPath } = await params;
  const pathSegments = urlPath || [];
  const action = pathSegments[0];

  try {
    // Search
    if (action === "search") {
      const query = req.nextUrl.searchParams.get("q") || "";
      // Simple search implementation (recursive list and filter)
      // Note: In a real app, use database or search index
      const allFiles = await storage.listFiles("", true);
      const matched = allFiles.filter((f) =>
        f.name.toLowerCase().includes(query.toLowerCase())
      );
      return NextResponse.json({
        files: matched.map((f) => ({
          ...f,
          modified: f.modified.toISOString(), // Ensure ISO string
        })),
      });
    }

    // List All
    if (action === "all") {
      const files = await storage.listFiles("", true);
      return NextResponse.json({
        files: files.map((f) => ({
          ...f,
          modified: f.modified.toISOString(),
        })),
      });
    }

    // Download
    if (action === "download") {
      const filePath = pathSegments.slice(1).join("/");
      if (!filePath) {
        return new NextResponse("File path required", { status: 400 });
      }

      // Note: storage.download returns a Buffer. For large files, streaming is better.
      // But StorageProvider interface currently returns Buffer.
      const buffer = await storage.download(filePath);
      const metadata = await storage.getMetadata(filePath);

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": metadata?.contentType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${path.basename(
            filePath
          )}"`,
        },
      });
    }

    // Preview (simple: serve content inline)
    if (action === "preview") {
      const filePath = pathSegments.slice(1).join("/");
      if (!filePath) {
        return new NextResponse("File path required", { status: 400 });
      }

      const buffer = await storage.download(filePath);
      const metadata = await storage.getMetadata(filePath);

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": metadata?.contentType || "application/octet-stream",
          "Content-Disposition": "inline",
        },
      });
    }

    // List Directory (Root or Subfolder)
    // If action is not a keyword, treat entire path as folder path
    const folderPath = pathSegments.join("/");
    const files = await storage.listFiles(folderPath, false);
    return NextResponse.json({
      files: files.map((f) => ({
        ...f,
        modified: f.modified.toISOString(),
      })),
      path: folderPath,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

async function handleUpload(req: NextRequest, targetDir: string) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new NextResponse("No file provided", { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = targetDir ? path.join(targetDir, file.name) : file.name;
  // Normalize path separators for storage provider
  const normalizedPath = filePath.split(path.sep).join("/");

  await storage.upload(
    normalizedPath,
    buffer,
    file.type || "application/octet-stream"
  );
  const metadata = await storage.getMetadata(normalizedPath);

  // Return single file in array as expected by api.ts helper
  return NextResponse.json({
    files: [
      {
        name: file.name,
        path: normalizedPath,
        size: metadata?.size || 0,
        modified:
          metadata?.lastModified.toISOString() || new Date().toISOString(),
        isDirectory: false,
      },
    ],
  });
}

async function handleCreateFolder(req: NextRequest, targetBase: string) {
  const { name } = await req.json();
  if (!name) {
    return new NextResponse("Name required", { status: 400 });
  }

  const newFolderPath = targetBase ? path.join(targetBase, name) : name;
  const normalizedPath = newFolderPath.split(path.sep).join("/");

  await storage.createFolder(normalizedPath);

  return NextResponse.json({
    folder: {
      name,
      path: normalizedPath,
      size: 0,
      modified: new Date().toISOString(),
      isDirectory: true,
    },
  });
}

async function handleCopy(req: NextRequest, sourcePath: string) {
  const { destination } = await req.json();
  await storage.copyFile(sourcePath, destination);
  const metadata = await storage.getMetadata(destination);
  return NextResponse.json({
    file: {
      name: path.basename(destination),
      path: destination,
      size: metadata?.size || 0,
      modified:
        metadata?.lastModified.toISOString() || new Date().toISOString(), // Copy usually updates modified?
      isDirectory: false, // Assuming file copy
    },
  });
}

async function handleMove(req: NextRequest, sourcePath: string) {
  const { destination } = await req.json();
  await storage.moveFile(sourcePath, destination);
  const metadata = await storage.getMetadata(destination);
  return NextResponse.json({
    file: {
      name: path.basename(destination),
      path: destination,
      size: metadata?.size || 0,
      modified:
        metadata?.lastModified.toISOString() || new Date().toISOString(),
      isDirectory: false,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  await ensureStorageInit();
  const session = await getSession();
  if (!session?.data?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: urlPath } = await params;
  const pathSegments = urlPath || [];
  const action = pathSegments[0];

  try {
    // Upload
    if (action === "upload") {
      const targetDir = pathSegments.slice(1).join("/");
      return await handleUpload(req, targetDir);
    }

    // Create Folder
    if (action === "folder") {
      const targetBase = pathSegments.slice(1).join("/");
      return await handleCreateFolder(req, targetBase);
    }

    // Copy
    if (action === "copy") {
      const sourcePath = pathSegments.slice(1).join("/");
      return await handleCopy(req, sourcePath);
    }

    // Move
    if (action === "move") {
      const sourcePath = pathSegments.slice(1).join("/");
      return await handleMove(req, sourcePath);
    }

    return new NextResponse("Invalid action", { status: 400 });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  _context: unknown // Params not needed for root DELETE
) {
  await ensureStorageInit();
  const session = await getSession();
  if (!session?.data?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { items } = await req.json();
    if (!Array.isArray(items)) {
      return new NextResponse("Items array required", { status: 400 });
    }

    // Parallel delete
    // StorageProvider interface has delete(path) and deleteFolder(path).
    // api.ts sends paths. If path is folder, we should use deleteFolder?
    // But api.ts doesn't specify type.
    // Simple logic: try delete, if fails try deleteFolder?
    // Or check exists first?

    // Revised logic:
    // Local provider 'delete' typically unlinks. 'rm -rf' needed for folder.
    // Let's assume for now mixed items are handled or we need a helper.
    // Since we can't easily know if it's a folder without checking:

    for (const itemPath of items) {
      // Basic heuristic or try/catch approach
      try {
        // Try delete as file first
        await storage.delete(itemPath);
      } catch {
        // Try delete as folder
        await storage.deleteFolder(itemPath);
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  await ensureStorageInit();
  const session = await getSession();
  if (!session?.data?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: urlPath } = await params;
  const pathSegments = urlPath || [];
  const action = pathSegments[0];

  try {
    if (action === "rename") {
      const oldPath = pathSegments.slice(1).join("/");
      const { name: newName } = await req.json();

      // Construct new path
      const dir = path.dirname(oldPath);
      const newPath = dir === "." ? newName : path.join(dir, newName);
      const normalizedNewPath = newPath.split(path.sep).join("/");

      await storage.moveFile(oldPath, normalizedNewPath);
      const metadata = await storage.getMetadata(normalizedNewPath);
      return NextResponse.json({
        file: {
          name: newName,
          path: normalizedNewPath,
          size: metadata?.size || 0,
          modified:
            metadata?.lastModified.toISOString() || new Date().toISOString(),
          isDirectory: false, // TODO: Handle folder rename
        },
      });
    }
    return new NextResponse("Invalid action", { status: 400 });
  } catch (error: unknown) {
    return handleError(error);
  }
}
