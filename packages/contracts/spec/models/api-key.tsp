/**
 * ============================================================================
 * API KEY MODEL
 * ============================================================================
 *
 * API keys for service-to-service authentication and automation.
 *
 * Security considerations:
 * - Store keys securely (environment variables, secrets manager)
 * - Use minimum required permissions
 * - Set expiration dates
 * - Rotate keys periodically
 *
 * @see docs/api-guide/03-security/01-authentication.md
 * ============================================================================
 */

import "../common/responses.tsp";

// ============================================================================
// MAIN MODEL
// ============================================================================

/**
 * API Key resource model
 *
 * Used for service accounts and automation.
 * The actual key value is only returned once at creation.
 */
model ApiKey {
  /** Unique API key identifier (format: key_abc123) */
  @example("key_abc123")
  id: string;

  /** Tenant this API key belongs to */
  @example("org_abc123")
  tenantId: string;

  /** Human-readable name for the API key */
  @example("CI/CD Pipeline")
  name: string;

  /** Description of what this key is used for */
  @example("Automated deployment service")
  description?: string;

  /** Permissions granted to this key (format: resource:action) */
  @example(#["deployments:write", "logs:read"])
  permissions: string[];

  /** Masked key prefix for identification (e.g., "key_abc...xyz") */
  @example("key_abc...xyz")
  keyPrefix: string;

  /** When the key was last used (null if never used) */
  lastUsedAt?: utcDateTime;

  /** IP address from which the key was last used */
  lastUsedIp?: string;

  /** When the API key expires (null for no expiration) */
  expiresAt?: utcDateTime;

  /** Whether the key is currently active */
  isActive: boolean;

  /** User who created this API key */
  @example("usr_admin123")
  createdBy: string;

  /** When the API key was created */
  createdAt: utcDateTime;

  /** When the API key was last updated */
  updatedAt: utcDateTime;
}

/**
 * API Key with the actual secret (only returned on creation)
 */
model ApiKeyWithSecret {
  /** Unique API key identifier */
  @example("key_abc123")
  id: string;

  /** Tenant this API key belongs to */
  @example("org_abc123")
  tenantId: string;

  /** Human-readable name */
  @example("CI/CD Pipeline")
  name: string;

  /** Description */
  description?: string;

  /** Permissions granted */
  permissions: string[];

  /**
   * The actual API key secret - ONLY RETURNED ONCE
   * Store this securely, it cannot be retrieved again
   */
  @example("key_abc123xyz789_secret")
  key: string;

  /** When the key expires */
  expiresAt?: utcDateTime;

  /** When the API key was created */
  createdAt: utcDateTime;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

/**
 * Request to create a new API key
 */
model CreateApiKeyRequest {
  /** Human-readable name for the API key */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Description of what this key is used for */
  @maxLength(500)
  description?: string;

  /** Permissions to grant (format: resource:action) */
  @minItems(1)
  permissions: string[];

  /** When the key should expire (optional, null for no expiration) */
  expiresAt?: utcDateTime;
}

/**
 * Request to update an API key
 */
model UpdateApiKeyRequest {
  /** Human-readable name */
  @minLength(1)
  @maxLength(100)
  name?: string;

  /** Description */
  @maxLength(500)
  description?: string;

  /** Permissions (replaces existing) */
  permissions?: string[];

  /** Whether the key is active */
  isActive?: boolean;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

/**
 * API key response (without secret)
 */
model ApiKeyResponse {
  data: ApiKey;
  meta: ResponseMeta;
}

/**
 * API key creation response (includes secret once)
 */
model ApiKeyCreatedResponse {
  data: ApiKeyWithSecret;
  meta: ResponseMeta;
}

/**
 * API key list response
 */
model ApiKeyListResponse {
  data: ApiKey[];
  pagination: Pagination;
  meta: ResponseMeta;
}
