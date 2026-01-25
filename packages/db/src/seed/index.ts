/**
 * Database seed script
 *
 * Creates demo data for local development and testing.
 * Run with: pnpm db:seed
 *
 * Default credentials (login with email or username):
 * - admin@example.com (or "admin") / password123 - Organization owner
 * - user@example.com (or "member") / password123 - Organization member
 * - viewer@example.com (or "viewer") / password123 - Organization viewer
 */

import { hash } from "bcrypt";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";
import { DEFAULT_APPLICATION_ID } from "../schema/applications";
import { SystemRoles, TenantRoles } from "../schema/roles";
import { getLocale, getRandomContent, type LocaleData } from "./locales";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Database = NodePgDatabase<typeof schema>;

interface SeedContext {
  db: Database;
  now: Date;
  passwordHash: string;
  locale: LocaleData;
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/postgres";
const BCRYPT_ROUNDS = 10;
const DEFAULT_PASSWORD = "password123";
const SEED_LOCALE = process.env.SEED_LOCALE ?? "en";
const TRAILING_PERIOD_REGEX = /\.$/;
const ADMIN_PORTAL_APP_ID = "app_admin_portal";

// ─────────────────────────────────────────────────────────────
// Demo Data
// ─────────────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    id: "user_owner",
    name: "Owner User",
    email: "owner@example.com",
    username: "owner",
    role: SystemRoles.USER,
  },
  {
    id: "user_admin",
    name: "Admin User",
    email: "admin@example.com",
    username: "admin",
    role: SystemRoles.USER,
  },
  {
    id: "user_member",
    name: "Member User",
    email: "user@example.com",
    username: "member",
    role: SystemRoles.USER,
  },
  {
    id: "user_viewer",
    name: "Viewer User",
    email: "viewer@example.com",
    username: "viewer",
    role: SystemRoles.USER,
  },
  {
    id: "user_onboarding",
    name: "Onboarding User",
    email: "onboarding@example.com",
    username: "onboarding",
    role: SystemRoles.USER,
  },
  {
    id: "user_super_admin",
    name: "Super Admin",
    email: "super_admin@example.com",
    username: "super_admin",
    role: SystemRoles.SUPER_ADMIN,
  },
  {
    id: "user_support",
    name: "Support Agent",
    email: "support@example.com",
    username: "support",
    role: SystemRoles.SUPPORT,
  },
  {
    id: "user_editor",
    name: "Editor User",
    email: "editor@example.com",
    username: "editor",
    role: SystemRoles.USER,
  },
  {
    id: "user_moderator",
    name: "Moderator User",
    email: "moderator@example.com",
    username: "moderator",
    role: SystemRoles.USER,
  },
  {
    id: "user_contributor",
    name: "Contributor User",
    email: "contributor@example.com",
    username: "contributor",
    role: SystemRoles.USER,
  },
] as const;

const DEMO_ORGS = [
  { id: "org_acme", name: "Acme Corporation", slug: "acme" },
  { id: "org_demo", name: "Demo Company", slug: "demo" },
  { id: "org_startup", name: "StartUp Inc", slug: "startup" },
] as const;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${result}`;
}

// ─────────────────────────────────────────────────────────────
// Seed: Application & Users
// ─────────────────────────────────────────────────────────────

async function seedApplicationAndUsers(ctx: SeedContext, onlyApps = false) {
  const { db, now, passwordHash } = ctx;

  console.log("📦 Creating default application...");
  await db
    .insert(schema.applications)
    .values({
      id: DEFAULT_APPLICATION_ID,
      name: "Default Application",
      slug: "default",
      description: "Default application for single-app setups",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  console.log("📦 Creating admin portal application...");
  await db
    .insert(schema.applications)
    .values({
      id: ADMIN_PORTAL_APP_ID,
      name: "Admin Portal",
      slug: "admin-portal",
      description: "Internal tooling for support staff",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  if (!onlyApps) {
    console.log("👤 Creating demo users...");
    for (const user of DEMO_USERS) {
      await db
        .insert(schema.users)
        .values({
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          emailVerified: true,
          role: user.role,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      await db
        .insert(schema.accounts)
        .values({
          id: generateId("acc"),
          accountId: user.email, // Better Auth expects email as accountId for credential provider
          providerId: "credential",
          userId: user.id,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      console.log(`   ✓ ${user.email}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Seed: Organizations & Members
// ─────────────────────────────────────────────────────────────

async function seedOrganizations(ctx: SeedContext) {
  const { db, now } = ctx;

  console.log("\n🏢 Creating demo organizations...");
  for (const org of DEMO_ORGS) {
    await db
      .insert(schema.organizations)
      .values({ id: org.id, name: org.name, slug: org.slug, createdAt: now })
      .onConflictDoNothing();
    console.log(`   ✓ ${org.name} (${org.slug})`);
  }

  console.log("\n👥 Adding members to organizations...");
  await db
    .insert(schema.members)
    .values([
      // Acme org
      {
        id: generateId("mem"),
        organizationId: "org_acme",
        userId: "user_owner",
        role: "owner",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_acme",
        userId: "user_admin",
        role: "admin",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_acme",
        userId: "user_member",
        role: "member",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_acme",
        userId: "user_viewer",
        role: "viewer",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_acme",
        userId: "user_editor",
        role: "member",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_acme",
        userId: "user_moderator",
        role: "member",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_acme",
        userId: "user_contributor",
        role: "member",
        createdAt: now,
      },
      // Demo org
      {
        id: generateId("mem"),
        organizationId: "org_demo",
        userId: "user_owner",
        role: "owner",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_demo",
        userId: "user_member",
        role: "owner",
        createdAt: now,
      },
      // StartUp org
      {
        id: generateId("mem"),
        organizationId: "org_startup",
        userId: "user_owner",
        role: "owner",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_startup",
        userId: "user_admin",
        role: "owner",
        createdAt: now,
      },
      {
        id: generateId("mem"),
        organizationId: "org_startup",
        userId: "user_member",
        role: "member",
        createdAt: now,
      },
    ])
    .onConflictDoNothing();

  console.log(
    "   ✓ Acme: owner, admin, user, viewer, editor, moderator, contributor"
  );
  console.log("   ✓ Demo: owner, user");
  console.log("   ✓ StartUp: owner, admin, user");
}

