import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/example-post.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * ExamplePosts API endpoints
   *
   * Demonstrates full CRUD with:
   * - Multi-tenant scoping (orgId)
   * - Pagination, filtering, sorting, field selection
   * - Soft delete + hard delete + restore
   * - Batch operations
   */
  @route("/v1/orgs/{orgId}/example-posts")
  @tag("ExamplePosts")
  interface ExamplePosts {
    /**
     * List posts in an organization
     * Supports pagination, filtering, sorting, and field selection
     */
    @get
    @summary("List example posts")
    list(
      /** Organization ID */
      @path orgId: string,

      /** Page number (1-indexed) */
      @query page?: int32 = 1,

      /** Number of items per page (max: 100) */
      @query pageSize?: int32 = 50,

      /** Sort order (e.g., "-createdAt,title" for desc createdAt, then asc title) */
      @query orderBy?: string,

      /** Comma-separated list of fields to return (e.g., "id,title,status") */
      @query fields?: string,

      /** Comma-separated list of relations to include (e.g., "comments") */
      @query include?: string,

      /** Full-text search query */
      @query search?: string,

      /** Filter by post status (exact match) */
      @query status?: ExamplePostStatus,

      /** Filter by status NOT equal to value */
      @query statusNe?: string,

      /** Filter by status IN list (comma-separated values) */
      @query statusIn?: string,

      /** Filter by author ID */
      @query authorId?: string,

      /** Filter by title contains */
      @query titleContains?: string,

      /** Filter by content contains */
      @query contentContains?: string,

      /** Filter posts created after this timestamp */
      @query createdAfter?: utcDateTime,

      /** Filter posts created before this timestamp */
      @query createdBefore?: utcDateTime,

      /** Filter posts published after this timestamp */
      @query publishedAfter?: utcDateTime,

      /** Filter posts published before this timestamp */
      @query publishedBefore?: utcDateTime
    ): ExamplePostListResponse | ErrorResponse;

    /**
     * List posts using cursor-based pagination
     *
     * Best for large datasets (>100K records) or real-time data where
     * consistent ordering is critical. Use page-based pagination for
     * typical UI scenarios with page numbers.
     */
    @route("/cursor")
    @get
    @summary("List example posts (cursor-based)")
    listCursor(
      /** Organization ID */
      @path orgId: string,

      /** Cursor for fetching next page (post ID from previous response) */
      @query cursor?: string,

      /** Maximum items to return (max: 100, default: 50) */
      @query limit?: int32 = 50,

      /** Sort order (e.g., "-createdAt" for desc, "createdAt" for asc) */
      @query orderBy?: string,

      /** Filter by post status */
      @query status?: ExamplePostStatus,

      /** Filter by author ID */
      @query authorId?: string,

      /** Full-text search query */
      @query search?: string
    ): ExamplePostCursorListResponse | ErrorResponse;

    /**
     * Create a new post
     */
    @post
    @summary("Create example post")
    create(
      /** Organization ID */
      @path orgId: string,

      /** Post creation data */
      @body body: CreateExamplePostRequest
    ):
      | {
          @statusCode statusCode: 201;
          @header location: string;
          @body body: ExamplePostResponse;
        }
      | ErrorResponse;

    /**
     * Get a single post by ID
     */
    @route("/{id}")
    @get
    @summary("Get example post")
    get(
      /** Organization ID */
      @path orgId: string,

      /** Post ID */
      @path id: string,

      /** Comma-separated list of fields to return */
      @query fields?: string,

      /** Comma-separated list of relations to include */
      @query include?: string
    ): ExamplePostResponse | ErrorResponse;

    /**
     * Update a post (partial update)
     */
    @route("/{id}")
    @patch(#{ implicitOptionality: true })
    @summary("Update example post")
    update(
      /** Organization ID */
      @path orgId: string,

      /** Post ID */
      @path id: string,

      /** Post update data */
      @body body: UpdateExamplePostRequest
    ): ExamplePostResponse | ErrorResponse;

    /**
     * Soft delete a post (default delete behavior)
     * Post is marked as deleted but can be restored
     */
    @route("/{id}")
    @delete
    @summary("Soft delete example post")
    delete(
      /** Organization ID */
      @path orgId: string,

      /** Post ID */
      @path id: string
    ): SoftDeleteResponse | ErrorResponse;

    /**
     * Permanently delete a post (hard delete)
     * Post is permanently removed and cannot be restored
     */
    @route("/{id}/permanent")
    @delete
    @summary("Permanently delete example post")
    deletePermanent(
      /** Organization ID */
      @path orgId: string,

      /** Post ID */
      @path id: string
    ):
      | {
          @statusCode statusCode: 204;
        }
      | ErrorResponse;

    /**
     * Restore a soft-deleted post
     */
    @route("/{id}/restore")
    @post
    @summary("Restore example post")
    restore(
      /** Organization ID */
      @path orgId: string,

      /** Post ID */
      @path id: string
    ): ExamplePostResponse | ErrorResponse;

    /**
     * Batch create posts
     */
    @route("/batch")
    @post
    @summary("Batch create example posts")
    batchCreate(
      /** Organization ID */
      @path orgId: string,

      /** Batch create request */
      @body body: {
        items: CreateExamplePostRequest[];
        options?: BatchOptions;
      }
    ):
      | {
          @statusCode statusCode: 201;
          @body body: BatchResponse<ExamplePost>;
        }
      | ErrorResponse;

    /**
     * Batch update posts
     */
    @route("/batch")
    @patch(#{ implicitOptionality: true })
    @summary("Batch update example posts")
    batchUpdate(
      /** Organization ID */
      @path orgId: string,

      /** Batch update request */
      @body body: {
        items: {
          id: string;
          updates: UpdateExamplePostRequest;
        }[];
        options?: BatchOptions;
      }
    ): BatchResponse<ExamplePost> | ErrorResponse;

    /**
     * Batch soft delete posts
     */
    @route("/batch/soft-delete")
    @post
    @summary("Batch soft delete example posts")
    batchSoftDelete(
      /** Organization ID */
      @path orgId: string,

      /** Post IDs to soft delete */
      @body body: {
        ids: string[];
        options?: BatchOptions;
      }
    ): BatchDeleteResponse | ErrorResponse;

    /**
     * Batch restore soft-deleted posts
     */
    @route("/batch/restore")
    @post
    @summary("Batch restore example posts")
    batchRestore(
      /** Organization ID */
      @path orgId: string,

      /** Post IDs to restore */
      @body body: {
        ids: string[];
        options?: BatchOptions;
      }
    ): BatchResponse<ExamplePost> | ErrorResponse;

    /**
     * List soft-deleted posts
     */
    @route("/deleted")
    @get
    @summary("List deleted example posts")
    listDeleted(
      /** Organization ID */
      @path orgId: string,

      // === Pagination ===
      /** Page number (1-indexed) */
      @query page?: int32 = 1,

      /** Items per page (max 100) */
      @query pageSize?: int32 = 50
    ): ExamplePostListResponse | ErrorResponse;
  }
}
