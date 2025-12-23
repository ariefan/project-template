import type * as casbin from "casbin";

/**
 * Type alias for Casbin enforcer
 */
export type Enforcer = casbin.Enforcer;

/**
 * Default resource types in the system
 */
export const RESOURCES = {
  POSTS: "posts",
  COMMENTS: "comments",
  USERS: "users",
  SETTINGS: "settings",
  INVITATIONS: "invitations",
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

/**
 * Default action types
 */
export const ACTIONS = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  MANAGE: "manage",
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

/**
 * Default role types
 */
export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Result of an authorization check
 */
export type AuthorizationResult = {
  allowed: boolean;
  resource: string;
  action: string;
  subject: string;
  domain: string;
};
