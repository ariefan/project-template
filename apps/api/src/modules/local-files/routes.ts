import { createReadStream, existsSync } from "node:fs";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance, RouteGenericInterface } from "fastify";

const UPLOADS_BASE_PATH = join(process.cwd(), "uploads");

// Top-level regex for performance
const INVALID_NAME_REGEX = /[<>:"|?*]/;

interface WildcardParams extends RouteGenericInterface {
  Params: {
    "*": string;
  };
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory: boolean;
}

interface UploadResponse {
  success: boolean;
  files: FileInfo[];
  errors?: string[];
}

interface DeleteResponse {
  success: boolean;
  message?: string;
}

interface CopyMoveResponse {
  success: boolean;
  message?: string;
}

interface CreateFolderResponse {
  success: boolean;
  folder?: FileInfo;
  message?: string;
}

// Ensure uploads directory exists
async function ensureUploadsDir() {
  if (!existsSync(UPLOADS_BASE_PATH)) {
    await mkdir(UPLOADS_BASE_PATH, { recursive: true });
  }
}

async function _getFilesRecursive(
  dirPath: string,
  relativePath = ""
): Promise<FileInfo[]> {
  const fullPath = join(UPLOADS_BASE_PATH, dirPath, relativePath);
  const entries = await readdir(fullPath, { withFileTypes: true });
  const files: FileInfo[] = [];

  for (const entry of entries) {
    const entryPath = join(fullPath, entry.name);
    const stats = await stat(entryPath);
    const relativeEntryPath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    files.push({
      name: entry.name,
      path: relativeEntryPath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      isDirectory: entry.isDirectory(),
    });

    if (entry.isDirectory()) {
      const subFiles = await _getFilesRecursive(dirPath, relativeEntryPath);
      files.push(...subFiles);
    }
  }

  return files;
}

async function getFilesInDirectory(dirPath: string): Promise<FileInfo[]> {
  await ensureUploadsDir();
  const fullPath = join(UPLOADS_BASE_PATH, dirPath);
  const entries = await readdir(fullPath, { withFileTypes: true });
  const files: FileInfo[] = [];

  for (const entry of entries) {
    const entryPath = join(fullPath, entry.name);
    const stats = await stat(entryPath);
    const relativeEntryPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;

    files.push({
      name: entry.name,
      path: relativeEntryPath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      isDirectory: entry.isDirectory(),
    });
  }

  return files;
}

export async function localFilesRoutes(app: FastifyInstance) {
  // Ensure uploads directory exists on startup
  await ensureUploadsDir();

  // Get all files recursively (for sidebar tree view)
  app.get("/local-files/all", async (_request, reply) => {
    try {
      const files = await _getFilesRecursive("", "");
      reply.send({ files });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        reply.status(404).send({ error: "Uploads directory not found" });
        return;
      }
      throw error;
    }
  });

  // List all files in uploads directory
  app.get("/local-files", async (_request, reply) => {
    try {
      const files = await getFilesInDirectory("");
      reply.send({ files });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        reply.status(404).send({ error: "Uploads directory not found" });
        return;
      }
      throw error;
    }
  });

  // List files in a specific subdirectory
  app.get<WildcardParams>("/local-files/*", async (request, reply) => {
    try {
      const wildcard = request.params["*"] ?? "";
      const dirPath = wildcard;

      const files = await getFilesInDirectory(dirPath);
      reply.send({ files, path: dirPath });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        reply.status(404).send({ error: "Directory not found" });
        return;
      }
      throw error;
    }
  });

  // Upload single file
  app.post<WildcardParams>("/local-files/upload/*", async (request, reply) => {
    try {
      const dirPath = request.params["*"] ?? "";

      const uploadDir = join(UPLOADS_BASE_PATH, dirPath);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const data = await request.file();
      if (!data) {
        reply.status(400).send({ error: "No file uploaded" });
        return;
      }

      const filename = data.filename;
      const filePath = join(uploadDir, filename);

      // Write the file
      const buffer = await data.toBuffer();
      await writeFile(filePath, buffer);

      const stats = await stat(filePath);
      const relativePath = dirPath ? `${dirPath}/${filename}` : filename;

      reply.send({
        success: true,
        files: [
          {
            name: filename,
            path: relativePath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            isDirectory: false,
          },
        ],
      } as UploadResponse);
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  });

  // Upload multiple files
  app.post<WildcardParams>(
    "/local-files/upload-multiple/*",
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: File upload logic with error handling
    async (request, reply) => {
      try {
        const dirPath = request.params["*"] ?? "";

        const uploadDir = join(UPLOADS_BASE_PATH, dirPath);
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        const data = await request.files();
        const uploadedFiles: FileInfo[] = [];
        const errors: string[] = [];

        for (const file of Object.values(data)) {
          try {
            const f = file as {
              filename: string;
              toBuffer: () => Promise<Buffer>;
            };
            const filename = f.filename;
            const filePath = join(uploadDir, filename);
            const buffer = await f.toBuffer();
            await writeFile(filePath, buffer);

            const stats = await stat(filePath);
            const relativePath = dirPath ? `${dirPath}/${filename}` : filename;

            uploadedFiles.push({
              name: filename,
              path: relativePath,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              isDirectory: false,
            });
          } catch (_err) {
            const f = file as { filename: string };
            errors.push(f.filename);
          }
        }

        reply.send({
          success: uploadedFiles.length > 0,
          files: uploadedFiles,
          errors: errors.length > 0 ? errors : undefined,
        } as UploadResponse);
      } catch (error) {
        reply.status(500).send({
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }
  );

  // Create folder
  app.post<WildcardParams>("/local-files/folder/*", async (request, reply) => {
    try {
      const dirPath = request.params["*"] ?? "";
      const body = request.body as { name?: string };

      const folderName = body?.name?.trim();
      if (!folderName) {
        reply.status(400).send({
          success: false,
          message: "Folder name is required",
        } as CreateFolderResponse);
        return;
      }

      if (INVALID_NAME_REGEX.test(folderName)) {
        reply.status(400).send({
          success: false,
          message: "Invalid folder name",
        } as CreateFolderResponse);
        return;
      }

      const newFolderPath = join(UPLOADS_BASE_PATH, dirPath, folderName);
      if (existsSync(newFolderPath)) {
        reply.status(409).send({
          success: false,
          message: "Folder already exists",
        } as CreateFolderResponse);
        return;
      }

      await mkdir(newFolderPath, { recursive: true });
      const stats = await stat(newFolderPath);
      const relativePath = dirPath ? `${dirPath}/${folderName}` : folderName;

      reply.send({
        success: true,
        folder: {
          name: folderName,
          path: relativePath,
          size: 0,
          modified: stats.mtime.toISOString(),
          isDirectory: true,
        },
      } as CreateFolderResponse);
    } catch (error) {
      reply.status(500).send({
        error:
          error instanceof Error ? error.message : "Failed to create folder",
      });
    }
  });

  // Delete file or folder
  app.delete<WildcardParams>("/local-files/*", async (request, reply) => {
    try {
      const body = request.body as { items?: string[] };
      let itemsToDelete: string[];

      if (body.items && body.items.length > 0) {
        itemsToDelete = body.items;
      } else {
        itemsToDelete = [request.params["*"]];
      }

      const deletedPaths: string[] = [];
      const errors: string[] = [];

      for (const itemPath of itemsToDelete) {
        try {
          const fullPath = join(UPLOADS_BASE_PATH, itemPath);
          await rm(fullPath, { recursive: true, force: true });
          deletedPaths.push(itemPath);
        } catch (_err) {
          errors.push(itemPath);
        }
      }

      if (deletedPaths.length === 0) {
        reply.status(404).send({
          success: false,
          message: "No items were deleted",
        } as DeleteResponse);
        return;
      }

      reply.send({
        success: true,
        message: `Deleted ${deletedPaths.length} item${deletedPaths.length > 1 ? "s" : ""}`,
      } as DeleteResponse);
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : "Delete failed",
      });
    }
  });

  // Copy file/folder
  app.post<WildcardParams>("/local-files/copy/*", async (request, reply) => {
    try {
      const sourcePath = request.params["*"];
      const body = request.body as { destination?: string };
      const destination = body.destination;

      if (!destination) {
        reply.status(400).send({
          success: false,
          message: "Destination path is required",
        } as CopyMoveResponse);
        return;
      }

      const sourceFullPath = join(UPLOADS_BASE_PATH, sourcePath);
      const destFullPath = join(UPLOADS_BASE_PATH, destination);
      const fileName = sourcePath.split("/").pop() || sourcePath;
      const destFilePath = join(destFullPath, fileName);

      // Ensure destination directory exists
      if (!existsSync(destFullPath)) {
        await mkdir(destFullPath, { recursive: true });
      }

      // Check if destination file already exists
      if (existsSync(destFilePath)) {
        reply.status(409).send({
          success: false,
          message: "A file with that name already exists at the destination",
        } as CopyMoveResponse);
        return;
      }

      const sourceStats = await stat(sourceFullPath);

      if (sourceStats.isDirectory()) {
        // Recursive copy for directories
        await cp(sourceFullPath, destFilePath, { recursive: true });
      } else {
        // Copy single file
        await writeFile(destFilePath, await readFile(sourceFullPath));
      }

      const stats = await stat(destFilePath);
      const relativePath = destination
        ? `${destination}/${fileName}`
        : fileName;

      reply.send({
        success: true,
        message: "File copied successfully",
        file: {
          name: fileName,
          path: relativePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          isDirectory: stats.isDirectory(),
        },
      } as CopyMoveResponse & { file?: FileInfo });
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : "Copy failed",
      });
    }
  });

  // Move file/folder
  app.post<WildcardParams>("/local-files/move/*", async (request, reply) => {
    try {
      const sourcePath = request.params["*"];
      const body = request.body as { destination?: string };
      const destination = body.destination;

      if (!destination) {
        reply.status(400).send({
          success: false,
          message: "Destination path is required",
        } as CopyMoveResponse);
        return;
      }

      const sourceFullPath = join(UPLOADS_BASE_PATH, sourcePath);
      const destFullPath = join(UPLOADS_BASE_PATH, destination);
      const fileName = sourcePath.split("/").pop() || sourcePath;
      const destFilePath = join(destFullPath, fileName);

      // Ensure destination directory exists
      if (!existsSync(destFullPath)) {
        await mkdir(destFullPath, { recursive: true });
      }

      // Check if destination file already exists
      if (existsSync(destFilePath)) {
        reply.status(409).send({
          success: false,
          message: "A file with that name already exists at the destination",
        } as CopyMoveResponse);
        return;
      }

      // Use rename to move the file/folder
      await rename(sourceFullPath, destFilePath);

      const stats = await stat(destFilePath);
      const relativePath = destination
        ? `${destination}/${fileName}`
        : fileName;

      reply.send({
        success: true,
        message: "File moved successfully",
        file: {
          name: fileName,
          path: relativePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          isDirectory: stats.isDirectory(),
        },
      } as CopyMoveResponse & { file?: FileInfo });
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : "Move failed",
      });
    }
  });

  // Rename file/folder
  app.patch<WildcardParams>("/local-files/rename/*", async (request, reply) => {
    try {
      const sourcePath = request.params["*"];
      const body = request.body as { name?: string };
      const newName = body.name?.trim();

      if (!newName) {
        reply.status(400).send({
          success: false,
          message: "New name is required",
        });
        return;
      }

      if (INVALID_NAME_REGEX.test(newName)) {
        reply
          .status(400)
          .send({ success: false, message: "Invalid file name" });
        return;
      }

      const sourceFullPath = join(UPLOADS_BASE_PATH, sourcePath);
      const parentDir = join(sourceFullPath, "..");
      const newPath = join(parentDir, newName);

      if (!existsSync(sourceFullPath)) {
        reply.status(404).send({ success: false, message: "File not found" });
        return;
      }

      if (existsSync(newPath)) {
        reply.status(409).send({
          success: false,
          message: "A file with that name already exists",
        });
        return;
      }

      await rename(sourceFullPath, newPath);

      const stats = await stat(newPath);
      const pathParts = sourcePath.split("/");
      pathParts[pathParts.length - 1] = newName;
      const newPathRelative = pathParts.join("/");

      reply.send({
        success: true,
        file: {
          name: newName,
          path: newPathRelative,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          isDirectory: stats.isDirectory(),
        },
      });
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : "Rename failed",
      });
    }
  });

  // Download file
  app.get<WildcardParams>("/local-files/download/*", async (request, reply) => {
    try {
      const filePath = request.params["*"];

      const fullPath = join(UPLOADS_BASE_PATH, filePath);
      if (!existsSync(fullPath)) {
        reply.status(404).send({ error: "File not found" });
        return;
      }

      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        reply.status(400).send({ error: "Cannot download a directory" });
        return;
      }

      const filename = filePath.split("/").pop() || filePath;
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      reply.header("Content-Type", "application/octet-stream");

      // Stream the file
      const fileStream = createReadStream(fullPath);
      reply.raw.writeHead(200, {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/octet-stream",
      });
      await pipeline(fileStream, reply.raw);
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : "Download failed",
      });
    }
  });

  // Preview file
  app.get<WildcardParams>("/local-files/preview/*", async (request, reply) => {
    try {
      const filePath = request.params["*"];

      const fullPath = join(UPLOADS_BASE_PATH, filePath);
      if (!existsSync(fullPath)) {
        reply.status(404).send({ error: "File not found" });
        return;
      }

      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        reply.status(400).send({ error: "Cannot preview a directory" });
        return;
      }

      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      const contentTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        svg: "image/svg+xml",
        webp: "image/webp",
        ico: "image/x-icon",
        bmp: "image/bmp",
        pdf: "application/pdf",
        txt: "text/plain",
        html: "text/html",
        css: "text/css",
        js: "application/javascript",
        json: "application/json",
        mp4: "video/mp4",
        webm: "video/webm",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
      };

      reply.raw.writeHead(200, {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
      });

      const fileStream = createReadStream(fullPath);
      await pipeline(fileStream, reply.raw);
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : "Preview failed",
      });
    }
  });
}
