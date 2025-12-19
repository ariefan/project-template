# File Handling

**Complete guide to secure file uploads and downloads for B2B SaaS.**

**Related**: [Validation](../04-error-handling/03-validation.md) · [Security](../03-security/04-security-best-practices.md) · [Multitenancy](../01-core-concepts/05-multitenancy.md)

---

## Overview

File handling is a **critical security concern** for B2B SaaS applications. According to OWASP Top 10, "Unrestricted File Upload" is a major vulnerability vector.

**This guide covers:**
- ✅ Two upload strategies (Direct + Presigned URL)
- ✅ Security validation (MIME type, size, virus scanning)
- ✅ Storage architecture (S3 recommended)
- ✅ Access control (signed URLs for private files)
- ✅ Multi-tenant isolation

---

## Architecture Decision: Which Upload Strategy?

### Strategy 1: Direct Upload (Simple)

**When to use:**
- Small files (< 10 MB)
- Low upload volume
- Need immediate processing (thumbnails, etc.)

**Flow:**
```
Client → API Server → S3/Storage
```

**Pros:**
- ✅ Simple to implement
- ✅ Full control over validation
- ✅ Can process immediately

**Cons:**
- ❌ API server handles binary data (memory/CPU)
- ❌ Slower for large files
- ❌ Harder to show progress

### Strategy 2: Presigned URL Upload (RECOMMENDED for B2B SaaS)

**When to use:**
- Large files (> 10 MB)
- High upload volume
- Resumable uploads needed

**Flow:**
```
Client → API (get presigned URL) → Client → S3 directly → API (confirm)
```

**Pros:**
- ✅ API server doesn't handle binary data
- ✅ Faster uploads (direct to S3)
- ✅ Built-in progress tracking
- ✅ Resumable uploads (multipart)

**Cons:**
- ❌ More complex flow
- ❌ Need S3 or compatible storage

**Recommendation:** Use **presigned URLs** for production B2B SaaS.

---

## Strategy 1: Direct Upload (Multipart)

### Upload Endpoint

```http
POST /v1/orgs/{orgId}/files
Content-Type: multipart/form-data
Authorization: Bearer {token}

--boundary
Content-Disposition: form-data; name="file"; filename="report.pdf"
Content-Type: application/pdf

{binary data}
--boundary
Content-Disposition: form-data; name="metadata"

{"description": "Q4 Financial Report"}
--boundary--
```

### Response

```json
{
  "data": {
    "id": "file_abc123",
    "filename": "report.pdf",
    "size": 2457600,
    "mimeType": "application/pdf",
    "storagePath": "orgs/org_abc123/files/file_abc123.pdf",
    "url": "https://cdn.example.com/files/file_abc123.pdf?signature=...",
    "metadata": {
      "description": "Q4 Financial Report"
    },
    "uploadedBy": "usr_xyz789",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "virusScanStatus": "pending",
    "access": "private"
  }
}
```

### Security Validation (CRITICAL)

**Server-side validation checklist:**

```typescript
// 1. File type validation (whitelist approach)
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// 2. Size validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// 3. Filename sanitization (prevent path traversal)
const sanitizedFilename = filename
  .replace(/[^a-zA-Z0-9._-]/g, '_')
  .substring(0, 255);

// 4. MIME type verification (don't trust client)
// Use magic bytes detection (file-type npm package)
import { fileTypeFromBuffer } from 'file-type';
const detectedType = await fileTypeFromBuffer(buffer);

// 5. Virus scanning (REQUIRED for production)
// Use ClamAV or cloud service (AWS GuardDuty, VirusTotal API)
```

---

## Strategy 2: Presigned URL Upload (RECOMMENDED)

### Step 1: Request Upload URL

```http
POST /v1/orgs/{orgId}/files/uploads
Content-Type: application/json
Authorization: Bearer {token}

{
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "size": 2457600,
  "metadata": {
    "description": "Q4 Financial Report"
  }
}
```

**Response:**

```json
{
  "data": {
    "uploadId": "upl_xyz789",
    "presignedUrl": "https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...",
    "method": "PUT",
    "headers": {
      "Content-Type": "application/pdf"
    },
    "expiresAt": "2024-01-15T11:00:00.000Z",
    "maxSize": 10485760
  }
}
```

**Security Note:** Presigned URL includes:
- Temporary credentials (expires in 30 minutes)
- Restricted to specific file path
- Locked to specific Content-Type
- Maximum size enforced by S3

### Step 2: Upload to Presigned URL (Client-side)

```javascript
// Client uploads directly to S3
const response = await fetch(presignedUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/pdf',
  },
  body: fileBlob,
});

if (response.ok) {
  // Upload successful, confirm with API
}
```

### Step 3: Confirm Upload

```http
POST /v1/orgs/{orgId}/files/uploads/{uploadId}/confirm
Content-Type: application/json
Authorization: Bearer {token}

{}
```

**Response:**