// ─────────────────────────────────────────────────────────────
// Seed: Roles
// ─────────────────────────────────────────────────────────────

async function seedRoles(ctx: SeedContext, onlyGlobal = false) {
  const { db, now } = ctx;

  console.log("\n🔐 Creating system roles...");

  const globalRoles = [
    {
      name: SystemRoles.SUPER_ADMIN,
      description: "Super admin with full platform access",
    },
    {
      name: SystemRoles.SUPPORT,
      description: "Support agent with read-only platform access",
    },
    { name: SystemRoles.USER, description: "Regular authenticated user" },
  ];

  const tenantRoles = [
    {
      name: TenantRoles.OWNER,
      description: "Organization owner with full control",
    },
    { name: TenantRoles.ADMIN, description: "Organization administrator" },
    { name: TenantRoles.MEMBER, description: "Regular organization member" },
    {
      name: TenantRoles.VIEWER,
      description: "Read-only access to organization",
    },
    // Custom Content Roles (Tenant Level - Dynamic Examples)
    { name: "editor", description: "Can publish and manage content" },
    { name: "moderator", description: "Can manage comments and community" },
    { name: "contributor", description: "Can draft content" },
  ];

  for (const role of globalRoles) {
    await db
      .insert(schema.roles)
      .values({
        id: generateId("role"),
        applicationId: DEFAULT_APPLICATION_ID,
        tenantId: null,
        name: role.name,
        description: role.description,
        isSystemRole: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  if (!onlyGlobal) {
    for (const org of DEMO_ORGS) {
      for (const role of tenantRoles) {
        await db
          .insert(schema.roles)
          .values({
            id: generateId("role"),
            applicationId: DEFAULT_APPLICATION_ID,
            tenantId: org.id,
            name: role.name,
            description: role.description,
            isSystemRole: true,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
    }
  }

  console.log("   ✓ Global roles: super_user, app_admin, user");
  if (!onlyGlobal) {
    console.log("   ✓ Tenant roles: owner, admin, member, viewer (per org)");
  }
}

// ─────────────────────────────────────────────────────────────
// Seed: User Role Assignments
// ─────────────────────────────────────────────────────────────

async function seedUserRoleAssignments(ctx: SeedContext) {
  const { db, now } = ctx;

  console.log("\n👤 Creating user role assignments...");

  // Helper to find role ID by name and tenant
  async function findRoleId(
    roleName: string,
    tenantId: string | null,
    appId: string = DEFAULT_APPLICATION_ID
  ): Promise<string | null> {
    const result = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(
        and(
          eq(schema.roles.name, roleName),
          eq(schema.roles.applicationId, appId),
          tenantId
            ? eq(schema.roles.tenantId, tenantId)
            : sql`${schema.roles.tenantId} IS NULL`
        )
      )
      .limit(1);
    return result[0]?.id ?? null;
  }

  // Define user-role assignments per org
  const assignments = [
    // Global
    {
      userId: "user_super_admin",
      roleName: SystemRoles.SUPER_ADMIN,
      tenantId: null,
    },
    {
      userId: "user_support",
      roleName: SystemRoles.SUPPORT,
      tenantId: null,
    },
    // Acme org
    { userId: "user_owner", roleName: TenantRoles.OWNER, tenantId: "org_acme" },
    { userId: "user_admin", roleName: TenantRoles.ADMIN, tenantId: "org_acme" },
    {
      userId: "user_member",
      roleName: TenantRoles.MEMBER,
      tenantId: "org_acme",
    },
    {
      userId: "user_viewer",
      roleName: TenantRoles.VIEWER,
      tenantId: "org_acme",
    },
    // Custom Roles (Acme)
    {
      userId: "user_editor",
      roleName: "editor",
      tenantId: "org_acme",
    },
    {
      userId: "user_moderator",
      roleName: "moderator",
      tenantId: "org_acme",
    },
    {
      userId: "user_contributor",
      roleName: "contributor",
      tenantId: "org_acme",
    },
    // Demo org
    {
      userId: "user_owner",
      roleName: TenantRoles.OWNER,
      tenantId: "org_demo",
    },
    // StartUp org
    {
      userId: "user_owner",
      roleName: TenantRoles.OWNER,
      tenantId: "org_startup",
    },
    {
      userId: "user_member",
      roleName: TenantRoles.MEMBER,
      tenantId: "org_startup",
    },
    // Onboarding User - No explicit roles (Inherits User status implicitly)
    {
      userId: "user_onboarding",
      roleName: null, // No explicit role
      tenantId: null,
    },
  ];

  let created = 0;
  for (const assignment of assignments) {
    // biome-ignore lint/suspicious/noExplicitAny: convenient access to appId
    const appId = (assignment as any).appId ?? DEFAULT_APPLICATION_ID;

    if (!assignment.roleName) {
      continue;
    }

    const roleId = await findRoleId(
      assignment.roleName,
      assignment.tenantId ?? null,
      appId
    );
    if (!roleId) {
      console.warn(`   ⚠ Role ${assignment.roleName} not found`);
      continue;
    }

    await db
      .insert(schema.userRoleAssignments)
      .values({
        id: generateId("ura"),
        userId: assignment.userId,
        roleId,
        applicationId: appId,
        tenantId: assignment.tenantId ?? null,
        assignedAt: now,
        assignedBy: null, // System-created
      })
      .onConflictDoNothing();
    created++;
  }

  console.log(`   ✓ Created ${created} user role assignments`);
}

// ─────────────────────────────────────────────────────────────
// Seed: Casbin Policies
// ─────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: seed script with multiple policy insertions
async function seedCasbinPolicies(ctx: SeedContext) {
  const { db } = ctx;

  console.log("\n🔒 Creating Casbin authorization policies...");

  // Resources - keep in sync with @workspace/authorization/src/types.ts
  // Note: Cannot import directly due to cyclic dependency (authorization depends on db)
  const resources = [
    "posts",
    "comments",
    "users",
    "settings",
    "invitations",
    "roles",
    "organizations",
    "files",
    "reports",
    "announcements",
    "schedules",
    "legal-documents",
    "webhooks",
    "notifications",
    "audit-logs",
    "jobs",
  ];
  const actions = ["read", "create", "update", "delete", "manage"];

  // Resources where members get owner-based update/delete permissions
  const memberOwnerResources = new Set([
    "posts",
    "comments",
    "reports",
    "announcements",
  ]);

  // Policy rules (ptype="p"): role -> app -> tenant -> resource -> action -> effect -> condition
  const policies: Array<{
    ptype: string;
    v0: string;
    v1: string;
    v2: string;
    v3: string;
    v4: string;
    v5: string;
    v6: string;
  }> = [];

  // Create policies for each org
  for (const org of DEMO_ORGS) {
    for (const resource of resources) {
      for (const action of actions) {
        // SUPER_ADMIN: explicit god mode
        policies.push({
          ptype: "p",
          v0: SystemRoles.SUPER_ADMIN,
          v1: DEFAULT_APPLICATION_ID,
          v2: org.id,
          v3: resource,
          v4: action,
          v5: "allow",
          v6: "",
        });

        // Owner can do everything
        policies.push({
          ptype: "p",
          v0: TenantRoles.OWNER,
          v1: DEFAULT_APPLICATION_ID,
          v2: org.id,
          v3: resource,
          v4: action,
          v5: "allow",
          v6: "",
        });

        // Admin can do everything EXCEPT delete the organization
        if (!(resource === "organizations" && action === "delete")) {
          policies.push({
            ptype: "p",
            v0: TenantRoles.ADMIN,
            v1: DEFAULT_APPLICATION_ID,
            v2: org.id,
            v3: resource,
            v4: action,
            v5: "allow",
            v6: "",
          });
        }

        // Member can read and create (standard)
        if (action === "read" || action === "create") {
          policies.push({
            ptype: "p",
            v0: TenantRoles.MEMBER,
            v1: DEFAULT_APPLICATION_ID,
            v2: org.id,
            v3: resource,
            v4: action,
            v5: "allow",
            v6: "",
          });
        }

        // Member: owner-based update/delete
        if (
          (action === "update" || action === "delete") &&
          memberOwnerResources.has(resource)
        ) {
          policies.push({
            ptype: "p",
            v0: TenantRoles.MEMBER,
            v1: DEFAULT_APPLICATION_ID,
            v2: org.id,
            v3: resource,
            v4: action,
            v5: "allow",
            v6: "owner", // Requires ownership check
          });
        }

        // Viewer can only read
        if (action === "read") {
          policies.push({
            ptype: "p",
            v0: TenantRoles.VIEWER,
            v1: DEFAULT_APPLICATION_ID,
            v2: org.id,
            v3: resource,
            v4: action,
            v5: "allow",
            v6: "",
          });
        }

        // ─────────────────────────────────────────────────────────────
        // Custom Role Policies
        // ─────────────────────────────────────────────────────────────

        // EDITOR: Can read, create, update, delete content (Posts, Comments)
        if (["posts", "comments"].includes(resource)) {
          policies.push({
            ptype: "p",
            v0: "editor",
            v1: DEFAULT_APPLICATION_ID,
            v2: org.id,
            v3: resource,
            v4: action,
            v5: "allow",
            v6: "",
          });
        }

        // CONTRIBUTOR: Can read and create content, but not delete/update others'
        if (
          ["posts", "comments"].includes(resource) &&
          (action === "read" || action === "create")
        ) {
          policies.push({
            ptype: "p",
            v0: "contributor",
            v1: DEFAULT_APPLICATION_ID,
            v2: org.id,
            v3: resource,
            v4: action,
            v5: "allow",
            v6: "",
          });
        }

        // MODERATOR: Can manage comments and reports
        if (["comments", "reports"].includes(resource) && action === "manage") {
          policies.push({
            ptype: "p",
            v0: "moderator",
            v1: DEFAULT_APPLICATION_ID,
            v2: org.id,
            v3: resource,
            v4: action,
            v5: "allow",
            v6: "",
          });
        }
      }
    }
  }

  // Global Support Policies
  // Support: Read-only access to users, reports, organizations across all tenants (effectively)
  // Note: Detailed implementation usually handles global checks, but here we seed policies per org for demo completeness
  // or add a global wildcard policy if the enforcer supports it.
  // For now, let's just add strict Global Policy for the seed.

  const supportResources = ["users", "reports", "organizations"];
  for (const resource of supportResources) {
    policies.push({
      ptype: "p",
      v0: SystemRoles.SUPPORT,
      v1: DEFAULT_APPLICATION_ID,
      v2: "*", // Global access
      v3: resource,
      v4: "read",
      v5: "allow",
      v6: "",
    });
  }

  // Global User Policies
  // User: Can create organizations (Platform level action)
  policies.push({
    ptype: "p",
    v0: SystemRoles.USER,
    v1: DEFAULT_APPLICATION_ID,
    v2: "*", // Global context
    v3: "organizations",
    v4: "create",
    v5: "allow",
    v6: "",
  });

  // Insert policies
  for (const policy of policies) {
    await db.insert(schema.casbinRules).values(policy).onConflictDoNothing();
  }
  console.log(`   ✓ Created ${policies.length} permission policies`);

  // Note: User-role assignments are now stored in the user_role_assignments table
  // (seedUserRoleAssignments function), not as Casbin g() grouping policies.
  // This follows the architecture: DB owns user→role, Casbin owns role→permission.
}

// ─────────────────────────────────────────────────────────────
// Seed: Content (Posts & Comments)
// ─────────────────────────────────────────────────────────────

interface TitleGenerators {
  locale: () => string;
  catchPhrase: () => string;
  phrase: () => string;
  sentence: () => string;
}

function generateTitle(index: number, generators: TitleGenerators): string {
  const titleType = index % 4;
  const titleGenerators = [
    generators.locale,
    generators.catchPhrase,
    generators.phrase,
    generators.sentence,
  ];
  const title = titleGenerators[titleType]?.() ?? generators.sentence();
  return title.length > 200 ? `${title.slice(0, 197)}...` : title;
}

async function seedContent(ctx: SeedContext) {
  const { db, locale } = ctx;

  // Import falso functions for realistic data generation
  const {
    rand,
    randCatchPhrase,
    randNumber,
    randParagraph,
    randPastDate,
    randPhrase,
    randSentence,
  } = await import("@ngneat/falso");

  // Title generators mixing locale and falso
  const titleGenerators: TitleGenerators = {
    locale: () => getRandomContent(locale, "postTitles"),
    catchPhrase: () => randCatchPhrase(),
    phrase: () => randPhrase(),
    sentence: () => randSentence().replace(TRAILING_PERIOD_REGEX, ""),
  };

  console.log("\n📝 Creating 125 example posts...");

  const authors = ["user_admin", "user_member", "user_viewer"];
  const statuses = ["published", "draft", "archived"] as const;
  const POST_COUNT = 125;

  const posts: Array<{
    id: string;
    orgId: string;
    title: string;
    content: string;
    authorId: string;
    status: "published" | "draft" | "archived";
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    coverImageId?: string;
    category?: string;
    tags?: string[];
    isFeatured?: boolean;
  }> = [];

  for (let i = 0; i < POST_COUNT; i++) {
    const status = rand(statuses);
    const createdAt = randPastDate({ years: 1 });
    const paragraphCount = randNumber({ min: 2, max: 5 });

    posts.push({
      id: `post_${String(i + 1).padStart(3, "0")}`,
      orgId: i < 100 ? "org_acme" : "org_demo",
      title: generateTitle(i, titleGenerators),
      content: randParagraph({ length: paragraphCount }).join("\n\n"),
      authorId: rand(authors),
      status,
      publishedAt: status === "published" ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
      // Assign random cover image from the 50 seeded picsum files
      coverImageId: `file_picsum_${(i % 50) + 1}`,
      category: rand([
        "Technology",
        "Lifestyle",
        "Business",
        "Health",
        "Science",
      ]),
      tags: [rand(["react", "typescript", "nodejs", "database", "ui", "ux"])],
      isFeatured: Math.random() > 0.8,
    });
  }

  // Batch insert posts
  const BATCH_SIZE = 50;
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    await db
      .insert(schema.examplePosts)
      .values(batch)
      .onConflictDoUpdate({
        target: schema.examplePosts.id,
        set: {
          coverImageId: sql`excluded.cover_image_id`,
          category: sql`excluded.category`,
          tags: sql`excluded.tags`,
          isFeatured: sql`excluded.is_featured`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
  console.log(`   ✓ Created ${posts.length} example posts`);

  console.log("\n💬 Creating example comments...");

  // Generate comments for the first 20 posts
  const comments: Array<{
    id: string;
    orgId: string;
    postId: string;
    content: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const publishedPosts = posts
    .filter((p) => p.status === "published")
    .slice(0, 20);

  let commentId = 1;
  for (const post of publishedPosts) {
    // 1-3 comments per post
    const commentCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < commentCount; j++) {
      const commentDate = new Date(
        post.createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000
      );
      comments.push({
        id: `cmt_${String(commentId++).padStart(3, "0")}`,
        orgId: post.orgId,
        postId: post.id,
        content: randSentence({
          length: Math.floor(Math.random() * 2) + 1,
        }).join(" "),
        authorId: rand(authors.filter((a) => a !== post.authorId)),
        createdAt: commentDate,
        updatedAt: commentDate,
      });
    }
  }

  if (comments.length > 0) {
    await db
      .insert(schema.exampleComments)
      .values(comments)
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${comments.length} example comments`);
}

// ─────────────────────────────────────────────────────────────
// Seed: Files & Jobs
// ─────────────────────────────────────────────────────────────

async function seedFilesAndJobs(ctx: SeedContext) {
  const { db, now } = ctx;

  console.log("\n📁 Creating sample files...");
  const files: (typeof schema.files.$inferInsert)[] = []; // Using typed array instead of any

  // Create 50 random picsum images
  for (let i = 0; i < 50; i++) {
    const width = 800 + Math.floor(Math.random() * 200);
    const height = 600 + Math.floor(Math.random() * 200);
    const id = i + 1;

    files.push({
      id: `file_picsum_${id}`,
      orgId: i < 25 ? "org_acme" : "org_demo",
      filename: `image-${id}.jpg`,
      size: 1024 * 1024 + Math.floor(Math.random() * 5 * 1024 * 1024), // 1-6MB
      mimeType: "image/jpeg",
      storagePath: `https://picsum.photos/id/${id}/${width}/${height}`,
      uploadedBy: "user_admin",
      virusScanStatus: "clean" as const,
      access: "public" as const,
      kind: "image" as const,
      status: "persistent" as const,
    });
  }

  // Add some specific document files
  files.push(
    {
      id: "file_report",
      orgId: "org_acme",
      filename: "quarterly-report.pdf",
      size: 1_234_567,
      mimeType: "application/pdf",
      storagePath: "org_acme/files/quarterly-report.pdf",
      uploadedBy: "user_admin",
      virusScanStatus: "clean" as const,
      access: "private" as const,
      kind: "document" as const,
      status: "persistent" as const,
    },
    {
      id: "file_data",
      orgId: "org_acme",
      filename: "customer-data.csv",
      size: 98_765,
      mimeType: "text/csv",
      storagePath: "org_acme/files/customer-data.csv",
      uploadedBy: "user_member",
      virusScanStatus: "clean" as const,
      access: "private" as const,
      kind: "document" as const,
      status: "persistent" as const,
    }
  );

  for (const file of files) {
    await db
      .insert(schema.files)
      .values({ ...file, uploadedAt: now })
      .onConflictDoUpdate({
        target: schema.files.id,
        set: {
          status: sql`excluded.status`,
        },
      });
  }
  console.log(`   ✓ Created ${files.length} sample files`);

  console.log("\n⚙️ Creating sample jobs...");
  const jobs = [
    {
      id: "job_import",
      orgId: "org_acme",
      type: "bulkImport",
      status: "completed" as const,
      progress: 100,
      message: "Successfully imported 1,234 records",
      createdBy: "user_admin",
      startedAt: new Date(now.getTime() - 300_000),
      completedAt: new Date(now.getTime() - 60_000),
    },
    {
      id: "job_export",
      orgId: "org_acme",
      type: "reportGeneration",
      status: "processing" as const,
      progress: 45,
      message: "Generating quarterly report...",
      createdBy: "user_admin",
      startedAt: new Date(now.getTime() - 120_000),
    },
    {
      id: "job_failed",
      orgId: "org_acme",
      type: "dataSync",
      status: "failed" as const,
      progress: 23,
      message: "Sync failed",
      errorCode: "SYNC_TIMEOUT",
      errorMessage: "Connection to external API timed out after 30 seconds",
      createdBy: "user_member",
      startedAt: new Date(now.getTime() - 600_000),
      completedAt: new Date(now.getTime() - 540_000),
    },
    {
      id: "job_pending",
      orgId: "org_acme",
      type: "emailCampaign",
      status: "pending" as const,
      message: "Queued for processing",
      createdBy: "user_admin",
    },
  ];

  for (const job of jobs) {
    await db
      .insert(schema.jobs)
      .values({ ...job, createdAt: now })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${jobs.length} sample jobs`);
}

// ─────────────────────────────────────────────────────────────
// Seed: Webhooks & Deliveries
// ─────────────────────────────────────────────────────────────

async function seedWebhooks(ctx: SeedContext) {
  const { db, now } = ctx;

  console.log("\n🔗 Creating sample webhooks...");
  const webhooks = [
    {
      id: "whk_slack",
      orgId: "org_acme",
      name: "Slack Notifications",
      url: "https://hooks.slack.com/services/xxx/yyy/zzz",
      secret: "whsec_demo_slack_secret_key_12345",
      events: ["post.created", "post.published", "comment.created"],
      isActive: true,
      description: "Send notifications to #general channel",
      createdBy: "user_admin",
    },
    {
      id: "whk_crm",
      orgId: "org_acme",
      name: "CRM Integration",
      url: "https://api.example-crm.com/webhooks/acme",
      secret: "whsec_demo_crm_secret_key_67890",
      events: ["user.created", "user.updated"],
      isActive: true,
      description: "Sync user data to CRM",
      createdBy: "user_admin",
    },
    {
      id: "whk_disabled",
      orgId: "org_acme",
      name: "Legacy System (Disabled)",
      url: "https://legacy.internal.example.com/webhook",
      secret: "whsec_demo_legacy_secret_key_11111",
      events: ["*"],
      isActive: false,
      description: "Old integration - disabled pending migration",
      createdBy: "user_admin",
    },
  ];

  for (const webhook of webhooks) {
    await db
      .insert(schema.webhooks)
      .values({ ...webhook, createdAt: now, updatedAt: now })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${webhooks.length} sample webhooks`);

  console.log("\n📤 Creating sample webhook deliveries...");
  const deliveries = [
    {
      id: "whd_1",
      webhookId: "whk_slack",
      eventId: "wh_evt_post_created_1",
      eventType: "post.created",
      payload: { postId: "post_welcome", title: "Welcome to Acme Corporation" },
      status: "delivered" as const,
      statusCode: 200,
      attempts: 1,
      deliveredAt: new Date(now.getTime() - 3_600_000),
    },
    {
      id: "whd_2",
      webhookId: "whk_slack",
      eventId: "wh_evt_comment_created_1",
      eventType: "comment.created",
      payload: { commentId: "cmt_1", postId: "post_welcome" },
      status: "delivered" as const,
      statusCode: 200,
      attempts: 1,
      deliveredAt: new Date(now.getTime() - 1_800_000),
    },
    {
      id: "whd_3",
      webhookId: "whk_crm",
      eventId: "wh_evt_user_created_1",
      eventType: "user.created",
      payload: { userId: "user_member", email: "user@example.com" },
      status: "failed" as const,
      statusCode: 503,
      responseBody: '{"error": "Service temporarily unavailable"}',
      attempts: 3,
      nextRetryAt: new Date(now.getTime() + 300_000),
    },
  ];

  for (const delivery of deliveries) {
    await db
      .insert(schema.webhookDeliveries)
      .values({ ...delivery, createdAt: now })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${deliveries.length} sample webhook deliveries`);
}

// ─────────────────────────────────────────────────────────────
// Seed: Notifications & Preferences
// ─────────────────────────────────────────────────────────────

async function seedNotifications(ctx: SeedContext) {
  const { db, now } = ctx;

  console.log("\n🔔 Creating sample notifications...");
  const notifications = [
    {
      id: "notif_welcome",
      userId: "user_admin",
      channel: "email" as const,
      category: "transactional" as const,
      priority: "normal" as const,
      recipientEmail: "admin@example.com",
      subject: "Welcome to the Platform",
      body: "Thank you for joining! Your account has been created successfully.",
      status: "delivered" as const,
      sentAt: new Date(now.getTime() - 86_400_000),
      deliveredAt: new Date(now.getTime() - 86_400_000),
    },
    {
      id: "notif_security",
      userId: "user_admin",
      channel: "email" as const,
      category: "security" as const,
      priority: "high" as const,
      recipientEmail: "admin@example.com",
      subject: "New Login Detected",
      body: "A new login was detected from Chrome on Windows. If this wasn't you, please secure your account.",
      status: "delivered" as const,
      sentAt: new Date(now.getTime() - 7_200_000),
      deliveredAt: new Date(now.getTime() - 7_200_000),
      readAt: new Date(now.getTime() - 3_600_000),
    },
    {
      id: "notif_update",
      userId: "user_member",
      channel: "push" as const,
      category: "system" as const,
      priority: "low" as const,
      subject: "New Features Available",
      body: "Check out the latest features we've added to the platform!",
      status: "sent" as const,
      sentAt: new Date(now.getTime() - 1_800_000),
    },
    {
      id: "notif_unread",
      userId: "user_admin",
      channel: "email" as const,
      category: "transactional" as const,
      priority: "normal" as const,
      recipientEmail: "admin@example.com",
      subject: "Your Weekly Summary",
      body: "Here's your activity summary for the past week: 5 posts created, 12 comments received.",
      status: "delivered" as const,
      sentAt: new Date(now.getTime() - 900_000),
      deliveredAt: new Date(now.getTime() - 900_000),
    },
  ];

  for (const notification of notifications) {
    await db
      .insert(schema.notifications)
      .values({ ...notification, createdAt: now, updatedAt: now })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${notifications.length} sample notifications`);

  console.log("\n⚙️ Creating notification preferences...");
  for (const user of DEMO_USERS) {
    await db
      .insert(schema.notificationPreferences)
      .values({
        id: generateId("pref"),
        userId: user.id,
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false,
        telegramEnabled: false,
        pushEnabled: true,
        marketingEnabled: user.id === "user_admin",
        transactionalEnabled: true,
        securityEnabled: true,
        systemEnabled: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created preferences for ${DEMO_USERS.length} users`);
}

// ─────────────────────────────────────────────────────────────
// Seed: Reports (Templates, Schedules, Jobs)
// ─────────────────────────────────────────────────────────────

async function seedReports(ctx: SeedContext) {
  const { db, now } = ctx;

  console.log("\n📊 Creating report templates...");
  const templates = [
    {
      id: "tpl_sales_summary",
      organizationId: "org_acme",
      name: "Sales Summary Report",
      description: "Monthly sales summary with totals and averages",
      format: "excel" as const,
      templateEngine: "eta",
      templateContent: `<%# Sales Summary Report %>
<% for (const row of data) { %>
  <%= row.product %> | <%= formatCurrency(row.amount, 'USD') %> | <%= row.quantity %>
<% } %>
<%# Footer %>
Total: <%= formatCurrency(sum(data, 'amount'), 'USD') %>
Average: <%= formatCurrency(avg(data, 'amount'), 'USD') %>`,
      options: {
        sheetName: "Sales Summary",
        autoFilter: true,
        freezeHeader: true,
      },
      dataSource: {
        type: "api" as const,
        source: "/v1/orgs/{orgId}/sales",
        defaultParams: { period: "monthly" },
      },
      columns: [
        {
          id: "product",
          header: "Product",
          accessorKey: "product",
          align: "left" as const,
        },
        {
          id: "amount",
          header: "Amount",
          accessorKey: "amount",
          format: "currency" as const,
          align: "right" as const,
        },
        {
          id: "quantity",
          header: "Qty",
          accessorKey: "quantity",
          format: "number" as const,
          align: "center" as const,
        },
        {
          id: "date",
          header: "Date",
          accessorKey: "date",
          format: "date" as const,
        },
      ],
      isPublic: false,
      createdBy: "user_admin",
    },
    {
      id: "tpl_user_activity",
      organizationId: "org_acme",
      name: "User Activity Report",
      description: "Weekly user login and activity metrics",
      format: "csv" as const,
      templateEngine: "eta",
      templateContent: `<%# User Activity Report %>
<% for (const user of data) { %>
<%= user.name %>,<%= user.email %>,<%= user.loginCount %>,<%= formatDate(user.lastLogin, 'YYYY-MM-DD') %>
<% } %>`,
      options: {
        delimiter: ",",
        includeHeaders: true,
      },
      dataSource: {
        type: "query" as const,
        source: "SELECT * FROM user_activity WHERE org_id = :orgId",
      },
      columns: [
        { id: "name", header: "Name", accessorKey: "name" },
        { id: "email", header: "Email", accessorKey: "email" },
        {
          id: "loginCount",
          header: "Login Count",
          accessorKey: "loginCount",
          format: "number" as const,
        },
        {
          id: "lastLogin",
          header: "Last Login",
          accessorKey: "lastLogin",
          format: "datetime" as const,
        },
      ],
      isPublic: true,
      createdBy: "user_admin",
    },
    {
      id: "tpl_receipt",
      organizationId: "org_acme",
      name: "POS Receipt",
      description: "Thermal printer receipt for point of sale",
      format: "thermal" as const,
      templateEngine: "eta",
      templateContent: `<%# Thermal Receipt %>
================================
        ACME CORPORATION
================================
Date: <%= formatDate(order.date, 'MM/DD/YYYY HH:mm') %>
Receipt #: <%= order.id %>
--------------------------------
<% for (const item of order.items) { %>
<%= item.name %>
  <%= item.qty %> x <%= formatCurrency(item.price, 'USD') %>  <%= formatCurrency(item.total, 'USD') %>
<% } %>
--------------------------------
Subtotal:    <%= formatCurrency(order.subtotal, 'USD') %>
Tax:         <%= formatCurrency(order.tax, 'USD') %>
================================
TOTAL:       <%= formatCurrency(order.total, 'USD') %>
================================
     Thank you for your visit!
================================`,
      options: {
        printerWidth: 32,
        encoding: "utf-8",
        autoCut: true,
      },
      columns: [],
      isPublic: false,
      createdBy: "user_member",
    },
    {
      id: "tpl_invoice",
      organizationId: "org_acme",
      name: "Invoice PDF",
      description: "Professional invoice for customers",
      format: "pdf" as const,
      templateEngine: "eta",
      templateContent: `<%# Invoice Template %>
INVOICE #<%= invoice.number %>
Date: <%= formatDate(invoice.date, 'MMMM DD, YYYY') %>

Bill To:
<%= invoice.customer.name %>
<%= invoice.customer.address %>

<% for (const line of invoice.lines) { %>
<%= line.description %> | <%= line.quantity %> | <%= formatCurrency(line.unitPrice, 'USD') %> | <%= formatCurrency(line.total, 'USD') %>
<% } %>

Subtotal: <%= formatCurrency(invoice.subtotal, 'USD') %>
Tax (<%= invoice.taxRate %>%): <%= formatCurrency(invoice.tax, 'USD') %>
Total Due: <%= formatCurrency(invoice.total, 'USD') %>

Payment Terms: Net 30`,
      options: {
        orientation: "portrait" as const,
        pageSize: "letter" as const,
        marginTop: 50,
        marginBottom: 50,
        marginLeft: 50,
        marginRight: 50,
        title: "Invoice",
        includePageNumbers: true,
      },
      columns: [
        {
          id: "description",
          header: "Description",
          accessorKey: "description",
          width: 200,
        },
        {
          id: "quantity",
          header: "Qty",
          accessorKey: "quantity",
          format: "number" as const,
          align: "center" as const,
        },
        {
          id: "unitPrice",
          header: "Unit Price",
          accessorKey: "unitPrice",
          format: "currency" as const,
          align: "right" as const,
        },
        {
          id: "total",
          header: "Total",
          accessorKey: "total",
          format: "currency" as const,
          align: "right" as const,
        },
      ],
      isPublic: false,
      createdBy: "user_admin",
    },
  ];

  for (const template of templates) {
    await db
      .insert(schema.reportTemplates)
      .values({ ...template, createdAt: now, updatedAt: now })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${templates.length} report templates`);

  console.log("\n📅 Creating scheduled jobs...");
  const schedules = [
    {
      id: "sched_weekly_sales",
      organizationId: "org_acme",
      jobType: "report" as const,
      jobConfig: { templateId: "tpl_sales_summary" },
      name: "Weekly Sales Email",
      description: "Send sales summary every Monday morning",
      frequency: "weekly" as const,
      dayOfWeek: "monday" as const,
      hour: 9,
      minute: 0,
      timezone: "America/New_York",
      startDate: now,
      deliveryMethod: "email" as const,
      deliveryConfig: {
        email: {
          recipients: ["sales@example.com", "manager@example.com"],
          subject: "Weekly Sales Report",
          body: "Please find attached the weekly sales summary report.",
        },
      },
      isActive: true,
      nextRunAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdBy: "user_admin",
    },
    {
      id: "sched_daily_activity",
      organizationId: "org_acme",
      jobType: "report" as const,
      jobConfig: { templateId: "tpl_user_activity" },
      name: "Daily Activity Backup",
      description: "Daily backup of user activity to S3",
      frequency: "daily" as const,
      hour: 2,
      minute: 0,
      timezone: "UTC",
      startDate: now,
      deliveryMethod: "storage" as const,
      deliveryConfig: {
        storage: {
          pathTemplate: "reports/activity/activity.csv",
          provider: "s3",
          bucket: "acme-reports",
        },
      },
      isActive: true,
      nextRunAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      createdBy: "user_admin",
    },
    {
      id: "sched_monthly_invoice",
      organizationId: "org_acme",
      jobType: "report" as const,
      jobConfig: { templateId: "tpl_invoice" },
      name: "Monthly Invoice Generation",
      description: "Generate invoices on the 1st of each month",
      frequency: "monthly" as const,
      dayOfMonth: 1,
      hour: 8,
      minute: 0,
      timezone: "America/New_York",
      startDate: now,
      deliveryMethod: "webhook" as const,
      deliveryConfig: {
        webhook: {
          url: "https://billing.example.com/webhooks/invoice",
          headers: { "X-API-Key": "billing-api-key" },
          attachmentMode: "base64" as const,
        },
      },
      isActive: false,
      createdBy: "user_admin",
    },
  ];

  for (const schedule of schedules) {
    await db
      .insert(schema.scheduledJobs)
      .values({ ...schedule, createdAt: now, updatedAt: now })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${schedules.length} scheduled jobs`);

  console.log("\n📋 Creating jobs...");
  const jobs = [
    {
      id: "job_completed",
      orgId: "org_acme",
      type: "report",
      status: "completed" as const,
      progress: 100,
      totalItems: 150,
      processedItems: 150,
      input: {
        templateId: "tpl_sales_summary",
      },
      metadata: {
        templateId: "tpl_sales_summary",
        scheduledReportId: "sched_weekly_sales",
        format: "excel" as const,
      },
      output: {
        filePath: "/reports/org_acme/sales_2025_01.xlsx",
        fileSize: 45_678,
        rowCount: 150,
        downloadUrl: "/v1/orgs/org_acme/jobs/job_completed/download",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      createdBy: "user_admin",
      startedAt: new Date(now.getTime() - 3_600_000),
      completedAt: new Date(now.getTime() - 3_500_000),
    },
    {
      id: "job_processing",
      orgId: "org_acme",
      type: "report",
      status: "processing" as const,
      progress: 65,
      totalItems: 1000,
      processedItems: 650,
      message: "Processing records...",
      input: {
        templateId: "tpl_user_activity",
      },
      metadata: {
        templateId: "tpl_user_activity",
        format: "csv" as const,
      },
      createdBy: "user_member",
      startedAt: new Date(now.getTime() - 300_000),
      estimatedCompletion: new Date(now.getTime() + 180_000),
    },
    {
      id: "job_failed",
      orgId: "org_acme",
      type: "report",
      status: "failed" as const,
      progress: 30,
      input: {
        templateId: "tpl_invoice",
      },
      metadata: {
        templateId: "tpl_invoice",
        scheduledReportId: "sched_monthly_invoice",
        format: "pdf" as const,
      },
      error: {
        code: "DATA_SOURCE_ERROR",
        message: "Failed to connect to billing API: Connection timeout",
        retryable: true,
      },
      createdBy: "user_admin",
      startedAt: new Date(now.getTime() - 7_200_000),
      completedAt: new Date(now.getTime() - 7_100_000),
    },
    {
      id: "job_pending",
      orgId: "org_acme",
      type: "report",
      status: "pending" as const,
      input: {
        templateId: "tpl_receipt",
        parameters: { orderId: "order_12345" },
      },
      metadata: {
        templateId: "tpl_receipt",
        format: "thermal" as const,
      },
      createdBy: "user_member",
    },
  ];

  for (const job of jobs) {
    await db
      .insert(schema.jobs)
      .values({ ...job, createdAt: now })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${jobs.length} jobs`);
}

// ─────────────────────────────────────────────────────────────
// Wipe Database
// ─────────────────────────────────────────────────────────────

async function wipeDatabase(db: Database) {
  // Truncate all tables in proper order or with cascade
  const tables = [
    schema.reportTemplates,
    schema.scheduledJobs,
    // SaaS & Billing
    schema.paymentEvents,
    schema.subscriptions,
    schema.plans,
    schema.coupons,
    // System & Audit
    schema.userActiveContext,
    // schema.authorizationLogs,
    schema.backups,
    schema.folders,
    // Content & Notifications
    schema.announcementInteractions,
    schema.announcements,
    schema.legalDocumentAuditLogs,
    schema.legalDocumentAcceptances,
    schema.legalDocumentVersions,
    schema.legalDocuments,
    schema.notifications,
    schema.webhooks,
    schema.jobs,
    schema.exampleComments,
    schema.examplePosts,
    schema.files,
    schema.casbinRules,
    schema.userRoleAssignments,
    schema.roles,
    schema.members,
    schema.invitations,
    schema.organizations,
    schema.accounts,
    schema.sessions,
    schema.users,
    schema.applications,
  ];

  for (const table of tables) {
    if (!table) {
      continue;
    }
    await db.delete(table);
  }
}

// ─────────────────────────────────────────────────────────────
// Main Seed Function
// ─────────────────────────────────────────────────────────────

async function seed() {
  const locale = getLocale(SEED_LOCALE);
  const isProd = process.argv.includes("--prod");

  if (isProd) {
    console.log(
      `🚀 Starting PRODUCTION database seed (locale: ${locale.name})...\n`
    );
  } else {
    console.log(
      `🌱 Starting DEVELOPMENT database seed (locale: ${locale.name})...\n`
    );
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    const passwordHash = await hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    const now = new Date();
    const ctx: SeedContext = { db, now, passwordHash, locale };

    if (isProd) {
      // Production Seed: Non-destructive, idempotent, system data only
      console.log("   (Skipping destructive operations and demo data)");

      // Ensure system app exists
      // Pass true to only seed applications, skip users
      await seedApplicationAndUsers(ctx, true);

      // Seed ONLY global system roles
      await seedRoles(ctx, true);

      console.log("\n✅ Production database seeded successfully\n");
    } else {
      // Development Seed: Full wipe and demo data
      console.log("🧹 Wiping database...");
      await wipeDatabase(db);
      console.log("   ✓ Database wiped");

      await seedApplicationAndUsers(ctx); // Creates app + users
      await seedOrganizations(ctx);
      await seedRoles(ctx, false); // All roles (Global + Tenant for Demo Orgs)
      await seedUserRoleAssignments(ctx);
      await seedCasbinPolicies(ctx);
      await seedFilesAndJobs(ctx);
      await seedContent(ctx);
      await seedWebhooks(ctx);
      await seedNotifications(ctx);
      await seedReports(ctx);

      console.log("\n✅ Database seeding complete!\n");
      console.log("Demo credentials:");
      console.log("  📧 admin@example.com / password123 (Owner of Acme)");
      console.log(
        "  📧 user@example.com / password123 (Member of Acme, Owner of Demo)"
      );
      console.log("  📧 viewer@example.com / password123 (Viewer of Acme)");
      console.log(
        "  📧 onboarding@example.com / password123 (No Organization)"
      );
      console.log("\nOrganizations:");
      console.log("  🏢 Acme Corporation (slug: acme)");
      console.log("  🏢 Demo Company (slug: demo)");
      console.log("  🏢 StartUp Inc (slug: startup)\n");
    }
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed
seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
