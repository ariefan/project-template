import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

/**
 * User resource model
 */
model User {
  /** Unique user identifier (format: usr_{randomString}) */
  @example("usr_abc123")
  id: string;

  /** User's email address */
  @example("john.doe@example.com")
  email: string;

  /** User's full name */
  @example("John Doe")
  name: string;

  /** Whether the user account is active */
  isActive: boolean;

  /** Whether the user's email is verified */
  isVerified: boolean;

  /** Whether the user is soft deleted */
  isDeleted: boolean;

  /** Timestamp when the user was soft deleted (null if not deleted) */
  deletedAt?: utcDateTime;

  /** User ID who deleted this user (null if not deleted) */
  deletedBy?: string;

  /** Timestamp when the user was created */
  createdAt: utcDateTime;

  /** Timestamp when the user was last updated */
  updatedAt: utcDateTime;

  /** Timestamp of the user's last login (optional) */
  lastLoginAt?: utcDateTime;
}

/**
 * Request body for creating a new user
 */
model CreateUserRequest {
  /** User's email address */
  @example("john.doe@example.com")
  email: string;

  /** User's full name */
  @example("John Doe")
  name: string;

  /** User's password (min 8 characters) */
  @minLength(8)
  password: string;

  /** Whether the user should be active upon creation (default: true) */
  isActive?: boolean;
}

/**
 * Request body for updating a user
 */
model UpdateUserRequest {
  /** User's full name (optional) */
  name?: string;

  /** Whether the user account is active (optional) */
  isActive?: boolean;
}

/**
 * Single user response
 */
model UserResponse {
  data: User;
  meta: ResponseMeta;
}

/**
 * User collection response
 */
model UserListResponse {
  data: User[];
  pagination: Pagination;
  meta: ResponseMeta;
}
