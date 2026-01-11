import type {
  LegalDocumentStatus,
  LegalDocumentType,
  NewLegalDocumentRow,
  NewLegalDocumentVersionRow,
} from "@workspace/db/schema";
import { NotFoundError } from "../../../lib/errors";
import * as repository from "../repositories/legal-documents.repository";

// ============ TYPES ============

export interface CreateDocumentInput {
  type: LegalDocumentType;
  slug: string;
  locale?: string;
  title: string;
  content: string;
  requiresReAcceptance?: boolean;
  createdBy: string;
}

export interface UpdateDocumentInput {
  slug?: string;
  locale?: string;
}

export interface CreateVersionInput {
  documentId: string;
  title: string;
  content: string;
  changelog?: string;
  requiresReAcceptance?: boolean;
  createdBy: string;
}

export interface AcceptDocumentInput {
  userId: string;
  versionId: string;
  documentId: string;
  documentType: LegalDocumentType;
  ipAddress?: string;
  userAgent?: string;
}

// ============ ID GENERATORS ============

function generateDocumentId(): string {
  return `ldoc_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
}

function generateVersionId(): string {
  return `ldver_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
}

function generateAcceptanceId(): string {
  return `ldacc_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
}

function generateAuditLogId(): string {
  return `ldaudit_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
}

// ============ DOCUMENT OPERATIONS ============

/**
 * Create a new legal document with initial version
 */
export async function createDocument(input: CreateDocumentInput) {
  const documentId = generateDocumentId();
  const versionId = generateVersionId();

  // Create document
  const documentData: NewLegalDocumentRow = {
    id: documentId,
    type: input.type,
    slug: input.slug,
    locale: input.locale ?? "en",
    status: "draft",
    activeVersionId: null,
    createdBy: input.createdBy,
  };

  const document = await repository.createDocument(documentData);

  // Create initial version
  const versionData: NewLegalDocumentVersionRow = {
    id: versionId,
    documentId,
    version: 1,
    title: input.title,
    content: input.content,
    changelog: null,
    status: "draft",
    requiresReAcceptance: input.requiresReAcceptance ?? false,
    createdBy: input.createdBy,
  };

  const version = await repository.createVersion(versionData);

  // Log creation
  await repository.createAuditLog({
    id: generateAuditLogId(),
    documentId,
    versionId,
    action: "document.created",
    actorId: input.createdBy,
    actorName: null, // Could be fetched from user table
    changes: JSON.stringify({ type: input.type, slug: input.slug }),
  });

  return { document, version };
}

/**
 * Get document by ID
 */
export async function getDocument(documentId: string) {
  const document = await repository.getDocumentById(documentId);
  if (!document) {
    throw new NotFoundError("Legal document not found");
  }
  return document;
}

/**
 * Get document with active version details
 */
export async function getDocumentWithVersion(documentId: string) {
  const document = await repository.getDocumentWithActiveVersion(documentId);
  if (!document) {
    throw new NotFoundError("Legal document not found");
  }
  return document;
}

/**
 * List all documents
 */
export async function listDocuments(options: {
  page?: number;
  pageSize?: number;
  type?: LegalDocumentType;
  status?: LegalDocumentStatus;
  locale?: string;
}) {
  return await repository.listDocuments({
    page: options.page ?? 1,
    pageSize: Math.min(options.pageSize ?? 20, 100),
    type: options.type,
    status: options.status,
    locale: options.locale,
  });
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput,
  actorId: string
) {
  await getDocument(documentId);

  const updates: Partial<NewLegalDocumentRow> = {};
  if (input.slug !== undefined) {
    updates.slug = input.slug;
  }
  if (input.locale !== undefined) {
    updates.locale = input.locale;
  }

  const updated = await repository.updateDocument(documentId, updates);

  if (!updated) {
    throw new NotFoundError("Legal document not found");
  }

  await repository.createAuditLog({
    id: generateAuditLogId(),
    documentId,
    versionId: null,
    action: "document.updated",
    actorId,
    actorName: null,
    changes: JSON.stringify(updates),
  });

  return updated;
}

/**
 * Soft delete document
 */
