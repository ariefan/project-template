import type {
  CreateExamplePostRequest,
  ExamplePost,
  UpdateExamplePostRequest,
} from "@workspace/contracts";
import { BadRequestError, NotFoundError } from "../../../lib/errors";
import { generateId } from "../../../lib/response";
import * as postsRepo from "../repositories/posts.repository";

export interface PaginatedExamplePosts {
  posts: Partial<ExamplePost>[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ListExamplePostsOptions {
  page: number;
  pageSize: number;
  orderBy?: string;
  fields?: string;
  search?: string;
  status?: string;
  statusNe?: string;
  statusIn?: string;
  authorId?: string;
  titleContains?: string;
  contentContains?: string;
  createdAfter?: string;
  createdBefore?: string;
  publishedAfter?: string;
  publishedBefore?: string;
}

export async function listExamplePosts(
  orgId: string,
  options: ListExamplePostsOptions
): Promise<PaginatedExamplePosts> {
  const { page, pageSize } = options;

  const result = await postsRepo.listExamplePosts(orgId, {
    page,
    pageSize,
    orderBy: options.orderBy,
    fields: options.fields,
    search: options.search,
    status: options.status,
    statusNe: options.statusNe,
    statusIn: options.statusIn?.split(","),
    authorId: options.authorId,
    titleContains: options.titleContains,
    contentContains: options.contentContains,
    createdAfter: options.createdAfter
      ? new Date(options.createdAfter)
      : undefined,
    createdBefore: options.createdBefore
      ? new Date(options.createdBefore)
      : undefined,
    publishedAfter: options.publishedAfter
      ? new Date(options.publishedAfter)
      : undefined,
    publishedBefore: options.publishedBefore
      ? new Date(options.publishedBefore)
      : undefined,
  });

  const totalPages = Math.ceil(result.totalCount / pageSize);

  return {
    posts: result.posts,
    page,
    pageSize,
    totalCount: result.totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

export async function getExamplePostById(
  id: string,
  orgId: string
): Promise<ExamplePost> {
  const post = await postsRepo.findExamplePostByIdAndOrg(id, orgId);
  if (!post) {
    throw new NotFoundError("ExamplePost", id);
  }
  return post;
}

export async function createExamplePost(
  orgId: string,
  data: CreateExamplePostRequest
): Promise<ExamplePost> {
  const now = new Date();
  const status = data.status ?? "draft";

  const post = await postsRepo.createExamplePost(
    {
      id: generateId("post"),
      orgId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      category: data.category,
      tags: data.tags ?? [],
      isFeatured: data.isFeatured ?? false,
      publishDate: data.publishDate ? new Date(data.publishDate) : null,
      coverImageId: data.coverImageId,
      attachmentFileId: data.attachmentFileId,
      status,
      publishedAt: status === "published" ? now : null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      galleryImageIds: data.galleryImageIds,
      documentFileIds: data.documentFileIds,
    }
  );

  return post;
}

export async function updateExamplePost(
  id: string,
  orgId: string,
  data: UpdateExamplePostRequest
): Promise<ExamplePost> {
  const existing = await postsRepo.findExamplePostByIdAndOrg(id, orgId);
  if (!existing) {
    throw new NotFoundError("ExamplePost", id);
  }

  const updated = await postsRepo.updateExamplePost(
    id,
    orgId,
    {
      title: data.title,
      content: data.content,
      status: data.status,
      category: data.category,
      tags: data.tags,
      isFeatured: data.isFeatured,
      publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
      coverImageId: data.coverImageId,
      attachmentFileId: data.attachmentFileId,
    },
    {
      galleryImageIds: data.galleryImageIds,
      documentFileIds: data.documentFileIds,
    }
  );

  if (!updated) {
    throw new NotFoundError("ExamplePost", id);
  }

  return updated;
}

export interface SoftDeleteResult {
  id: string;
  deletedAt: string;
  deletedBy: string;
  canRestore: boolean;
  restoreUntil: string;
}

export async function softDeleteExamplePost(
  id: string,
  orgId: string,
  deletedBy: string
): Promise<SoftDeleteResult> {
  const existing = await postsRepo.findExamplePostByIdAndOrg(id, orgId);
  if (!existing) {
    throw new NotFoundError("ExamplePost", id);
  }

  const deleted = await postsRepo.softDeleteExamplePost(id, orgId, deletedBy);
  if (!deleted) {
    throw new NotFoundError("ExamplePost", id);
  }

  const deletedAt = deleted.deletedAt ?? new Date().toISOString();

  return {
    id: deleted.id,
    deletedAt,
    deletedBy,
    canRestore: true,
    restoreUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function restoreExamplePost(
  id: string,
  orgId: string
): Promise<ExamplePost> {
  const existing = await postsRepo.findExamplePostByIdAndOrg(id, orgId);
  if (!existing) {
    throw new NotFoundError("ExamplePost", id);
  }

  if (!existing.isDeleted) {
    throw new BadRequestError("ExamplePost is not deleted");
  }

  const restored = await postsRepo.restoreExamplePost(id, orgId);
  if (!restored) {
    throw new NotFoundError("ExamplePost", id);
  }

  return restored;
}

export async function permanentDeleteExamplePost(
  id: string,
  orgId: string
): Promise<void> {
  const deleted = await postsRepo.permanentDeleteExamplePost(id, orgId);
  if (!deleted) {
    throw new NotFoundError("ExamplePost", id);
  }
}

export interface BatchCreateResult {
  results: Array<{
    index: number;
    status: "success" | "error";
    data?: ExamplePost;
    error?: { code: string; message: string };
    input?: CreateExamplePostRequest;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

export async function batchCreateExamplePosts(
  orgId: string,
  items: CreateExamplePostRequest[],
  options?: { atomic?: boolean }
): Promise<BatchCreateResult> {
  const results: BatchCreateResult["results"] = [];
  const now = new Date();

  for (const [index, item] of items.entries()) {
    try {
      const status = item.status ?? "draft";
      const post = await postsRepo.createExamplePost({
        id: generateId("post"),
        orgId,
        title: item.title,
        content: item.content,
        authorId: item.authorId,
        status,
        publishedAt: status === "published" ? now : null,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      results.push({ index, status: "success", data: post });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.push({
        index,
        status: "error",
        error: { code: "createFailed", message: errorMessage },
        input: item,
      });

      if (options?.atomic) {
        throw error;
      }
    }
  }

  return {
    results,
    summary: {
      total: items.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      skipped: 0,
    },
  };
}

export interface BatchUpdateResult {
  results: Array<{
    index: number;
    status: "success" | "error";
    data?: ExamplePost;
    error?: { code: string; message: string };
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

export async function batchUpdateExamplePosts(
  orgId: string,
  items: Array<{ id: string; updates: UpdateExamplePostRequest }>,
  options?: { atomic?: boolean }
): Promise<BatchUpdateResult> {
  const results: BatchUpdateResult["results"] = [];

  for (const [index, item] of items.entries()) {
    try {
      const updated = await postsRepo.updateExamplePost(item.id, orgId, {
        title: item.updates.title,
        content: item.updates.content,
        status: item.updates.status,
      });

      if (updated) {
        results.push({ index, status: "success", data: updated });
      } else {
        results.push({
          index,
          status: "error",
          error: { code: "notFound", message: `Post ${item.id} not found` },
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.push({
        index,
        status: "error",
        error: { code: "updateFailed", message: errorMessage },
      });

      if (options?.atomic) {
        throw error;
      }
    }
  }

  return {
    results,
    summary: {
      total: items.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      skipped: 0,
    },
  };
}

export interface BatchSoftDeleteResult {
  results: Array<{
    index: number;
    status: "success" | "error";
    data?: { id: string; deletedAt: string };
    error?: { code: string; message: string };
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

export async function batchSoftDeleteExamplePosts(
  orgId: string,
  ids: string[],
  deletedBy: string,
  options?: { atomic?: boolean }
): Promise<BatchSoftDeleteResult> {
  const results: BatchSoftDeleteResult["results"] = [];

  for (const [index, id] of ids.entries()) {
    try {
      const deleted = await postsRepo.softDeleteExamplePost(
        id,
        orgId,
        deletedBy
      );

      if (deleted) {
        results.push({
          index,
          status: "success",
          data: {
            id: deleted.id,
            deletedAt: deleted.deletedAt ?? new Date().toISOString(),
          },
        });
      } else {
        results.push({
          index,
          status: "error",
          error: { code: "notFound", message: `Post ${id} not found` },
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.push({
        index,
        status: "error",
        error: { code: "deleteFailed", message: errorMessage },
      });

      if (options?.atomic) {
        throw error;
      }
    }
  }

  return {
    results,
    summary: {
      total: ids.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      skipped: 0,
    },
  };
}

/**
 * List soft-deleted posts.
 * As documented in docs/api-guide/05-advanced-operations/04-soft-delete.md
 */
export async function listDeletedExamplePosts(
  orgId: string,
  options: { page: number; pageSize: number }
): Promise<PaginatedExamplePosts> {
  const { page, pageSize } = options;

  const result = await postsRepo.listDeletedExamplePosts(orgId, {
    page,
    pageSize,
  });

  const totalPages = Math.ceil(result.totalCount / pageSize);

  return {
    posts: result.posts,
    page,
    pageSize,
    totalCount: result.totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Cursor-based pagination result.
 * As documented in docs/api-guide/02-data-operations/01-pagination.md
 */
export interface CursorPaginatedExamplePosts {
  posts: ExamplePost[];
  limit: number;
  hasNext: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

export interface CursorListExamplePostsOptions {
  cursor?: string;
  limit: number;
  orderBy?: string;
  status?: string;
  authorId?: string;
  search?: string;
}

/**
 * List posts using cursor-based pagination.
 *
 * Best for large datasets (>100K records) or real-time data where
 * consistent ordering is critical.
 */
export async function listExamplePostsCursor(
  orgId: string,
  options: CursorListExamplePostsOptions
): Promise<CursorPaginatedExamplePosts> {
  // Cap limit at 100 as documented
  const limit = Math.min(options.limit || 50, 100);

  const result = await postsRepo.listExamplePostsCursor(orgId, {
    cursor: options.cursor,
    limit,
    orderBy: options.orderBy,
    status: options.status,
    authorId: options.authorId,
    search: options.search,
  });

  return {
    posts: result.posts,
    limit,
    hasNext: result.hasNext,
    nextCursor: result.nextCursor,
    previousCursor: result.previousCursor,
  };
}

/**
 * Batch restore soft-deleted posts.
 * As documented in docs/api-guide/05-advanced-operations/05-restore.md
 */
export async function batchRestoreExamplePosts(
  orgId: string,
  ids: string[],
  options?: { atomic?: boolean }
): Promise<BatchCreateResult> {
  const results: BatchCreateResult["results"] = [];

  for (const [index, id] of ids.entries()) {
    try {
      const existing = await postsRepo.findExamplePostByIdAndOrg(id, orgId);

      if (!existing) {
        results.push({
          index,
          status: "error",
          error: { code: "notFound", message: `Post ${id} not found` },
        });
        continue;
      }

      if (!existing.isDeleted) {
        results.push({
          index,
          status: "error",
          error: { code: "notDeleted", message: `Post ${id} is not deleted` },
        });
        continue;
      }

      const restored = await postsRepo.restoreExamplePost(id, orgId);
      if (restored) {
        results.push({ index, status: "success", data: restored });
      } else {
        results.push({
          index,
          status: "error",
          error: { code: "restoreFailed", message: `Failed to restore ${id}` },
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.push({
        index,
        status: "error",
        error: { code: "restoreFailed", message: errorMessage },
      });

      if (options?.atomic) {
        throw error;
      }
    }
  }

  return {
    results,
    summary: {
      total: ids.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      skipped: 0,
    },
  };
}
