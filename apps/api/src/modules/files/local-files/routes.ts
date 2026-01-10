import type { FastifyInstance, RouteGenericInterface } from "fastify";
import { type FileInfo as StorageFileInfo, storageProvider } from "./storage";

// Top-level regex for performance
const INVALID_NAME_REGEX = /[<>:"|?*]/;

interface WildcardParams extends RouteGenericInterface {
  Params: {
    "*": string;
  };
}

interface MultipartFile {
  filename: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
}

// FileInfo for API responses (matches existing format with string dates)
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
  file?: FileInfo;
}

interface CreateFolderResponse {
  success: boolean;
  folder?: FileInfo;
  message?: string;
}

// Convert storage FileInfo to API FileInfo (with string dates)
function toFileInfo(file: StorageFileInfo): FileInfo {
  return {
    name: file.name,
    path: file.path,
    size: file.size,
    modified: file.modified.toISOString(),
    isDirectory: file.isDirectory,
  };
}

async function _getFilesRecursive(
  dirPath: string,
  relativePath = ""
): Promise<FileInfo[]> {
  const files = await storageProvider.listFiles(relativePath || dirPath, true);
  return files.map(toFileInfo);
}

async function getFilesInDirectory(dirPath: string): Promise<FileInfo[]> {
  const files = await storageProvider.listFiles(dirPath, false);
  return files.map(toFileInfo);
}

async function processSingleUpload(file: MultipartFile, dirPath: string) {
  const filename = file.filename;
  const relativePath = dirPath ? `${dirPath}/${filename}` : filename;
  const buffer = await file.toBuffer();
  const contentType = file.mimetype ?? "application/octet-stream";

  await storageProvider.upload(relativePath, buffer, contentType);

  const metadata = await storageProvider.getMetadata(relativePath);

  return {
    name: filename,
    path: relativePath,
    size: metadata?.size ?? 0,
    modified: metadata?.lastModified.toISOString() ?? new Date().toISOString(),
    isDirectory: false,
  };
}

async function handleFileOperation(
  operation: "copy" | "move",
  sourcePath: string,
  destination: string | undefined
) {
  if (!destination) {
    throw new Error("Destination path is required");
  }

  const fileName = sourcePath.split("/").pop() || sourcePath;
  const destFilePath = destination ? `${destination}/${fileName}` : fileName;

  // Check if source exists
  const sourceExists = await storageProvider.exists(sourcePath);
  if (!sourceExists) {
    const error = new Error("Source file not found");
    (error as unknown as { code: string }).code = "ENOENT";
    throw error;
  }

  // Check if destination already exists
  const destExists = await storageProvider.exists(destFilePath);
  if (destExists) {
    const error = new Error(
      "A file with that name already exists at the destination"
    );
    (error as unknown as { code: string }).code = "EEXIST";
    throw error;
  }

  if (operation === "copy") {
    await storageProvider.copyFile(sourcePath, destFilePath);
  } else {
    await storageProvider.moveFile(sourcePath, destFilePath);
  }

  const metadata = await storageProvider.getMetadata(destFilePath);
  return {
    name: fileName,
    path: destFilePath,
    size: metadata?.size ?? 0,
    modified: metadata?.lastModified.toISOString() ?? new Date().toISOString(),
    isDirectory: false,
  };
}

