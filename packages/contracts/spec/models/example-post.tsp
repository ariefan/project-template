import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

/**
 * Post status enum
 */
enum ExamplePostStatus {
  draft: "draft",
  published: "published",
  archived: "archived",
}

/**
 * ExamplePost resource model
 *
 * Demonstrates a typical content resource with:
 * - Multi-tenant scoping (orgId)
 * - Status workflow (draft → published → archived)
 * - Soft delete with restore capability
 */
model ExamplePost {
  /** Unique post identifier (format: post_{randomString}) */
  @example("post_abc123")
  id: string;

  /** Organization ID (tenant scope) */
  @example("org_xyz789")
  orgId: string;

  /** Post title */
  @example("Introduction to TypeSpec")
  title: string;

  /** Post content (supports markdown) */
  @example("This is the full content of the post...")
  content: string;

  /** Author user ID */
  @example("usr_author123")
  authorId: string;

  /** Post category */
  @example("technology")
  category?: string;

  /** Post tags */
  @example(#["typescript", "api"])
  tags: string[];

  /** Whether the post is featured */
  isFeatured: boolean;

  /** Scheduled publish date */
  publishDate?: utcDateTime;

  /** Cover image file ID */
  coverImageId?: string;

  /** Attachment file ID */
  attachmentFileId?: string;

  /** Gallery images (file IDs) */
  galleryImageIds: string[];

  /** Attached documents (file IDs) */
  documentFileIds: string[];

  /** Post status */
  status: ExamplePostStatus;

  /** Timestamp when the post was published (null if not published) */
  publishedAt?: utcDateTime;

  /** Whether the post is soft deleted */
  isDeleted: boolean;

  /** Timestamp when the post was soft deleted (null if not deleted) */
  deletedAt?: utcDateTime;

  /** User ID who deleted this post (null if not deleted) */
  deletedBy?: string;

  /** Timestamp when the post was created */
  createdAt: utcDateTime;

  /** Timestamp when the post was last updated */
  updatedAt: utcDateTime;
}

/**
 * Request body for creating a new post
 */
model CreateExamplePostRequest {
  /** Post title */
  @example("Introduction to TypeSpec")
  title: string;

  /** Post content (supports markdown) */
  @example("This is the full content of the post...")
  content: string;

  /** Author user ID */
  @example("usr_author123")
  authorId: string;

  /** Post category */
  category?: string;

  /** Post tags */
  tags?: string[];

  /** Whether the post is featured */
  isFeatured?: boolean;

  /** Scheduled publish date */
  publishDate?: utcDateTime;

  /** Cover image file ID */
  coverImageId?: string;

  /** Attachment file ID */
  attachmentFileId?: string;

  /** Gallery images (file IDs) */
  galleryImageIds?: string[];

  /** Attached documents (file IDs) */
  documentFileIds?: string[];

  /** Post status (default: draft) */
  status?: ExamplePostStatus;
}

/**
 * Request body for updating a post
 */
model UpdateExamplePostRequest {
  /** Post title (optional) */
  title?: string;

  /** Post content (optional) */
  content?: string;

  /** Post category */
  category?: string;

  /** Post tags */
  tags?: string[];

  /** Whether the post is featured */
  isFeatured?: boolean;

  /** Scheduled publish date */
  publishDate?: utcDateTime;

  /** Cover image file ID */
  coverImageId?: string;

  /** Attachment file ID */
  attachmentFileId?: string;

  /** Gallery images (file IDs) */
  galleryImageIds?: string[];

  /** Attached documents (file IDs) */
  documentFileIds?: string[];

  /** Post status (optional) */
  status?: ExamplePostStatus;
}

/**
 * Single post response
 */
model ExamplePostResponse {
  data: ExamplePost;
  meta: ResponseMeta;
}

/**
 * Post collection response (page-based)
 */
model ExamplePostListResponse {
  data: ExamplePost[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Post collection response (cursor-based)
 *
 * Used for streaming/real-time scenarios or large datasets
 */
model ExamplePostCursorListResponse {
  data: ExamplePost[];
  pagination: CursorPagination;
  meta: ResponseMeta;
}
