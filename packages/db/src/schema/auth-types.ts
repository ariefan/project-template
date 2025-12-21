/**
 * Type exports for better-auth schema tables.
 * This file is separate from auth.ts so it survives CLI regeneration.
 */
import type {
  accounts,
  apikeys,
  invitations,
  members,
  organizations,
  sessions,
  ssoProviders,
  twoFactors,
  users,
  verifications,
} from "./auth";

// ============================================================================
// User Types
// ============================================================================
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// ============================================================================
// Session Types
// ============================================================================
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

// ============================================================================
// Account Types
// ============================================================================
export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;

// ============================================================================
// Verification Types
// ============================================================================
export type VerificationRow = typeof verifications.$inferSelect;
export type NewVerificationRow = typeof verifications.$inferInsert;

// ============================================================================
// Two-Factor Types
// ============================================================================
export type TwoFactorRow = typeof twoFactors.$inferSelect;
export type NewTwoFactorRow = typeof twoFactors.$inferInsert;

// ============================================================================
// API Key Types
// ============================================================================
export type ApiKeyRow = typeof apikeys.$inferSelect;
export type NewApiKeyRow = typeof apikeys.$inferInsert;

// ============================================================================
// Organization Types
// ============================================================================
export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;

// ============================================================================
// Member Types
// ============================================================================
export type MemberRow = typeof members.$inferSelect;
export type NewMemberRow = typeof members.$inferInsert;

// ============================================================================
// Invitation Types
// ============================================================================
export type InvitationRow = typeof invitations.$inferSelect;
export type NewInvitationRow = typeof invitations.$inferInsert;

// ============================================================================
// SSO Provider Types
// ============================================================================
export type SsoProviderRow = typeof ssoProviders.$inferSelect;
export type NewSsoProviderRow = typeof ssoProviders.$inferInsert;
