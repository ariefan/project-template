import { db } from "@workspace/db";
import {
  type LegalDocumentAcceptanceRow,
  type LegalDocumentAuditLogRow,
  type LegalDocumentRow,
  type LegalDocumentStatus,
  type LegalDocumentType,
  type LegalDocumentVersionRow,
  legalDocumentAcceptances,
  legalDocumentAuditLogs,
  legalDocuments,
  legalDocumentVersions,
  type NewLegalDocumentAcceptanceRow,
  type NewLegalDocumentAuditLogRow,
  type NewLegalDocumentRow,
  type NewLegalDocumentVersionRow,
} from "@workspace/db/schema";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, isNull } from "drizzle-orm";

// ============ TYPES ============

export interface ListDocumentsOptions {
  page?: number;
  pageSize?: number;
  type?: LegalDocumentType;
  status?: LegalDocumentStatus;
  locale?: string;
}

export interface ListDocumentsResult {
  data: (LegalDocumentRow & {
    activeVersion?: LegalDocumentVersionRow;
    versionCount?: number;
  })[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ============ DOCUMENTS CRUD ============

/**
 * Create a new legal document
 */
export async function createDocument(
  data: NewLegalDocumentRow
): Promise<LegalDocumentRow> {
  const [document] = await db.insert(legalDocuments).values(data).returning();

  if (!document) {
    throw new Error("Failed to create legal document");
  }

  return document;
}

/**
 * Get document by ID
 */
export async function getDocumentById(
  documentId: string
): Promise<LegalDocumentRow | null> {
  const [document] = await db
    .select()
    .from(legalDocuments)
    .where(
      and(eq(legalDocuments.id, documentId), isNull(legalDocuments.deletedAt))
    )
    .limit(1);

  return document ?? null;
}

/**
 * Get document with active version
 */
export async function getDocumentWithActiveVersion(documentId: string) {
  const document = await getDocumentById(documentId);
  if (!document) {
    return null;
  }

  let activeVersion: LegalDocumentVersionRow | undefined;
  if (document.activeVersionId) {
    const [version] = await db
      .select()
      .from(legalDocumentVersions)
      .where(eq(legalDocumentVersions.id, document.activeVersionId))
      .limit(1);
    activeVersion = version;
  }

  const versionCountResult = await db
    .select({ count: count() })
    .from(legalDocumentVersions)
    .where(eq(legalDocumentVersions.documentId, documentId));

  return {
    ...document,
    activeVersion,
    versionCount: versionCountResult[0]?.count ?? 0,
  };
}

/**
 * List documents with pagination
 */
export async function listDocuments(
  options: ListDocumentsOptions = {}
): Promise<ListDocumentsResult> {
  const { page = 1, pageSize = 20, type, status, locale } = options;

  const conditions: SQL[] = [isNull(legalDocuments.deletedAt)];

  if (type) {
    conditions.push(eq(legalDocuments.type, type));
  }
  if (status) {
    conditions.push(eq(legalDocuments.status, status));
  }
  if (locale) {
    conditions.push(eq(legalDocuments.locale, locale));
  }

  const whereClause = and(...conditions);

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(legalDocuments)
    .where(whereClause);
  const totalCount = totalResult[0]?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const documents = await db
    .select()
    .from(legalDocuments)
    .where(whereClause)
    .orderBy(desc(legalDocuments.updatedAt))
    .limit(pageSize)
    .offset(offset);

  // Fetch active versions and counts
  const results = await Promise.all(
    documents.map(async (doc) => {
      let activeVersion: LegalDocumentVersionRow | undefined;
      if (doc.activeVersionId) {
        const [version] = await db
          .select()
          .from(legalDocumentVersions)
          .where(eq(legalDocumentVersions.id, doc.activeVersionId))
          .limit(1);
        activeVersion = version;
      }

      const versionCountResult = await db
        .select({ count: count() })
        .from(legalDocumentVersions)
        .where(eq(legalDocumentVersions.documentId, doc.id));

      return {
        ...doc,
        activeVersion,
        versionCount: versionCountResult[0]?.count ?? 0,
      };
    })
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: results,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Update document
 */
export async function updateDocument(
  documentId: string,
  data: Partial<NewLegalDocumentRow>
): Promise<LegalDocumentRow | null> {
  const [updated] = await db
    .update(legalDocuments)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(legalDocuments.id, documentId), isNull(legalDocuments.deletedAt))
    )
    .returning();

  return updated ?? null;
}

/**
 * Soft delete document
 */
export async function deleteDocument(
  documentId: string
): Promise<LegalDocumentRow | null> {
  const [deleted] = await db
    .update(legalDocuments)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(legalDocuments.id, documentId))
    .returning();

  return deleted ?? null;
}

// ============ VERSIONS CRUD ============

/**
 * Create a new version
 */
export async function createVersion(
  data: NewLegalDocumentVersionRow
): Promise<LegalDocumentVersionRow> {
  const [version] = await db
    .insert(legalDocumentVersions)
    .values(data)
    .returning();

  if (!version) {
    throw new Error("Failed to create version");
  }

  return version;
}

/**
 * Get version by ID
 */
export async function getVersionById(
  versionId: string
): Promise<LegalDocumentVersionRow | null> {
  const [version] = await db
    .select()
    .from(legalDocumentVersions)
    .where(eq(legalDocumentVersions.id, versionId))
    .limit(1);

  return version ?? null;
}

/**
 * List versions for a document
 */
export async function listVersions(documentId: string) {
  return await db
    .select()
    .from(legalDocumentVersions)
    .where(eq(legalDocumentVersions.documentId, documentId))
    .orderBy(desc(legalDocumentVersions.version));
}

/**
 * Get next version number for document
 */
export async function getNextVersionNumber(
  documentId: string
): Promise<number> {
  const versions = await db
    .select({ version: legalDocumentVersions.version })
    .from(legalDocumentVersions)
    .where(eq(legalDocumentVersions.documentId, documentId))
    .orderBy(desc(legalDocumentVersions.version))
    .limit(1);

  return (versions[0]?.version ?? 0) + 1;
}

/**
 * Update version
 */
export async function updateVersion(
  versionId: string,
  data: Partial<NewLegalDocumentVersionRow>
): Promise<LegalDocumentVersionRow | null> {
  const [updated] = await db
    .update(legalDocumentVersions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(legalDocumentVersions.id, versionId))
    .returning();

  return updated ?? null;
}

/**
 * Publish version - sets as active and updates status
 */
export async function publishVersion(
  versionId: string,
  documentId: string
): Promise<{ version: LegalDocumentVersionRow; document: LegalDocumentRow }> {
  // Update version status
  const [version] = await db
    .update(legalDocumentVersions)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(legalDocumentVersions.id, versionId))
    .returning();

