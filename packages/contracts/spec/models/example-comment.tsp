import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

/**
 * ExampleComment resource model (nested under ExamplePost)
 *
 * Demonstrates:
 * - Nested sub-resource pattern (belongs to a post)
 * - Multi-tenant scoping (orgId)
 * - Soft delete with restore capability
 */
model ExampleComment {
  /** Unique comment identifier (format: cmt_{randomString}) */
  @example("cmt_abc123")
  id: string;

  /** Organization ID (tenant scope) */
  @example("org_xyz789")
  orgId: string;

  /** Parent post ID */
  @example("post_parent456")
  postId: string;

  /** Comment content */
  @example("Great post! Very informative.")
  content: string;

  /** Author user ID */
  @example("usr_commenter789")
  authorId: string;

  /** Whether the comment is soft deleted */
  isDeleted: boolean;

  /** Timestamp when the comment was soft deleted */
  deletedAt?: utcDateTime;

  /** User ID who deleted this comment */
  deletedBy?: string;

  /** Timestamp when the comment was created */
  createdAt: utcDateTime;

  /** Timestamp when the comment was last updated */
  updatedAt: utcDateTime;
}

/**
 * Request body for creating a new comment
 */
model CreateExampleCommentRequest {
  /** Comment content */
  @example("Great post! Very informative.")
  content: string;

  /** Author user ID */
  @example("usr_commenter789")
  authorId: string;
}

/**
 * Request body for updating a comment
 */
model UpdateExampleCommentRequest {
  /** Comment content (optional) */
  content?: string;
}

/**
 * Single comment response
 */
model ExampleCommentResponse {
  data: ExampleComment;
  meta: ResponseMeta;
}

/**
 * Comment collection response
 */
model ExampleCommentListResponse {
  data: ExampleComment[];
  pagination: Pagination;
  meta: ResponseMeta;
}
