import type { ExampleComment } from "@workspace/contracts";
import { db } from "@workspace/db";
import {
  exampleComments,
  type NewExampleCommentRow,
} from "@workspace/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  type SQL,
  sql,
} from "drizzle-orm";

function toExampleComment(
  row: typeof exampleComments.$inferSelect
): ExampleComment {
  return {
    id: row.id,
    orgId: row.orgId,
    postId: row.postId,
    content: row.content,
    authorId: row.authorId,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt?.toISOString(),
    deletedBy: row.deletedBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface ListExampleCommentsOptions {
  page: number;
  pageSize: number;
  orderBy?: string;
  includeDeleted?: boolean;
  authorId?: string;
  contentContains?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ListExampleCommentsResult {
  comments: ExampleComment[];
  totalCount: number;
}

export async function listExampleComments(
  orgId: string,
  postId: string,
  options: ListExampleCommentsOptions
): Promise<ListExampleCommentsResult> {
  const { page, pageSize, includeDeleted = false } = options;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [
    eq(exampleComments.orgId, orgId),
    eq(exampleComments.postId, postId),
  ];

  if (!includeDeleted) {
    conditions.push(eq(exampleComments.isDeleted, false));
  }

  if (options.authorId) {
    conditions.push(eq(exampleComments.authorId, options.authorId));
  }
  if (options.contentContains) {
    conditions.push(
      ilike(exampleComments.content, `%${options.contentContains}%`)
    );
  }
  if (options.createdAfter) {
    conditions.push(gte(exampleComments.createdAt, options.createdAfter));
  }
  if (options.createdBefore) {
    conditions.push(lte(exampleComments.createdAt, options.createdBefore));
  }

  const whereClause = and(...conditions);
  const orderByClause = parseOrderBy(options.orderBy);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(exampleComments)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(...orderByClause),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(exampleComments)
      .where(whereClause),
  ]);

  return {
    comments: rows.map(toExampleComment),
    totalCount: countResult[0]?.count ?? 0,
  };
}

function getOrderByColumn(fieldName: string) {
  const columns = {
    id: exampleComments.id,
    authorId: exampleComments.authorId,
    createdAt: exampleComments.createdAt,
    updatedAt: exampleComments.updatedAt,
  } as const;

  return (
    columns[fieldName as keyof typeof columns] ?? exampleComments.createdAt
  );
}

function parseOrderBy(orderBy?: string) {
  if (!orderBy) {
    return [desc(exampleComments.createdAt)];
  }

  return orderBy.split(",").map((field) => {
    const trimmed = field.trim();
    const isDescending = trimmed.startsWith("-");
    const fieldName = isDescending ? trimmed.slice(1) : trimmed;
    const column = getOrderByColumn(fieldName);
    return isDescending ? desc(column) : asc(column);
  });
}

export async function findExampleCommentById(
  id: string,
  postId: string,
  orgId: string
): Promise<ExampleComment | null> {
  const rows = await db
    .select()
    .from(exampleComments)
    .where(
      and(
        eq(exampleComments.id, id),
        eq(exampleComments.postId, postId),
        eq(exampleComments.orgId, orgId)
      )
    )
    .limit(1);

  const row = rows[0];
  return row ? toExampleComment(row) : null;
}

export async function createExampleComment(
  data: NewExampleCommentRow
): Promise<ExampleComment> {
  const rows = await db.insert(exampleComments).values(data).returning();

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create example comment");
  }

  return toExampleComment(row);
}

export async function updateExampleComment(
  id: string,
  postId: string,
  orgId: string,
  data: Partial<Pick<NewExampleCommentRow, "content">>
): Promise<ExampleComment | null> {
  const rows = await db
    .update(exampleComments)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(exampleComments.id, id),
        eq(exampleComments.postId, postId),
        eq(exampleComments.orgId, orgId)
      )
    )
    .returning();

  const row = rows[0];
  return row ? toExampleComment(row) : null;
}

export async function softDeleteExampleComment(
  id: string,
  postId: string,
  orgId: string,
  deletedBy: string
): Promise<ExampleComment | null> {
  const now = new Date();
  const rows = await db
    .update(exampleComments)
    .set({
      isDeleted: true,
      deletedAt: now,
      deletedBy,
      updatedAt: now,
    })
    .where(
      and(
        eq(exampleComments.id, id),
        eq(exampleComments.postId, postId),
        eq(exampleComments.orgId, orgId),
        eq(exampleComments.isDeleted, false)
      )
    )
    .returning();

  const row = rows[0];
  return row ? toExampleComment(row) : null;
}

export async function restoreExampleComment(
  id: string,
  postId: string,
  orgId: string
): Promise<ExampleComment | null> {
  const rows = await db
    .update(exampleComments)
    .set({
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(exampleComments.id, id),
        eq(exampleComments.postId, postId),
        eq(exampleComments.orgId, orgId),
        eq(exampleComments.isDeleted, true)
      )
    )
    .returning();

  const row = rows[0];
  return row ? toExampleComment(row) : null;
}

export async function permanentDeleteExampleComment(
  id: string,
  postId: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .delete(exampleComments)
    .where(
      and(
        eq(exampleComments.id, id),
        eq(exampleComments.postId, postId),
        eq(exampleComments.orgId, orgId)
      )
    )
    .returning();
  return result.length > 0;
}

export async function createExampleCommentsBatch(
  data: NewExampleCommentRow[]
): Promise<ExampleComment[]> {
  if (data.length === 0) {
    return [];
  }
  const rows = await db.insert(exampleComments).values(data).returning();
  return rows.map(toExampleComment);
}
