import type * as casbin from "casbin";

/**
 * Type alias for Casbin enforcer
 */
export type Enforcer = casbin.Enforcer;

/**
 * Default resource types in the system
 *
 * This is the single source of truth for all permission resources.
 * Frontend and seed scripts should import from here.
 */
export const RESOURCES = {
	// Core resources
	POSTS: "posts",
	COMMENTS: "comments",
	USERS: "users",
	SETTINGS: "settings",
	INVITATIONS: "invitations",
	// Organization resources
	ROLES: "roles",
	ORGANIZATIONS: "organizations",
	// Content resources
	FILES: "files",
	REPORTS: "reports",
	ANNOUNCEMENTS: "announcements",
	SCHEDULES: "schedules",
	LEGAL_DOCUMENTS: "legal-documents",
	// System resources
	WEBHOOKS: "webhooks",
	NOTIFICATIONS: "notifications",
	AUDIT_LOGS: "audit-logs",
	JOBS: "jobs",
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

/**
 * Display labels for resources (for UI consumption)
 */
export const RESOURCE_LABELS: Record<Resource, string> = {
	posts: "Posts",
	comments: "Comments",
	users: "Users",
	settings: "Settings",
	invitations: "Invitations",
	roles: "Roles",
	organizations: "Organizations",
	files: "Files",
	reports: "Reports",
	announcements: "Announcements",
	schedules: "Schedules",
	"legal-documents": "Legal Documents",
	webhooks: "Webhooks",
	notifications: "Notifications",
	"audit-logs": "Audit Logs",
	jobs: "Jobs",
};

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
export interface AuthorizationResult {
	allowed: boolean;
	resource: string;
	action: string;
	subject: string;
	domain: string;
}
