/**
 * ============================================================================
 * API KEYS ROUTES - Service Account Authentication
 * ============================================================================
 *
 * Manage API keys for service-to-service communication.
 *
 * @see docs/api-guide/03-security/01-authentication.md
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/api-key.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * API Keys endpoints
 *
 * Create and manage API keys for service accounts.
 * Requires admin permissions.
 */
@route("/v1/orgs/{orgId}/api-keys")
@tag("API Keys")
interface ApiKeys {
  /**
   * List all API keys in an organization
   *
   * Does not return the actual key secrets.
   */
  @get
  @summary("List API keys")
  list(
    /** Organization ID */
    @path orgId: string,

    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page */
    @query pageSize?: int32 = 50,

    /** Filter by active status */
    @query isActive?: boolean
  ): ApiKeyListResponse | ErrorResponse;

  /**
   * Create a new API key
   *
   * The key secret is only returned once in the response.
   * Store it securely - it cannot be retrieved again.
   */
  @post
  @summary("Create API key")
  create(
    /** Organization ID */
    @path orgId: string,

    /** API key data */
    @body body: CreateApiKeyRequest
  ):
    | {
        @statusCode statusCode: 201;
        @body body: ApiKeyCreatedResponse;
      }
    | ErrorResponse;

  /**
   * Get an API key by ID
   *
   * Does not return the actual key secret.
   */
  @route("/{keyId}")
  @get
  @summary("Get API key")
  get(
    /** Organization ID */
    @path orgId: string,

    /** API key ID */
    @path keyId: string
  ): ApiKeyResponse | ErrorResponse;

  /**
   * Update an API key
   *
   * Can update name, description, permissions, and active status.
   * Cannot change the key secret - create a new key instead.
   */
  @route("/{keyId}")
  @patch(#{ implicitOptionality: true })
  @summary("Update API key")
  update(
    /** Organization ID */
    @path orgId: string,

    /** API key ID */
    @path keyId: string,

    /** Update data */
    @body body: UpdateApiKeyRequest
  ): ApiKeyResponse | ErrorResponse;

  /**
   * Revoke (delete) an API key
   *
   * The key will immediately stop working.
   * This action cannot be undone.
   */
  @route("/{keyId}")
  @delete
  @summary("Revoke API key")
  revoke(
    /** Organization ID */
    @path orgId: string,

    /** API key ID */
    @path keyId: string
  ):
    | {
        @statusCode statusCode: 204;
      }
    | ErrorResponse;

  /**
   * Rotate an API key
   *
   * Creates a new key secret while keeping the same key ID.
   * The old secret immediately stops working.
   */
  @route("/{keyId}/rotate")
  @post
  @summary("Rotate API key")
  rotate(
    /** Organization ID */
    @path orgId: string,

    /** API key ID */
    @path keyId: string
  ): ApiKeyCreatedResponse | ErrorResponse;
}
