# @workspace/db

**Drizzle ORM with PostgreSQL for type-safe database access**

This package provides a fully configured [Drizzle ORM](https://orm.drizzle.team/) instance with all schema definitions for the monorepo. It exports the database client, schema tables, operators, and inferred types.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          @workspace/db                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Schema Tables:                                                      │
│  ├── auth.ts              (users, sessions, accounts, etc.)        │
│  ├── roles.ts             (custom roles per tenant)                 │
│  ├── user-role-assignments.ts (user ↔ role mappings)               │
│  ├── casbin-rules.ts      (authorization policies)                  │
│  ├── authorization-audit.ts (permission check logs)                │
│  ├── applications.ts      (multi-app registry)                      │
│  ├── notifications.ts     (notifications, preferences, templates)  │
│  ├── files.ts             (file metadata)                           │
│  ├── jobs.ts              (background job queue)                    │
│  ├── example-posts.ts     (demo: blog posts)                        │
│  └── example-comments.ts  (demo: comments)                          │
│                                                                      │
│  Exports:                                                            │
│  ├── db                   (Drizzle client instance)                 │
│  ├── schema.*             (all table definitions)                   │
│  ├── operators            (eq, and, or, sql, etc.)                  │
│  └── types                (inferred TypeScript types)               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

## Exports

```typescript
// Database client
export { db } from "@workspace/db";
export type { Database } from "@workspace/db";

// Drizzle operators
export { eq, and, or, inArray, isNull, asc, desc, sql } from "@workspace/db";

// All schema tables
export * from "@workspace/db/schema";

// Inferred types (examples)
export type { Notification, NotificationInsert } from "@workspace/db";
export type { NotificationPreference } from "@workspace/db";
```

## Usage

### Basic Queries

```typescript
import { db, eq, users, posts } from "@workspace/db";

// Select all users
const allUsers = await db.select().from(users);

// Select with filter
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, "john@example.com"))
  .limit(1);

// Select with join
const postsWithAuthors = await db
  .select({
    post: posts,
    author: users,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id));
```

### Insert

```typescript
import { db, users } from "@workspace/db";

const [newUser] = await db
  .insert(users)
  .values({
    email: "john@example.com",
    name: "John Doe",
  })
  .returning();
```

### Update

```typescript
import { db, eq, users } from "@workspace/db";

await db
  .update(users)
  .set({ name: "Jane Doe" })
  .where(eq(users.id, userId));
```

### Delete (Soft Delete Pattern)

```typescript
import { db, eq, posts } from "@workspace/db";

// Soft delete
await db
  .update(posts)
  .set({ deletedAt: new Date() })
  .where(eq(posts.id, postId));

// Query excluding deleted
const activePosts = await db
  .select()
  .from(posts)
  .where(isNull(posts.deletedAt));
```

### Transactions

```typescript
import { db, users, accounts } from "@workspace/db";

await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ email: "john@example.com" })
    .returning();

  await tx
    .insert(accounts)
    .values({ userId: user.id, provider: "email" });
});
```

## Schema Tables

### Authentication (`auth.ts`)

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `sessions` | Active sessions |
| `accounts` | OAuth/social connections |
| `verifications` | Email/phone verification |
| `organizations` | Multi-tenant orgs |
| `members` | Org memberships |
| `invitations` | Pending invites |
| `apiKeys` | API key management |

### Authorization

| Table | Description |
|-------|-------------|
| `roles` | Custom role definitions |
| `userRoleAssignments` | User-role mappings |
| `casbinRules` | Casbin policy rules |
| `authorizationAuditLogs` | Permission check logs |
| `applications` | Multi-app registry |
| `userActiveContext` | Current user context |

### Notifications

| Table | Description |
|-------|-------------|
| `notifications` | Notification records |
| `notificationPreferences` | User preferences |
| `notificationTemplates` | Message templates |
| `notificationCampaigns` | Bulk notifications |

### Other

| Table | Description |
|-------|-------------|
| `files` | File metadata |
| `jobs` | Background jobs |
| `posts` | Example: blog posts |
| `comments` | Example: comments |

## Migrations

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit push

# Open Drizzle Studio (GUI)
pnpm drizzle-kit studio
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgres://user:password@localhost:5432/mydb

# Optional: Connection pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

## Type Inference

Drizzle provides automatic type inference from schema:

```typescript
import { users } from "@workspace/db/schema";

// Infer select type
type User = typeof users.$inferSelect;

// Infer insert type
type NewUser = typeof users.$inferInsert;
```

## Dependencies

- `drizzle-orm` - ORM
- `drizzle-kit` - CLI tools
- `pg` - PostgreSQL driver

## Related Documentation

- [Drizzle Docs](https://orm.drizzle.team/)
- [Development Workflow](../../docs/development-workflow.md)
