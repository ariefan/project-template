import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  isAnonymous: boolean("is_anonymous").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)]
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)]
);

export const twoFactors = pgTable(
  "two_factors",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("twoFactors_secret_idx").on(table.secret),
    index("twoFactors_userId_idx").on(table.userId),
  ]
);

export const apikeys = pgTable(
  "apikeys",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    start: text("start"),
    prefix: text("prefix"),
    key: text("key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refillInterval: integer("refill_interval"),
    refillAmount: integer("refill_amount"),
    lastRefillAt: timestamp("last_refill_at"),
    enabled: boolean("enabled").default(true),
    rateLimitEnabled: boolean("rate_limit_enabled").default(true),
    rateLimitTimeWindow: integer("rate_limit_time_window").default(86_400_000),
    rateLimitMax: integer("rate_limit_max").default(10),
    requestCount: integer("request_count").default(0),
    remaining: integer("remaining"),
    lastRequest: timestamp("last_request"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    permissions: text("permissions"),
    metadata: text("metadata"),
  },
  (table) => [
    index("apikeys_key_idx").on(table.key),
    index("apikeys_userId_idx").on(table.userId),
  ]
);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)]
);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("members_organizationId_idx").on(table.organizationId),
    index("members_userId_idx").on(table.userId),
  ]
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitations_organizationId_idx").on(table.organizationId),
    index("invitations_email_idx").on(table.email),
  ]
);

export const ssoProviders = pgTable("sso_providers", {
  id: text("id").primaryKey(),
  issuer: text("issuer").notNull(),
  oidcConfig: text("oidc_config"),
  samlConfig: text("saml_config"),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull().unique(),
  organizationId: text("organization_id"),
  domain: text("domain").notNull(),
  domainVerified: boolean("domain_verified"),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  twoFactors: many(twoFactors),
  apikeys: many(apikeys),
  members: many(members),
  invitations: many(invitations),
  ssoProviders: many(ssoProviders),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const twoFactorsRelations = relations(twoFactors, ({ one }) => ({
  users: one(users, {
    fields: [twoFactors.userId],
    references: [users.id],
  }),
}));

export const apikeysRelations = relations(apikeys, ({ one }) => ({
  users: one(users, {
    fields: [apikeys.userId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(members),
  invitations: many(invitations),
}));

export const membersRelations = relations(members, ({ one }) => ({
  organizations: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  users: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organizations: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  users: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));

export const ssoProvidersRelations = relations(ssoProviders, ({ one }) => ({
  users: one(users, {
    fields: [ssoProviders.userId],
    references: [users.id],
  }),
}));
