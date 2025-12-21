import type { ExamplePost } from "@workspace/contracts";
import { db } from "@workspace/db";
import { examplePosts, type NewExamplePostRow } from "@workspace/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

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

export type ListExamplePostsOptions = {
  page: number;
  pageSize: number;
  orderBy?: string;
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
};

export type ListExamplePostsResult = {
  posts: ExamplePost[];
  totalCount: number;
};

export async function listExamplePosts(
  orgId: string,
  options: ListExamplePostsOptions
): Promise<ListExamplePostsResult> {
  const { page, pageSize, includeDeleted = false } = options;
  const offset = (page - 1) * pageSize;

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

  const whereClause = and(...conditions);
  const orderByClause = parseOrderBy(options.orderBy);

  const [rows, countResult] = await Promise.all([
    db
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
    posts: rows.map(toExamplePost),
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