  if (!version) {
    throw new Error("Failed to publish version");
  }

  // Update document to point to this version
  const [document] = await db
    .update(legalDocuments)
    .set({
      activeVersionId: versionId,
      status: "published",
      updatedAt: new Date(),
    })
    .where(eq(legalDocuments.id, documentId))
    .returning();

  if (!document) {
    throw new Error("Failed to update document");
  }

  return { version, document };
}

/**
 * Unpublish version
 */
export async function unpublishVersion(
  versionId: string,
  documentId: string
): Promise<{ version: LegalDocumentVersionRow; document: LegalDocumentRow }> {
  const [version] = await db
    .update(legalDocumentVersions)
    .set({
      status: "archived",
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(legalDocumentVersions.id, versionId))
    .returning();

  if (!version) {
    throw new Error("Failed to unpublish version");
  }

  // If this was the active version, clear it
  const [document] = await db
    .update(legalDocuments)
    .set({
      activeVersionId: null,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(legalDocuments.id, documentId),
        eq(legalDocuments.activeVersionId, versionId)
      )
    )
    .returning();

  // Get final document state
  const finalDoc = await getDocumentById(documentId);
  const doc = document ?? finalDoc;

  if (!doc) {
    throw new Error("Failed to retrieve document state");
  }

  return { version, document: doc };
}

// ============ ACCEPTANCES ============

/**
 * Record user acceptance
 */
export async function createAcceptance(
  data: NewLegalDocumentAcceptanceRow
): Promise<LegalDocumentAcceptanceRow> {
  const [acceptance] = await db
    .insert(legalDocumentAcceptances)
    .values(data)
    .returning();

  if (!acceptance) {
    throw new Error("Failed to record acceptance");
  }

  return acceptance;
}

/**
 * Get user's acceptance for a version
 */
export async function getUserAcceptance(
  userId: string,
  versionId: string
): Promise<LegalDocumentAcceptanceRow | null> {
  const [acceptance] = await db
    .select()
    .from(legalDocumentAcceptances)
    .where(
      and(
        eq(legalDocumentAcceptances.userId, userId),
        eq(legalDocumentAcceptances.versionId, versionId)
      )
    )
    .limit(1);

  return acceptance ?? null;
}

/**
 * Get all acceptances for a user
 */
export async function getUserAcceptances(userId: string) {
  return await db
    .select()
    .from(legalDocumentAcceptances)
    .where(eq(legalDocumentAcceptances.userId, userId))
    .orderBy(desc(legalDocumentAcceptances.acceptedAt));
}

/**
 * Check if user has pending documents to accept
 */
export async function getPendingAcceptances(userId: string) {
  // Get all published documents with requiresReAcceptance
  const publishedDocs = await db
    .select({
      document: legalDocuments,
      version: legalDocumentVersions,
    })
    .from(legalDocuments)
    .innerJoin(
      legalDocumentVersions,
      eq(legalDocuments.activeVersionId, legalDocumentVersions.id)
    )
    .where(
      and(
        eq(legalDocuments.status, "published"),
        isNull(legalDocuments.deletedAt)
      )
    );

  // Check which ones user hasn't accepted
  const pending: {
    document: LegalDocumentRow;
    version: LegalDocumentVersionRow;
    requiresReAcceptance: boolean;
  }[] = [];
  for (const { document, version } of publishedDocs) {
    const acceptance = await getUserAcceptance(userId, version.id);
    if (!acceptance) {
      pending.push({
        document,
        version,
        requiresReAcceptance: version.requiresReAcceptance,
      });
    }
  }

  return pending;
}

/**
 * List acceptances for a document/version
 */
export async function listAcceptances(
  documentId: string,
  options: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 50 } = options;
  const offset = (page - 1) * pageSize;

  const acceptances = await db
    .select()
    .from(legalDocumentAcceptances)
    .where(eq(legalDocumentAcceptances.documentId, documentId))
    .orderBy(desc(legalDocumentAcceptances.acceptedAt))
    .limit(pageSize)
    .offset(offset);

  const totalResult = await db
    .select({ count: count() })
    .from(legalDocumentAcceptances)
    .where(eq(legalDocumentAcceptances.documentId, documentId));

  return {
    data: acceptances,
    totalCount: totalResult[0]?.count ?? 0,
  };
}

// ============ AUDIT LOGS ============

/**
 * Create audit log entry
 */
export async function createAuditLog(
  data: NewLegalDocumentAuditLogRow
): Promise<LegalDocumentAuditLogRow> {
  const [log] = await db
    .insert(legalDocumentAuditLogs)
    .values(data)
    .returning();

  if (!log) {
    throw new Error("Failed to create audit log");
  }

  return log;
}

/**
 * Get audit logs for a document
 */
export async function getAuditLogs(
  documentId: string,
  options: { limit?: number } = {}
) {
  const { limit = 50 } = options;

  return await db
    .select()
    .from(legalDocumentAuditLogs)
    .where(eq(legalDocumentAuditLogs.documentId, documentId))
    .orderBy(desc(legalDocumentAuditLogs.createdAt))
    .limit(limit);
}