```json
{
  "data": {
    "id": "file_abc123",
    "filename": "report.pdf",
    "size": 2457600,
    "mimeType": "application/pdf",
    "storagePath": "orgs/org_abc123/files/file_abc123.pdf",
    "url": "https://cdn.example.com/files/file_abc123.pdf?signature=...",
    "uploadedBy": "usr_xyz789",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "virusScanStatus": "pending",
    "access": "private"
  }
}
```

**Why confirmation step?**
- Create database record
- Trigger virus scanning
- Generate thumbnails (for images)
- Audit logging

---

## File Download & Access Control

### Private Files (Most B2B SaaS Files)

**Use signed URLs with expiration:**

```http
GET /v1/orgs/{orgId}/files/{fileId}/download
Authorization: Bearer {token}
```

**Response (Redirect to signed URL):**

```http
HTTP/1.1 302 Found
Location: https://cdn.example.com/files/file_abc123.pdf?signature=...&expires=1234567890
```

**Signed URL properties:**
- Expires in 5 minutes
- Cannot be shared (binds to IP or user)
- Audit logged on access

### Public Files (Rare in B2B)

For truly public files (marketing materials):

```http
GET /v1/public/files/{fileId}
```

**Response:** Direct file or permanent CDN URL.

---

## Storage Architecture

### Recommended: S3-Compatible Storage

**Storage path pattern:**
```
{bucket}/orgs/{orgId}/files/{fileId}.{ext}
```

**Example:**
```
my-app-files/orgs/org_abc123/files/file_xyz789.pdf
```

**Benefits:**
- ✅ Tenant isolation (folder per org)
- ✅ Easy to backup per tenant
- ✅ Easy to delete tenant data (GDPR)
- ✅ S3 lifecycle policies (auto-archive old files)

### Storage Options

**Production (RECOMMENDED):**
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Cloudflare R2 (S3-compatible, cheaper)

**Development/Self-Hosted:**
- MinIO (S3-compatible, self-hosted)
- Local filesystem (NOT for production)

---

## Security Checklist

### File Upload Security (REQUIRED)

