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
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { DEFAULT_APPLICATION_ID } from "./schema/applications";
import { SystemRoles } from "./schema/roles";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Database = NodePgDatabase<typeof schema>;

interface SeedContext {
  db: Database;
  now: Date;
  passwordHash: string;
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/postgres";
const BCRYPT_ROUNDS = 10;
const DEFAULT_PASSWORD = "password123";

// ─────────────────────────────────────────────────────────────
// Demo Data
// ─────────────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    id: "user_admin",
    name: "Admin User",
    email: "admin@example.com",
    username: "admin",
    role: "admin",
  },
  {
    id: "user_member",
    name: "Member User",
    email: "user@example.com",
    username: "member",
    role: "member",
  },
  {
    id: "user_viewer",
    name: "Viewer User",
    email: "viewer@example.com",
    username: "viewer",
    role: "viewer",
  },
] as const;

const DEMO_ORGS = [
  { id: "org_acme", name: "Acme Corporation", slug: "acme" },
  { id: "org_demo", name: "Demo Company", slug: "demo" },
] as const;

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

async function seedApplicationAndUsers(ctx: SeedContext) {
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
      {
        id: generateId("mem"),
        organizationId: "org_acme",
        userId: "user_admin",
        role: "owner",
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
        organizationId: "org_demo",
        userId: "user_member",
        role: "owner",
        createdAt: now,
      },
    ])
    .onConflictDoNothing();

  console.log("   ✓ Acme: admin (owner), user (member), viewer (viewer)");
  console.log("   ✓ Demo: user (owner)");
}

// ─────────────────────────────────────────────────────────────
// Seed: Roles
// ─────────────────────────────────────────────────────────────

async function seedRoles(ctx: SeedContext) {
  const { db, now } = ctx;

  console.log("\n🔐 Creating system roles...");

  const globalRoles = [
    {
      name: SystemRoles.SUPER_USER,
      description: "Super user with full access",
    },
    { name: SystemRoles.APP_ADMIN, description: "Application administrator" },
    { name: SystemRoles.USER, description: "Regular authenticated user" },
  ];

  const tenantRoles = [
    {
      name: SystemRoles.OWNER,
      description: "Organization owner with full control",
    },
    { name: SystemRoles.ADMIN, description: "Organization administrator" },
    { name: SystemRoles.MEMBER, description: "Regular organization member" },
    {
      name: SystemRoles.VIEWER,
      description: "Read-only access to organization",
    },
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

  console.log("   ✓ Global roles: super_user, app_admin, user");
  console.log("   ✓ Tenant roles: owner, admin, member, viewer (per org)");
}

// ─────────────────────────────────────────────────────────────
// Seed: Content (Posts & Comments)
// ─────────────────────────────────────────────────────────────

async function seedContent(ctx: SeedContext) {
  const { db, now } = ctx;

  console.log("\n📝 Creating example posts...");
  const posts = [
    {
      id: "post_welcome",
      orgId: "org_acme",
      title: "Welcome to Acme Corporation",
      content:
        "This is the first post in our organization. We're excited to have you here!",
      authorId: "user_admin",
      status: "published" as const,
      publishedAt: now,
    },
    {
      id: "post_update",
      orgId: "org_acme",
      title: "Q4 Product Update",
      content:
        "We've shipped several new features this quarter including improved dashboards, better notifications, and enhanced security.",
      authorId: "user_admin",
      status: "published" as const,
      publishedAt: now,
    },
    {
      id: "post_draft",
      orgId: "org_acme",
      title: "Draft: Upcoming Features",
      content:
        "This is a draft post about upcoming features that hasn't been published yet.",
      authorId: "user_member",
      status: "draft" as const,
      publishedAt: null,
    },
    {
      id: "post_demo",
      orgId: "org_demo",
      title: "Demo Company Introduction",
      content:
        "Welcome to Demo Company! This is a sample organization for testing.",
      authorId: "user_member",
      status: "published" as const,
      publishedAt: now,
    },
  ];

  for (const post of posts) {
    await db
      .insert(schema.examplePosts)
      .values({ ...post, createdAt: now, updatedAt: now })
      .onConflictDoNothing();
  }
  console.log(`   ✓ Created ${posts.length} example posts`);

  console.log("\n💬 Creating example comments...");
  const comments = [
    {
      id: "cmt_1",
      orgId: "org_acme",
      postId: "post_welcome",
      content: "Great to be here! Looking forward to collaborating.",
      authorId: "user_member",
    },
    {
      id: "cmt_2",
      orgId: "org_acme",
      postId: "post_welcome",
      content: "Excited about the new platform!",
      authorId: "user_viewer",
    },
    {
      id: "cmt_3",
      orgId: "org_acme",
      postId: "post_update",
      content: "The new dashboard is amazing. Thanks for the update!",
      authorId: "user_member",
    },
  ];

  for (const comment of comments) {
    await db
      .insert(schema.exampleComments)
      .values({ ...comment, createdAt: now, updatedAt: now })
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
  const files = [
    {
      id: "file_logo",
      orgId: "org_acme",
      filename: "company-logo.png",
      size: 45_678,
      mimeType: "image/png",
      storagePath: "org_acme/files/company-logo.png",
      uploadedBy: "user_admin",
      virusScanStatus: "clean" as const,
      access: "public" as const,
    },
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
    },
    {
      id: "file_data",
      orgId: "org_acme",
      filename: "customer-data.csv",
      size: 98_765,
      mimeType: "text/csv",
      storagePath: "org_acme/files/customer-data.csv",
      uploadedBy: "user_member",
      virusScanStatus: "pending" as const,
      access: "private" as const,
    },
  ];

  for (const file of files) {
    await db
      .insert(schema.files)
      .values({ ...file, uploadedAt: now })
      .onConflictDoNothing();
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
// Main Seed Function
// ─────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting database seed...\n");

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    const passwordHash = await hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    const now = new Date();
    const ctx: SeedContext = { db, now, passwordHash };

    await seedApplicationAndUsers(ctx);
    await seedOrganizations(ctx);
    await seedRoles(ctx);
    await seedContent(ctx);
    await seedFilesAndJobs(ctx);
    await seedWebhooks(ctx);
    await seedNotifications(ctx);

    console.log("\n✅ Database seeding complete!\n");
    console.log("Demo credentials:");
    console.log("  📧 admin@example.com / password123 (Owner of Acme)");
    console.log(
      "  📧 user@example.com / password123 (Member of Acme, Owner of Demo)"
    );
    console.log("  📧 viewer@example.com / password123 (Viewer of Acme)");
    console.log("\nOrganizations:");
    console.log("  🏢 Acme Corporation (slug: acme)");
    console.log("  🏢 Demo Company (slug: demo)\n");
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
