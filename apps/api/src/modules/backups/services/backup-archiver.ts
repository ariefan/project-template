import crypto from "node:crypto";
import type { FileRow } from "@workspace/db/schema";
import archiver from "archiver";
import { storageProvider } from "../../storage/storage";
import { encryptBuffer } from "./backup-crypto";

/**
 * Create a zip archive of organization data and files
 */
export function createBackupArchive(
  _organizationId: string,
  data: Record<string, unknown[]>,
  files: FileRow[],
  password?: string
): Promise<{ buffer: Buffer; size: number; checksum: string }> {
  return new Promise((resolve, reject) => {
    (async () => {
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      const chunks: Buffer[] = [];

      archive.on("data", (chunk) => chunks.push(chunk));
      archive.on("error", (err) => reject(err));
      archive.on("end", () => {
        let buffer = Buffer.concat(chunks);

        // Encrypt if password provided
        if (password) {
          try {
            const { encrypted } = encryptBuffer(buffer, password);
            // biome-ignore lint/suspicious/noExplicitAny: Buffer type mismatch workaround
            buffer = encrypted as any;
          } catch (e) {
            return reject(e);
          }
        }

        const hash = crypto.createHash("sha256");
        hash.update(buffer);
        const checksum = hash.digest("hex");
        const size = buffer.length;

        resolve({ buffer, size, checksum });
      });

      // Append JSON data
      archive.append(JSON.stringify(data, null, 2), { name: "data.json" });

      // Append files
      const storage = storageProvider;

      for (const file of files) {
        try {
          if (!file.storagePath) {
            continue;
          }

          // ...
          const fileBuffer = await storage.download(file.storagePath);

          archive.append(fileBuffer, { name: `files/${file.filename}` });
        } catch (err) {
          console.warn(`Failed to include file ${file.id} in backup:`, err);
        }
      }

      await archive.finalize();
    })().catch(reject);
  });
}