- [ ] **Whitelist file types** (never blacklist)
- [ ] **Verify MIME type** with magic bytes (don't trust client)
- [ ] **Enforce size limits** (per file and per tenant quota)
- [ ] **Sanitize filenames** (prevent path traversal)
- [ ] **Virus scanning** (ClamAV, AWS GuardDuty, VirusTotal)
- [ ] **Multi-tenant isolation** (separate S3 folders per org)
- [ ] **Rate limiting** (prevent DoS via uploads)
- [ ] **Audit logging** (who uploaded what, when)

### File Download Security (REQUIRED)

- [ ] **Authorization check** (can user access this file?)
- [ ] **Tenant scoping** (file belongs to user's org?)
- [ ] **Signed URLs** (time-limited access)
- [ ] **Audit logging** (who downloaded what, when)
- [ ] **Content-Disposition header** (prevent XSS via SVG/HTML)

---

## File Validation

### Allowed File Types

**Common B2B SaaS file types:**

```typescript
const FILE_TYPES = {
  // Images
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], maxSize: 5 * 1024 * 1024 },
  'image/png': { extensions: ['.png'], maxSize: 5 * 1024 * 1024 },

  // Documents
  'application/pdf': { extensions: ['.pdf'], maxSize: 20 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    maxSize: 20 * 1024 * 1024,
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensions: ['.xlsx'],
    maxSize: 20 * 1024 * 1024,
  },

  // Archives
  'application/zip': { extensions: ['.zip'], maxSize: 50 * 1024 * 1024 },
};
```

**NEVER allow:**
- Executables (.exe, .sh, .bat)
- Scripts (.js, .vbs, .ps1)
- Server-side code (.php, .jsp, .asp)

### MIME Type Verification

**Don't trust client-provided Content-Type:**

```typescript
import { fileTypeFromBuffer } from 'file-type';

// Read first 4KB of file (magic bytes)
const buffer = await file.toBuffer().slice(0, 4096);
const detectedType = await fileTypeFromBuffer(buffer);

if (!detectedType || !ALLOWED_TYPES.includes(detectedType.mime)) {
  throw new Error('Invalid file type');
}

// Also verify extension matches
if (!detectedType.ext.endsWith(sanitizedFilename.split('.').pop())) {
  throw new Error('File extension mismatch');
}
```

---

## Virus Scanning

### Option 1: ClamAV (Open Source)

**Server-side scanning:**

```typescript
import { NodeClam } from 'clamscan';

const clamscan = await new NodeClam().init({
  clamdscan: {
    host: 'localhost',
    port: 3310,
  },
});

const { isInfected, viruses } = await clamscan.scanFile(filePath);

if (isInfected) {
  // Delete file, log incident, notify admin
  await deleteFile(filePath);
  await auditLog.create({
    event: 'file.virus_detected',
    file_id: fileId,
    viruses: viruses,
  });
  throw new Error('Virus detected');
}
```

### Option 2: Cloud Services

**AWS GuardDuty, VirusTotal API, or MetaDefender:**

```typescript
// Upload to S3 with metadata
await s3.putObject({
  Bucket: bucket,
  Key: key,
  Body: fileBuffer,
  Metadata: {
    'virus-scan-status': 'pending',
  },
});

// Lambda triggered by S3 event, scans file
// Updates metadata to 'clean' or 'infected'

// Poll for scan result
const scanStatus = await getVirusScanStatus(fileId);
if (scanStatus === 'infected') {
  throw new Error('Virus detected');
}
```

**Recommendation:** Use cloud service for production (more up-to-date signatures).

---

## Thumbnail Generation (OPTIONAL)

For image uploads, generate thumbnails asynchronously:

```typescript
import sharp from 'sharp';

// Generate thumbnails
const sizes = [
  { name: 'thumbnail', width: 150, height: 150 },
  { name: 'preview', width: 800, height: 600 },
];

for (const size of sizes) {
  const buffer = await sharp(originalBuffer)
    .resize(size.width, size.height, { fit: 'inside' })
    .toBuffer();

  await s3.putObject({
    Bucket: bucket,
    Key: `${fileId}_${size.name}.jpg`,
    Body: buffer,
    ContentType: 'image/jpeg',
  });
}
```

---

## Error Responses

### File Too Large

```json
{
  "error": {
    "code": "fileTooLarge",
    "message": "File exceeds maximum size of 10 MB",
    "details": [
      {
        "field": "file",
        "code": "fileTooLarge",
        "message": "File size 15728640 bytes exceeds maximum 10485760 bytes",
        "metadata": {
          "fileSize": 15728640,
          "maxSize": 10485760,
          "maxSizeHuman": "10 MB"
        }
      }
    ]
  }
}
```

### Invalid File Type

```json
{
  "error": {
    "code": "invalidFileType",
    "message": "File type not allowed",
    "details": [
      {
        "field": "file",
        "code": "invalidFileType",
        "message": "File type 'application/x-executable' is not allowed",
        "metadata": {
          "detectedType": "application/x-executable",
          "allowedTypes": [
            "image/jpeg",
            "image/png",
            "application/pdf"
          ]
        }
      }
    ]
  }
}
```

### Virus Detected

```json
{
  "error": {
    "code": "virusDetected",
    "message": "File contains malware",
    "details": [
      {
        "field": "file",
        "code": "virusDetected",
        "message": "Virus detected: Eicar-Test-Signature"
      }
    ]
  }
}
```

---

## List Files

```http
GET /v1/orgs/{orgId}/files?page=1&pageSize=50&orderBy=-createdAt
Authorization: Bearer {token}
```

**Response:**

```json
{
  "data": [
    {
      "id": "file_abc123",
      "filename": "report.pdf",
      "size": 2457600,
      "mimeType": "application/pdf",
      "uploadedBy": "usr_xyz789",
      "uploadedAt": "2024-01-15T10:30:00.000Z",
      "virusScanStatus": "clean"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalCount": 247,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

## Delete File

```http
DELETE /v1/orgs/{orgId}/files/{fileId}
Authorization: Bearer {token}
```

**Response:**

```json
{
  "data": {
    "id": "file_abc123",
    "deletedAt": "2024-01-15T16:00:00Z",
    "deletedBy": "usr_admin123"
  }
}
```

**Note:** Consider soft delete for compliance (audit trail).

---

## Audit Logging

All file operations should be audit logged:

**Events to log:**
- `file.uploaded` - File uploaded
- `file.downloaded` - File downloaded (GDPR, HIPAA)
- `file.deleted` - File deleted
- `file.virus_detected` - Virus found
- `file.access_denied` - Authorization failure

**Example:**

```typescript
await auditService.logEvent({
  eventType: 'file.uploaded',
  tenantId: orgId,
  actorId: userId,
  actorEmail: userEmail,
  actorIpAddress: request.ip,
  resourceType: 'file',
  resourceId: fileId,
  endpoint: request.url,
  httpMethod: 'POST',
  resourceAfter: {
    id: fileId,
    filename: 'report.pdf',
    size: 2457600,
    mime_type: 'application/pdf',
  },
  requestId: request.headers['x-request-id'],
  userAgent: request.headers['user-agent'],
});
```

---

## Storage Quotas (OPTIONAL)

Enforce per-tenant storage limits:

```typescript
// Check quota before upload
const currentUsage = await db
  .selectFrom('files')
  .where('tenant_id', '=', orgId)
  .select(db.fn.sum('size').as('total_size'))
  .executeTakeFirst();

const QUOTA = 10 * 1024 * 1024 * 1024; // 10 GB

if (currentUsage.total_size + fileSize > QUOTA) {
  throw new Error('Storage quota exceeded');
}
```

---

## See Also

- [Validation](../04-error-handling/03-validation.md) - Input validation
- [Security Best Practices](../03-security/04-security-best-practices.md) - Security guidelines
- [Multitenancy](../01-core-concepts/05-multitenancy.md) - Tenant isolation
- [Audit Logging](../06-quality/01-audit-logging.md) - Audit requirements