export function localFilesRoutes(app: FastifyInstance) {
  // Get all files recursively (for sidebar tree view)
  app.get("/local-files/all", async (_request, reply) => {
    try {
      const files = await _getFilesRecursive("", "");
      reply.send({ files });
    } catch {
      reply.status(404).send({ error: "Uploads directory not found" });
    }
  });

  // List all files in uploads directory
  app.get("/local-files", async (_request, reply) => {
    try {
      const files = await getFilesInDirectory("");
      reply.send({ files });
    } catch {
      reply.status(404).send({ error: "Uploads directory not found" });
    }
  });

  // List files in a specific subdirectory
  app.get<WildcardParams>("/local-files/*", async (request, reply) => {
    try {
      const wildcard = request.params["*"] ?? "";
      const dirPath = wildcard;

      const files = await getFilesInDirectory(dirPath);
      reply.send({ files, path: dirPath });
    } catch {
      reply.status(404).send({ error: "Directory not found" });
    }
  });

  // Upload single file
  app.post<WildcardParams>("/local-files/upload/*", async (request, reply) => {
    try {
      const dirPath = request.params["*"] ?? "";

      const data = await request.file();
      if (!data) {
        reply.status(400).send({ error: "No file uploaded" });
        return;
      }

      // Convert Fastify file to our interface
      const file: MultipartFile = {
        filename: data.filename,
        mimetype: data.mimetype,
        toBuffer: () => data.toBuffer(),
      };

      const fileInfo = await processSingleUpload(file, dirPath);

      reply.send({
        success: true,
        files: [fileInfo],
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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Upload logic is complex
    async (request, reply) => {
      try {
        const dirPath = request.params["*"] ?? "";

        const data = await request.files();
        const uploadedFiles: FileInfo[] = [];
        const errors: string[] = [];

        for (const fileData of Object.values(data)) {
          try {
            // We need to handle the fact that request.files() returns different structures
            // assuming it returns something compatible or we skip
            const f = fileData as unknown as MultipartFile;
            // Quick check if it has required methods
            if (typeof f.toBuffer !== "function") {
              continue;
            }

            const fileInfo = await processSingleUpload(f, dirPath);
            uploadedFiles.push(fileInfo);
          } catch {
            const f = fileData as { filename?: string };
            if (f.filename) {
              errors.push(f.filename);
            }
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

      const relativePath = dirPath ? `${dirPath}/${folderName}` : folderName;

      // Check if folder already exists
      const exists = await storageProvider.exists(`${relativePath}/`);
      if (exists) {
        reply.status(409).send({
          success: false,
          message: "Folder already exists",
        } as CreateFolderResponse);
        return;
      }

      await storageProvider.createFolder(relativePath);

      const metadata = await storageProvider.getMetadata(`${relativePath}/`);

      reply.send({
        success: true,
        folder: {
          name: folderName,
          path: relativePath,
          size: 0,
          modified:
            metadata?.lastModified.toISOString() ?? new Date().toISOString(),
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
          // Check if it's a directory by trying to list it
          const files = await storageProvider.listFiles(itemPath, false);

          if (files.length > 0) {
            // It's a directory
            await storageProvider.deleteFolder(itemPath);
          } else {
            // It's a file
            await storageProvider.delete(itemPath);
          }
          deletedPaths.push(itemPath);
        } catch {
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

      const fileInfo = await handleFileOperation(
        "copy",
        sourcePath,
        body.destination
      );

      reply.send({
        success: true,
        message: "File copied successfully",
        file: fileInfo,
      } as CopyMoveResponse);
    } catch (error) {
      const err = error as { code?: string; message: string };
      if (err.message === "Destination path is required") {
        reply.status(400).send({
          success: false,
          message: err.message,
        } as CopyMoveResponse);
        return;
      }
      if (err.code === "ENOENT") {
        reply.status(404).send({
          success: false,
          message: err.message,
        } as CopyMoveResponse);
        return;
      }
      if (err.code === "EEXIST") {
        reply.status(409).send({
          success: false,
          message: err.message,
        } as CopyMoveResponse);
        return;
      }
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

      const fileInfo = await handleFileOperation(
        "move",
        sourcePath,
        body.destination
      );

      reply.send({
        success: true,
        message: "File moved successfully",
        file: fileInfo,
      } as CopyMoveResponse);
    } catch (error) {
      const err = error as { code?: string; message: string };
      if (err.message === "Destination path is required") {
        reply.status(400).send({
          success: false,
          message: err.message,
        } as CopyMoveResponse);
        return;
      }
      if (err.code === "ENOENT") {
        reply.status(404).send({
          success: false,
          message: err.message,
        } as CopyMoveResponse);
        return;
      }
      if (err.code === "EEXIST") {
        reply.status(409).send({
          success: false,
          message: err.message,
        } as CopyMoveResponse);
        return;
      }
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

      const pathParts = sourcePath.split("/");
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join("/");

      // Check if source exists
      const sourceExists = await storageProvider.exists(sourcePath);
      if (!sourceExists) {
        reply.status(404).send({ success: false, message: "File not found" });
        return;
      }

      // Check if destination already exists
      const destExists = await storageProvider.exists(newPath);
      if (destExists) {
        reply.status(409).send({
          success: false,
          message: "A file with that name already exists",
        });
        return;
      }

      await storageProvider.moveFile(sourcePath, newPath);

      const metadata = await storageProvider.getMetadata(newPath);

      reply.send({
        success: true,
        file: {
          name: newName,
          path: newPath,
          size: metadata?.size ?? 0,
          modified:
            metadata?.lastModified.toISOString() ?? new Date().toISOString(),
          isDirectory: false,
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

      const metadata = await storageProvider.getMetadata(filePath);
      if (!metadata) {
        reply.status(404).send({ error: "File not found" });
        return;
      }

      const filename = filePath.split("/").pop() || filePath;
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      reply.header("Content-Type", "application/octet-stream");

      // For local storage, stream the file from disk
      if (storageProvider.name === "local") {
        // We need to construct the local file path
        // This is a limitation - the storage provider doesn't expose the base path
        // For now, we'll use download() which returns a buffer
        const buffer = await storageProvider.download(filePath);
        reply.send(buffer);
      } else {
        // For S3 and other providers, download and send
        const buffer = await storageProvider.download(filePath);
        reply.send(buffer);
      }
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

      const metadata = await storageProvider.getMetadata(filePath);
      if (!metadata) {
        reply.status(404).send({ error: "File not found" });
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

      reply.type(contentTypes[ext] || "application/octet-stream");

      // Download and send file
      const buffer = await storageProvider.download(filePath);
      reply.send(buffer);
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : "Preview failed",
      });
    }
  });
}
