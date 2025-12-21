import type {
  CreateExampleCommentRequest,
  ExampleComment,
  UpdateExampleCommentRequest,
} from "@workspace/contracts";
import { BadRequestError, NotFoundError } from "../../../lib/errors";
import { generateId } from "../../../lib/response";
import * as commentsRepo from "../repositories/comments.repository";
import * as postsRepo from "../repositories/posts.repository";

export type PaginatedExampleComments = {
  comments: ExampleComment[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type ListExampleCommentsOptions = {
  page: number;
  pageSize: number;
  orderBy?: string;
  authorId?: string;
  contentContains?: string;
  createdAfter?: string;
  createdBefore?: string;
};

export async function listExampleComments(
  orgId: string,
  postId: string,
  options: ListExampleCommentsOptions
): Promise<PaginatedExampleComments> {
  const { page, pageSize } = options;

  // Verify the post exists and belongs to the org
  const post = await postsRepo.findExamplePostByIdAndOrg(postId, orgId);
  if (!post) {
    throw new NotFoundError("ExamplePost", postId);
  }

  const result = await commentsRepo.listExampleComments(orgId, postId, {
    page,
    pageSize,
    orderBy: options.orderBy,
    authorId: options.authorId,
    contentContains: options.contentContains,
    createdAfter: options.createdAfter
      ? new Date(options.createdAfter)
      : undefined,
    createdBefore: options.createdBefore
      ? new Date(options.createdBefore)
      : undefined,
  });

  const totalPages = Math.ceil(result.totalCount / pageSize);

  return {
    comments: result.comments,
    page,
    pageSize,
    totalCount: result.totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

export async function getExampleCommentById(
  id: string,
  postId: string,
  orgId: string
): Promise<ExampleComment> {
  const comment = await commentsRepo.findExampleCommentById(id, postId, orgId);
  if (!comment) {
    throw new NotFoundError("ExampleComment", id);
  }
  return comment;
}

export async function createExampleComment(
  orgId: string,
  postId: string,
  data: CreateExampleCommentRequest
): Promise<ExampleComment> {
  // Verify the post exists and belongs to the org
  const post = await postsRepo.findExamplePostByIdAndOrg(postId, orgId);
  if (!post) {
    throw new NotFoundError("ExamplePost", postId);
  }

  const now = new Date();
  const comment = await commentsRepo.createExampleComment({
    id: generateId("cmt"),
    orgId,
    postId,
    content: data.content,
    authorId: data.authorId,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });

  return comment;
}

export async function updateExampleComment(
  id: string,
  postId: string,
  orgId: string,
  data: UpdateExampleCommentRequest
): Promise<ExampleComment> {
  const existing = await commentsRepo.findExampleCommentById(id, postId, orgId);
  if (!existing) {
    throw new NotFoundError("ExampleComment", id);
  }

  const updated = await commentsRepo.updateExampleComment(id, postId, orgId, {
    content: data.content,
  });

  if (!updated) {
    throw new NotFoundError("ExampleComment", id);
  }

  return updated;
}

export type SoftDeleteResult = {
  id: string;
  deletedAt: string;
  deletedBy: string;
  canRestore: boolean;
  restoreUntil: string;
};

export async function softDeleteExampleComment(
  id: string,
  postId: string,
  orgId: string,
  deletedBy: string
): Promise<SoftDeleteResult> {
  const existing = await commentsRepo.findExampleCommentById(id, postId, orgId);
  if (!existing) {
    throw new NotFoundError("ExampleComment", id);
  }

  const deleted = await commentsRepo.softDeleteExampleComment(
    id,
    postId,
    orgId,
    deletedBy
  );
  if (!deleted) {
    throw new NotFoundError("ExampleComment", id);
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

export async function restoreExampleComment(
  id: string,
  postId: string,
  orgId: string
): Promise<ExampleComment> {
  const existing = await commentsRepo.findExampleCommentById(id, postId, orgId);
  if (!existing) {
    throw new NotFoundError("ExampleComment", id);
  }

  if (!existing.isDeleted) {
    throw new BadRequestError("ExampleComment is not deleted");
  }

  const restored = await commentsRepo.restoreExampleComment(id, postId, orgId);
  if (!restored) {
    throw new NotFoundError("ExampleComment", id);
  }

  return restored;
}

export async function permanentDeleteExampleComment(
  id: string,
  postId: string,
  orgId: string
): Promise<void> {
  const deleted = await commentsRepo.permanentDeleteExampleComment(
    id,
    postId,
    orgId
  );
  if (!deleted) {
    throw new NotFoundError("ExampleComment", id);
  }
}

export type BatchCreateResult = {
  results: Array<{
    index: number;
    status: "success" | "error";
    data?: ExampleComment;
    error?: { code: string; message: string };
    input?: CreateExampleCommentRequest;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
};

export async function batchCreateExampleComments(
  orgId: string,
  postId: string,
  items: CreateExampleCommentRequest[],
  options?: { atomic?: boolean }
): Promise<BatchCreateResult> {
  // Verify the post exists and belongs to the org
  const post = await postsRepo.findExamplePostByIdAndOrg(postId, orgId);
  if (!post) {
    throw new NotFoundError("ExamplePost", postId);
  }

  const results: BatchCreateResult["results"] = [];
  const now = new Date();

  for (const [index, item] of items.entries()) {
    try {
      const comment = await commentsRepo.createExampleComment({
        id: generateId("cmt"),
        orgId,
        postId,
        content: item.content,
        authorId: item.authorId,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });
      results.push({ index, status: "success", data: comment });
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

export type BatchSoftDeleteResult = {
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
};

export type BatchSoftDeleteOptions = {
  orgId: string;
  postId: string;
  ids: string[];
  deletedBy: string;
  atomic?: boolean;
};

export async function batchSoftDeleteExampleComments(
  options: BatchSoftDeleteOptions
): Promise<BatchSoftDeleteResult> {
  const { orgId, postId, ids, deletedBy } = options;
  const results: BatchSoftDeleteResult["results"] = [];

  for (const [index, id] of ids.entries()) {
    try {
      const deleted = await commentsRepo.softDeleteExampleComment(
        id,
        postId,
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
          error: { code: "notFound", message: `Comment ${id} not found` },
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
