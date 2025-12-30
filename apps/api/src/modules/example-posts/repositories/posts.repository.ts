import type { ExamplePost } from "@workspace/contracts";
import { db } from "@workspace/db";
import { examplePosts, type NewExamplePostRow } from "@workspace/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

/**
 * Field Selection (Sparse Fieldsets) Implementation
 *
 * Allows clients to request specific fields via the `fields` query parameter.
 * Example: GET /posts?fields=id,title,status
 *
 * Benefits:
 * - Reduces bandwidth usage (up to 80% documented)
 * - Improves response time for large datasets
 * - Prevents exposure of sensitive fields
 *
 * Implementation:
 * 1. Client sends comma-separated field list: ?fields=id,title,status
 * 2. parseFields() validates against whitelist below
 * 3. buildSelectClause() creates dynamic SELECT with only requested columns
 * 4. Database returns partial data (bandwidth saved at DB level)
 * 5. toPartialExamplePost() transforms to partial response object
 */
const ALLOWED_FIELDS = [
  "id",
  "orgId",
  "title",
  "content",
  "authorId",
  "status",
  "publishedAt",
  "isDeleted",
  "deletedAt",
  "deletedBy",
  "createdAt",
  "updatedAt",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

/**
 * Parse and validate comma-separated fields parameter.
 * Returns validated field list or null for all fields.
 */
function parseFields(fieldsParam?: string): AllowedField[] | null {
  if (!fieldsParam) {
    return null; // Return all fields
  }

  const requestedFields = fieldsParam.split(",").map((f) => f.trim());
  const validFields: AllowedField[] = [];

  for (const field of requestedFields) {
    if (ALLOWED_FIELDS.includes(field as AllowedField)) {
      validFields.push(field as AllowedField);
    } else {
      throw new Error(
        `Invalid field: ${field}. Allowed fields: ${ALLOWED_FIELDS.join(", ")}`
      );
    }
  }

  return validFields.length > 0 ? validFields : null;
}

/**
 * Build dynamic SELECT object for Drizzle based on requested fields.
 */
function buildSelectClause(fields: AllowedField[] | null) {
  if (!fields) {
    return; // Select all columns
  }

  const allColumns = getTableColumns(examplePosts);
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle's SelectedFields type is complex and dynamic
  const selectedColumns: any = {};

  for (const field of fields) {
    if (field in allColumns) {
      selectedColumns[field] = allColumns[field as keyof typeof allColumns];
    }
  }

  return selectedColumns;
}

/**
 * Transform full database row to ExamplePost (all fields present).
 */
function toExamplePost(row: typeof examplePosts.$inferSelect): ExamplePost {
  return {
    id: row.id,
    orgId: row.orgId,
    title: row.title,
    content: row.content,
    authorId: row.authorId,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString(),
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt?.toISOString(),
    deletedBy: row.deletedBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Transform partial database row to partial ExamplePost (field selection).
 */
function toPartialExamplePost(
  row: Partial<typeof examplePosts.$inferSelect>
): Partial<ExamplePost> {
  const result: Partial<ExamplePost> = {};

  if (row.id !== undefined) {
    result.id = row.id;
  }
  if (row.orgId !== undefined) {
    result.orgId = row.orgId;
  }
  if (row.title !== undefined) {
    result.title = row.title;
  }
  if (row.content !== undefined) {
    result.content = row.content;
  }
  if (row.authorId !== undefined) {
    result.authorId = row.authorId;
  }
  if (row.status !== undefined) {
    result.status = row.status;
  }
  if (row.publishedAt !== undefined) {
    result.publishedAt = row.publishedAt?.toISOString();
  }
  if (row.isDeleted !== undefined) {
    result.isDeleted = row.isDeleted;
  }
  if (row.deletedAt !== undefined) {
    result.deletedAt = row.deletedAt?.toISOString();
  }
  if (row.deletedBy !== undefined) {
    result.deletedBy = row.deletedBy ?? undefined;
  }
  if (row.createdAt !== undefined) {
    result.createdAt = row.createdAt.toISOString();
  }
  if (row.updatedAt !== undefined) {
    result.updatedAt = row.updatedAt.toISOString();
  }

  return result;
}

export interface ListExamplePostsOptions {
  page: number;
  pageSize: number;
  orderBy?: string;
  fields?: string; // Comma-separated field list for field selection
  includeDeleted?: boolean;
  status?: string;
  statusNe?: string;
  statusIn?: string[];
  authorId?: string;
  titleContains?: string;
  contentContains?: string;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  publishedAfter?: Date;
  publishedBefore?: Date;
}

export interface ListExamplePostsResult {
  posts: Partial<ExamplePost>[];
  totalCount: number;
}

/**
 * Build WHERE conditions for listExamplePosts query.
 * Extracted to reduce cognitive complexity.
 */
function buildWhereConditions(
  orgId: string,
  options: ListExamplePostsOptions
): SQL[] {
  const { includeDeleted = false } = options;
  const conditions: SQL[] = [eq(examplePosts.orgId, orgId)];

  if (!includeDeleted) {
    conditions.push(eq(examplePosts.isDeleted, false));
  }

  if (options.status) {
    conditions.push(
      eq(
        examplePosts.status,
        options.status as "draft" | "published" | "archived"
      )
    );
  }
  if (options.statusNe) {
    conditions.push(
      ne(
        examplePosts.status,
        options.statusNe as "draft" | "published" | "archived"
      )
    );
  }
  if (options.statusIn?.length) {
    conditions.push(
      inArray(
        examplePosts.status,
        options.statusIn as ("draft" | "published" | "archived")[]
      )
    );
  }
  if (options.authorId) {
    conditions.push(eq(examplePosts.authorId, options.authorId));
  }
  if (options.titleContains) {
    conditions.push(ilike(examplePosts.title, `%${options.titleContains}%`));
  }
  if (options.contentContains) {
    conditions.push(
      ilike(examplePosts.content, `%${options.contentContains}%`)
    );
  }
  if (options.search) {
    const searchCondition = or(
      ilike(examplePosts.title, `%${options.search}%`),
      ilike(examplePosts.content, `%${options.search}%`)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }
  if (options.createdAfter) {
    conditions.push(gte(examplePosts.createdAt, options.createdAfter));
  }
  if (options.createdBefore) {
    conditions.push(lte(examplePosts.createdAt, options.createdBefore));
  }
  if (options.publishedAfter) {
    conditions.push(gte(examplePosts.publishedAt, options.publishedAfter));
  }
  if (options.publishedBefore) {
    conditions.push(lte(examplePosts.publishedAt, options.publishedBefore));
  }

  return conditions;
}

export async function listExamplePosts(
  orgId: string,
  options: ListExamplePostsOptions
): Promise<ListExamplePostsResult> {
  const { page, pageSize, fields } = options;
  const offset = (page - 1) * pageSize;

  // Parse and validate field selection
  const validatedFields = parseFields(fields);
  const selectClause = buildSelectClause(validatedFields);

  const conditions = buildWhereConditions(orgId, options);

  const whereClause = and(...conditions);
  const orderByClause = parseOrderBy(options.orderBy);

  const [rows, countResult] = await Promise.all([
    selectClause
      ? db
          .select(selectClause)
          .from(examplePosts)
          .where(whereClause)
          .limit(pageSize)
          .offset(offset)
          .orderBy(...orderByClause)
      : db
          .select()
          .from(examplePosts)
          .where(whereClause)
          .limit(pageSize)
          .offset(offset)
          .orderBy(...orderByClause),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(examplePosts)
      .where(whereClause),
  ]);

  return {
    posts: rows.map(toPartialExamplePost),
    totalCount: countResult[0]?.count ?? 0,
  };
}

function getOrderByColumn(fieldName: string) {
  const columns = {
    id: examplePosts.id,
    title: examplePosts.title,
    status: examplePosts.status,
    authorId: examplePosts.authorId,
    publishedAt: examplePosts.publishedAt,
    updatedAt: examplePosts.updatedAt,
    createdAt: examplePosts.createdAt,
  } as const;

  return columns[fieldName as keyof typeof columns] ?? examplePosts.createdAt;
}

function parseOrderBy(orderBy?: string) {
  if (!orderBy) {
    return [desc(examplePosts.createdAt)];
  }

  return orderBy.split(",").map((field) => {
    const trimmed = field.trim();
    const isDescending = trimmed.startsWith("-");
    const fieldName = isDescending ? trimmed.slice(1) : trimmed;
    const column = getOrderByColumn(fieldName);
    return isDescending ? desc(column) : asc(column);
  });
}

export async function findExamplePostById(
  id: string
): Promise<ExamplePost | null> {
  const rows = await db
    .select()
    .from(examplePosts)
    .where(eq(examplePosts.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toExamplePost(row) : null;
}

export async function findExamplePostByIdAndOrg(
  id: string,
  orgId: string
): Promise<ExamplePost | null> {
  const rows = await db
    .select()
    .from(examplePosts)
    .where(and(eq(examplePosts.id, id), eq(examplePosts.orgId, orgId)))
    .limit(1);

  const row = rows[0];
  return row ? toExamplePost(row) : null;
}

export async function createExamplePost(
  data: NewExamplePostRow
): Promise<ExamplePost> {
  const rows = await db.insert(examplePosts).values(data).returning();

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create example post");
  }

  return toExamplePost(row);
}

export async function updateExamplePost(
  id: string,
  orgId: string,
  data: Partial<Pick<NewExamplePostRow, "title" | "content" | "status">>
): Promise<ExamplePost | null> {
  const rows = await db
    .update(examplePosts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(examplePosts.id, id), eq(examplePosts.orgId, orgId)))
    .returning();

  const row = rows[0];
  return row ? toExamplePost(row) : null;
}

export async function softDeleteExamplePost(
  id: string,
  orgId: string,
  deletedBy: string
): Promise<ExamplePost | null> {
  const now = new Date();
  const rows = await db
    .update(examplePosts)
    .set({
      isDeleted: true,
      deletedAt: now,
      deletedBy,
      updatedAt: now,
    })
    .where(
      and(
        eq(examplePosts.id, id),
        eq(examplePosts.orgId, orgId),
        eq(examplePosts.isDeleted, false)
      )
    )
    .returning();

  const row = rows[0];
  return row ? toExamplePost(row) : null;
}

export async function restoreExamplePost(
  id: string,
  orgId: string
): Promise<ExamplePost | null> {
  const rows = await db
    .update(examplePosts)
    .set({
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(examplePosts.id, id),
        eq(examplePosts.orgId, orgId),
        eq(examplePosts.isDeleted, true)
      )
    )
    .returning();

  const row = rows[0];
  return row ? toExamplePost(row) : null;
}

export async function permanentDeleteExamplePost(
  id: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .delete(examplePosts)
    .where(and(eq(examplePosts.id, id), eq(examplePosts.orgId, orgId)))
    .returning();
  return result.length > 0;
}

export async function createExamplePostsBatch(
  data: NewExamplePostRow[]
): Promise<ExamplePost[]> {
  if (data.length === 0) {
    return [];
  }
  const rows = await db.insert(examplePosts).values(data).returning();
  return rows.map(toExamplePost);
}

/**
 * List soft-deleted posts for an organization.
 * As documented in docs/api-guide/05-advanced-operations/04-soft-delete.md
 */
export async function listDeletedExamplePosts(
  orgId: string,
  options: { page: number; pageSize: number }
): Promise<ListExamplePostsResult> {
  const { page, pageSize } = options;
  const offset = (page - 1) * pageSize;

  const whereClause = and(
    eq(examplePosts.orgId, orgId),
    eq(examplePosts.isDeleted, true)
  );

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(examplePosts)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(desc(examplePosts.deletedAt)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(examplePosts)
      .where(whereClause),
  ]);

  return {
    posts: rows.map(toExamplePost) as ExamplePost[],
    totalCount: countResult[0]?.count ?? 0,
  };
}

/**
 * Batch restore soft-deleted posts.
 * As documented in docs/api-guide/05-advanced-operations/05-restore.md
 */
export async function batchRestoreExamplePosts(
  orgId: string,
  ids: string[]
): Promise<ExamplePost[]> {
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
    .update(examplePosts)
    .set({
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(examplePosts.orgId, orgId),
        inArray(examplePosts.id, ids),
        eq(examplePosts.isDeleted, true)
      )
    )
    .returning();

  return rows.map(toExamplePost);
}

/**
 * Cursor-Based Pagination Options
 *
 * As documented in docs/api-guide/02-data-operations/01-pagination.md
 * Best for large datasets (>100K records) or real-time data.
 */
export interface CursorListOptions {
  cursor?: string;
  limit: number;
  orderBy?: string;
  status?: string;
  authorId?: string;
  search?: string;
}

export interface CursorListResult {
  posts: ExamplePost[];
  hasNext: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

/**
 * List posts using cursor-based pagination.
 *
 * Implementation:
 * 1. Fetch limit + 1 records to determine hasNext
 * 2. Use ID-based cursor for consistent ordering
 * 3. Return nextCursor as the last item's ID
 *
 * SQL: WHERE id < cursor ORDER BY id DESC LIMIT limit + 1
 */
export async function listExamplePostsCursor(
  orgId: string,
  options: CursorListOptions
): Promise<CursorListResult> {
  const { cursor, limit, status, authorId, search, orderBy } = options;

  // Build WHERE conditions
  const conditions: SQL[] = [
    eq(examplePosts.orgId, orgId),
    eq(examplePosts.isDeleted, false),
  ];

  // Add cursor condition (for descending order, fetch items with ID < cursor)
  if (cursor) {
    conditions.push(sql`${examplePosts.id} < ${cursor}`);
  }

  if (status) {
    conditions.push(
      eq(examplePosts.status, status as "draft" | "published" | "archived")
    );
  }

  if (authorId) {
    conditions.push(eq(examplePosts.authorId, authorId));
  }

  if (search) {
    const searchCondition = or(
      ilike(examplePosts.title, `%${search}%`),
      ilike(examplePosts.content, `%${search}%`)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const whereClause = and(...conditions);
  const orderByClause = parseOrderBy(orderBy);

  // Fetch limit + 1 to check if there are more records
  const rows = await db
    .select()
    .from(examplePosts)
    .where(whereClause)
    .limit(limit + 1)
    .orderBy(...orderByClause);

  // Determine if there's a next page
  const hasNext = rows.length > limit;
  const data = hasNext ? rows.slice(0, limit) : rows;

  // Calculate cursors
  const nextCursor =
    hasNext && data.length > 0 ? (data.at(-1)?.id ?? null) : null;
  const previousCursor = cursor || null;

  return {
    posts: data.map(toExamplePost),
    hasNext,
    nextCursor,
    previousCursor,
  };
}
