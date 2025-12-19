import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/user.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * Users API endpoints
   * All endpoints are scoped to an organization (multi-tenant)
   */
  @route("/v1/orgs/{orgId}/users")
  @tag("Users")
  interface Users {
    /**
     * List users in an organization
     * Supports pagination, filtering, sorting, and field selection
     */
    @get
    @summary("List users")
    list(
      /** Organization ID */
      @path orgId: string,

      /** Page number (1-indexed) */
      @query page?: int32 = 1,

      /** Number of items per page (max: 100) */
      @query pageSize?: int32 = 50,

      /** Sort order (e.g., "-createdAt,name" for desc createdAt, then asc name) */
      @query orderBy?: string,

      /** Comma-separated list of fields to return (e.g., "id,email,name") */
      @query fields?: string,

      /** Comma-separated list of relations to include (e.g., "addresses,sessions") */
      @query include?: string,

      /** Full-text search query */
      @query search?: string,

      /** Filter by user status (exact match) */
      @query status?: string,

      /** Filter by status NOT equal to value */
      @query statusNe?: string,

      /** Filter by status IN list (comma-separated values) */
      @query statusIn?: string,

      /** Filter by verified status */
      @query isVerified?: boolean,

      /** Filter by active status */
      @query isActive?: boolean,

      /** Filter by role (exact match) */
      @query role?: string,

      /** Filter by role IN list (comma-separated values) */
      @query roleIn?: string,

      /** Filter by email contains */
      @query emailContains?: string,

      /** Filter by email starts with */
      @query emailStartsWith?: string,

      /** Filter by email ends with */
      @query emailEndsWith?: string,

      /** Filter by name contains */
      @query nameContains?: string,

      /** Filter users created after this timestamp */
      @query createdAfter?: utcDateTime,

      /** Filter users created before this timestamp */
      @query createdBefore?: utcDateTime,

      /** Filter users updated after this timestamp */
      @query updatedAfter?: utcDateTime,

      /** Filter users updated before this timestamp */
      @query updatedBefore?: utcDateTime,

      /** Filter users last login after this timestamp */
      @query lastLoginAfter?: utcDateTime,

      /** Filter users last login before this timestamp */
      @query lastLoginBefore?: utcDateTime
    ): UserListResponse | ErrorResponse;

    /**
     * Create a new user
     */
    @post
    @summary("Create user")
    create(
      /** Organization ID */
      @path orgId: string,

      /** User creation data */
      @body body: CreateUserRequest
    ):
      | {
          @statusCode statusCode: 201;
          @header location: string;
          @body body: UserResponse;
        }
      | ErrorResponse;

    /**
     * Get a single user by ID
     */
    @route("/{id}")
    @get
    @summary("Get user")
    get(
      /** Organization ID */
      @path orgId: string,

      /** User ID */
      @path id: string,

      /** Comma-separated list of fields to return */
      @query fields?: string,

      /** Comma-separated list of relations to include */
      @query include?: string
    ): UserResponse | ErrorResponse;

    /**
     * Update a user (partial update)
     */
    @route("/{id}")
    @patch(#{ implicitOptionality: true })
    @summary("Update user")
    update(
      /** Organization ID */
      @path orgId: string,

      /** User ID */
      @path id: string,

      /** User update data */
      @body body: UpdateUserRequest
    ): UserResponse | ErrorResponse;

    /**
     * Soft delete a user (default delete behavior)
     * User is marked as deleted but can be restored
     */
    @route("/{id}")
    @delete
    @summary("Soft delete user")
    delete(
      /** Organization ID */
      @path orgId: string,

      /** User ID */
      @path id: string
    ): SoftDeleteResponse | ErrorResponse;

    /**
     * Permanently delete a user (hard delete)
     * User is permanently removed and cannot be restored
     */
    @route("/{id}/permanent")
    @delete
    @summary("Permanently delete user")
    deletePermanent(
      /** Organization ID */
      @path orgId: string,

      /** User ID */
      @path id: string
    ):
      | {
          @statusCode statusCode: 204;
        }
      | ErrorResponse;

    /**
     * Restore a soft-deleted user
     */
    @route("/{id}/restore")
    @post
    @summary("Restore user")
    restore(
      /** Organization ID */
      @path orgId: string,

      /** User ID */
      @path id: string
    ): UserResponse | ErrorResponse;

    /**
     * Batch create users
     */
    @route("/batch")
    @post
    @summary("Batch create users")
    batchCreate(
      /** Organization ID */
      @path orgId: string,

      /** Array of users to create */
      @body body: {
        users: CreateUserRequest[];
      }
    ):
      | {
          @statusCode statusCode: 201;
          @body body: {
            data: {
              created: User[];
              failed: {
                index: int32;
                error: Error;
              }[];
            };
            meta: ResponseMeta;
          };
        }
      | ErrorResponse;

    /**
     * Batch update users
     */
    @route("/batch")
    @patch(#{ implicitOptionality: true })
    @summary("Batch update users")
    batchUpdate(
      /** Organization ID */
      @path orgId: string,

      /** Array of user updates */
      @body body: {
        users: {
          id: string;
          updates: UpdateUserRequest;
        }[];
      }
    ):
      | {
          data: {
            updated: User[];
            failed: {
              id: string;
              error: Error;
            }[];
          };
          meta: ResponseMeta;
        }
      | ErrorResponse;

    /**
     * Batch soft delete users
     */
    @route("/batch/soft-delete")
    @post
    @summary("Batch soft delete users")
    batchSoftDelete(
      /** Organization ID */
      @path orgId: string,

      /** User IDs to soft delete */
      @body body: {
        ids: string[];
      }
    ):
      | {
          data: {
            deleted: {
              id: string;
              deletedAt: utcDateTime;
            }[];
            failed: {
              id: string;
              error: Error;
            }[];
          };
          meta: ResponseMeta;
        }
      | ErrorResponse;

    /**
     * Custom action: Reset user password
     */
    @route("/{id}/actions/reset-password")
    @post
    @summary("Reset user password")
    resetPassword(
      /** Organization ID */
      @path orgId: string,

      /** User ID */
      @path id: string,

      /** Password reset options */
      @body body: {
        /** Email to send password reset link to */
        email?: string;

        /** Whether to send email notification */
        sendEmail?: boolean;
      }
    ):
      | {
          data: {
            userId: string;
            resetTokenSent: boolean;
            expiresAt: utcDateTime;
          };
          meta: ResponseMeta;
        }
      | ErrorResponse;
  }
}
