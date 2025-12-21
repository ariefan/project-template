import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/example-comment.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * ExampleComments API endpoints (nested under ExamplePosts)
   *
   * Demonstrates nested sub-resource pattern:
   * - Comments belong to a specific post
   * - Full CRUD with soft delete/restore
   * - Batch operations
   */
  @route("/v1/orgs/{orgId}/example-posts/{postId}/example-comments")
  @tag("ExampleComments")
  interface ExampleComments {
    /**
     * List comments for a post
     * Supports pagination, filtering, and sorting
     */
    @get
    @summary("List comments for a post")
    list(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Page number (1-indexed) */
      @query page?: int32 = 1,

      /** Number of items per page (max: 100) */
      @query pageSize?: int32 = 50,

      /** Sort order (e.g., "-createdAt" for newest first) */
      @query orderBy?: string,

      /** Comma-separated list of fields to return */
      @query fields?: string,

      /** Filter by author ID */
      @query authorId?: string,

      /** Filter by content contains */
      @query contentContains?: string,

      /** Filter comments created after this timestamp */
      @query createdAfter?: utcDateTime,

      /** Filter comments created before this timestamp */
      @query createdBefore?: utcDateTime
    ): ExampleCommentListResponse | ErrorResponse;

    /**
     * Create a new comment on a post
     */
    @post
    @summary("Create comment on post")
    create(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Comment creation data */
      @body body: CreateExampleCommentRequest
    ):
      | {
          @statusCode statusCode: 201;
          @header location: string;
          @body body: ExampleCommentResponse;
        }
      | ErrorResponse;

    /**
     * Get a single comment by ID
     */
    @route("/{id}")
    @get
    @summary("Get comment")
    get(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Comment ID */
      @path id: string,

      /** Comma-separated list of fields to return */
      @query fields?: string
    ): ExampleCommentResponse | ErrorResponse;

    /**
     * Update a comment (partial update)
     */
    @route("/{id}")
    @patch(#{ implicitOptionality: true })
    @summary("Update comment")
    update(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Comment ID */
      @path id: string,

      /** Comment update data */
      @body body: UpdateExampleCommentRequest
    ): ExampleCommentResponse | ErrorResponse;

    /**
     * Soft delete a comment
     */
    @route("/{id}")
    @delete
    @summary("Soft delete comment")
    delete(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Comment ID */
      @path id: string
    ): SoftDeleteResponse | ErrorResponse;

    /**
     * Permanently delete a comment (hard delete)
     */
    @route("/{id}/permanent")
    @delete
    @summary("Permanently delete comment")
    deletePermanent(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Comment ID */
      @path id: string
    ):
      | {
          @statusCode statusCode: 204;
        }
      | ErrorResponse;

    /**
     * Restore a soft-deleted comment
     */
    @route("/{id}/restore")
    @post
    @summary("Restore comment")
    restore(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Comment ID */
      @path id: string
    ): ExampleCommentResponse | ErrorResponse;

    /**
     * Batch create comments
     */
    @route("/batch")
    @post
    @summary("Batch create comments")
    batchCreate(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Batch create request */
      @body body: {
        items: CreateExampleCommentRequest[];
        options?: BatchOptions;
      }
    ):
      | {
          @statusCode statusCode: 201;
          @body body: BatchResponse<ExampleComment>;
        }
      | ErrorResponse;

    /**
     * Batch soft delete comments
     */
    @route("/batch/soft-delete")
    @post
    @summary("Batch soft delete comments")
    batchSoftDelete(
      /** Organization ID */
      @path orgId: string,

      /** Parent post ID */
      @path postId: string,

      /** Comment IDs to soft delete */
      @body body: {
        ids: string[];
        options?: BatchOptions;
      }
    ): BatchDeleteResponse | ErrorResponse;
  }
}
