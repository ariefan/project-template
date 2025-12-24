# @workspace/storage

**File storage abstraction with local and S3/R2 providers**

This package provides a unified interface for file storage operations with support for local filesystem (development) and S3-compatible storage (production, including Cloudflare R2).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        @workspace/storage                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   StorageProvider Interface                   │  │
│  │  upload() | download() | delete() | exists() | getMetadata() │  │
│  │  getPresignedUploadUrl() | getPresignedDownloadUrl()         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│              ┌───────────────┴───────────────┐                      │
│              ▼                               ▼                      │
│  ┌────────────────────────┐    ┌────────────────────────┐          │
│  │    Local Provider      │    │      S3 Provider       │          │
│  │  - Local filesystem    │    │  - AWS S3              │          │
│  │  - Development         │    │  - Cloudflare R2       │          │
│  │  - No presigned URLs   │    │  - MinIO               │          │
│  └────────────────────────┘    └────────────────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Exports

```typescript
// Factory function
export { createStorageProvider } from "@workspace/storage";

// Individual providers
export { createLocalProvider } from "@workspace/storage";
export { createS3Provider } from "@workspace/storage";

// Types
export type {
  StorageProvider,
  StorageConfig,
  FileMetadata,
  PresignedUploadUrl,
} from "@workspace/storage";
```

## Usage

### Factory Pattern (Recommended)

```typescript
import { createStorageProvider } from "@workspace/storage";

// Development: Local storage
const storage = createStorageProvider({
  type: "local",
  localPath: "./uploads",
});

// Production: S3
const storage = createStorageProvider({
  type: "s3",
  s3Region: "us-east-1",
  s3Bucket: "my-bucket",
  s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Cloudflare R2
const storage = createStorageProvider({
  type: "s3",
  s3Endpoint: "https://xxx.r2.cloudflarestorage.com",
  s3Region: "auto",
  s3Bucket: "my-bucket",
  s3AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
});
```

### Direct Upload (Server-Side)

```typescript
// Upload file from buffer
await storage.upload(
  "orgs/org_123/files/document.pdf",
  fileBuffer,
  "application/pdf"
);

// Download file
const data = await storage.download("orgs/org_123/files/document.pdf");
```

### Presigned URLs (Client-Side Uploads)

```typescript
// Generate upload URL (client uploads directly to S3)
const { url, method, headers, expiresAt } = await storage.getPresignedUploadUrl(
  "orgs/org_123/files/image.jpg",
  "image/jpeg",
  1800 // 30 minutes
);

// Client uploads using:
// fetch(url, { method, headers, body: file })

// Generate download URL
const downloadUrl = await storage.getPresignedDownloadUrl(
  "orgs/org_123/files/image.jpg",
  300 // 5 minutes
);
```

### File Operations

```typescript
// Check if file exists
const exists = await storage.exists("orgs/org_123/files/doc.pdf");

// Get metadata
const metadata = await storage.getMetadata("orgs/org_123/files/doc.pdf");
// { size: 1024, contentType: "application/pdf", lastModified: Date, etag: "..." }

// Delete file
await storage.delete("orgs/org_123/files/doc.pdf");
```

## StorageProvider Interface

```typescript
type StorageProvider = {
  readonly name: string;

  // Presigned URLs
  getPresignedUploadUrl(
    path: string,
    contentType: string,
    expiresIn?: number  // default: 1800 (30 min)
  ): Promise<PresignedUploadUrl>;

  getPresignedDownloadUrl(
    path: string,
    expiresIn?: number  // default: 300 (5 min)
  ): Promise<string>;

  // Direct operations
  upload(path: string, data: Buffer, contentType: string): Promise<void>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getMetadata(path: string): Promise<FileMetadata | null>;
};
```

## Path Conventions

Use consistent path patterns for multi-tenancy:

```
orgs/{orgId}/files/{fileId}.{ext}      # Organization files
orgs/{orgId}/avatars/{userId}.jpg      # User avatars
orgs/{orgId}/exports/{exportId}.csv    # Data exports
public/assets/{assetId}.{ext}          # Public assets
```

## Configuration

### Local Provider

```typescript
{
  type: "local",
  localPath: "./uploads"  // Relative to cwd
}
```

**Notes:**
- Great for development
- No presigned URL support (use direct download endpoint)
- Files stored on local filesystem

### S3 Provider

```typescript
{
  type: "s3",
  s3Endpoint: undefined,  // AWS S3 default, or custom endpoint
  s3Region: "us-east-1",
  s3Bucket: "my-bucket",
  s3AccessKeyId: "...",
  s3SecretAccessKey: "..."
}
```

**Supported services:**
- AWS S3
- Cloudflare R2
- DigitalOcean Spaces
- MinIO
- Any S3-compatible storage

## Environment Variables

```bash
# Local storage
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./uploads

# S3 storage
STORAGE_TYPE=s3
S3_REGION=us-east-1
S3_BUCKET=my-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Cloudflare R2
STORAGE_TYPE=s3
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=my-bucket
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

## API Integration Example

```typescript
// apps/api/src/routes/files.ts
import { storage } from "@/lib/storage";

app.post("/files/upload-url", async (request) => {
  const { filename, contentType } = request.body;
  const path = `orgs/${request.orgId}/files/${crypto.randomUUID()}-${filename}`;

  const uploadUrl = await storage.getPresignedUploadUrl(path, contentType);

  // Save file metadata to database
  await db.insert(files).values({
    id: crypto.randomUUID(),
    orgId: request.orgId,
    path,
    filename,
    contentType,
    uploadedBy: request.userId,
  });

  return uploadUrl;
});

app.get("/files/:id/download", async (request) => {
  const file = await db.query.files.findFirst({
    where: eq(files.id, request.params.id),
  });

  const downloadUrl = await storage.getPresignedDownloadUrl(file.path);
  return { url: downloadUrl };
});
```

## Dependencies

- `@aws-sdk/client-s3` - S3 operations
- `@aws-sdk/s3-request-presigner` - Presigned URLs

## Related Packages

- `@workspace/db` - File metadata table