export async function deleteDocument(documentId: string, actorId: string) {
  await getDocument(documentId);

  const deleted = await repository.deleteDocument(documentId);

  if (!deleted) {
    throw new NotFoundError("Legal document not found");
  }

  await repository.createAuditLog({
    id: generateAuditLogId(),
    documentId,
    versionId: null,
    action: "document.deleted",
    actorId,
    actorName: null,
    changes: null,
  });

  return deleted;
}

// ============ VERSION OPERATIONS ============

/**
 * Create a new version for a document
 */
export async function createVersion(input: CreateVersionInput) {
  await getDocument(input.documentId);

  const versionNumber = await repository.getNextVersionNumber(input.documentId);
  const versionId = generateVersionId();

  const versionData: NewLegalDocumentVersionRow = {
    id: versionId,
    documentId: input.documentId,
    version: versionNumber,
    title: input.title,
    content: input.content,
    changelog: input.changelog ?? null,
    status: "draft",
    requiresReAcceptance: input.requiresReAcceptance ?? false,
    createdBy: input.createdBy,
  };

  const version = await repository.createVersion(versionData);

  await repository.createAuditLog({
    id: generateAuditLogId(),
    documentId: input.documentId,
    versionId,
    action: "version.created",
    actorId: input.createdBy,
    actorName: null,
    changes: JSON.stringify({ version: versionNumber }),
  });

  return version;
}

/**
 * Get version by ID
 */
export async function getVersion(versionId: string) {
  const version = await repository.getVersionById(versionId);
  if (!version) {
    throw new NotFoundError("Version not found");
  }
  return version;
}

/**
 * List versions for a document
 */
export async function listVersions(documentId: string) {
  await getDocument(documentId);
  return await repository.listVersions(documentId);
}

/**
 * Publish a version
 */
export async function publishVersion(
  versionId: string,
  documentId: string,
  actorId: string
) {
  const version = await getVersion(versionId);

  if (version.documentId !== documentId) {
    throw new Error("Version does not belong to this document");
  }

  const result = await repository.publishVersion(versionId, documentId);

  await repository.createAuditLog({
    id: generateAuditLogId(),
    documentId,
    versionId,
    action: "version.published",
    actorId,
    actorName: null,
    changes: null,
  });

  return result;
}

/**
 * Unpublish a version
 */
export async function unpublishVersion(
  versionId: string,
  documentId: string,
  actorId: string
) {
  const version = await getVersion(versionId);

  if (version.documentId !== documentId) {
    throw new Error("Version does not belong to this document");
  }

  const result = await repository.unpublishVersion(versionId, documentId);

  await repository.createAuditLog({
    id: generateAuditLogId(),
    documentId,
    versionId,
    action: "version.unpublished",
    actorId,
    actorName: null,
    changes: null,
  });

  return result;
}

// ============ ACCEPTANCE OPERATIONS ============

/**
 * Record user acceptance of a document version
 */
export async function acceptDocument(input: AcceptDocumentInput) {
  // Check if already accepted
  const existing = await repository.getUserAcceptance(
    input.userId,
    input.versionId
  );
  if (existing) {
    return existing; // Already accepted
  }

  const acceptance = await repository.createAcceptance({
    id: generateAcceptanceId(),
    userId: input.userId,
    versionId: input.versionId,
    documentId: input.documentId,
    documentType: input.documentType,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });

  return acceptance;
}

/**
 * Get user's acceptances
 */
export async function getUserAcceptances(userId: string) {
  return await repository.getUserAcceptances(userId);
}

/**
 * Check for pending documents user needs to accept
 */
export async function getPendingAcceptances(userId: string) {
  return await repository.getPendingAcceptances(userId);
}

/**
 * List acceptances for a document (admin)
 */
export async function listDocumentAcceptances(
  documentId: string,
  options?: { page?: number; pageSize?: number }
) {
  await getDocument(documentId);
  return await repository.listAcceptances(documentId, options);
}

// ============ AUDIT OPERATIONS ============

/**
 * Get audit log for a document
 */
export async function getDocumentAuditLog(
  documentId: string,
  options?: { limit?: number }
) {
  await getDocument(documentId);
  return await repository.getAuditLogs(documentId, options);
}
