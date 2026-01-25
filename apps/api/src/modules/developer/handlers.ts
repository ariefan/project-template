import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../env";

const execAsync = promisify(exec);

// ... imports

export async function seedDatabaseHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  // 1. Environment Safety Check
  if (env.NODE_ENV !== "development") {
    req.log.warn("Attempted to seed database in non-development environment");
    return reply.status(403).send({
      message: "Database seeding is only available in development environment",
    });
  }

  const { mode } = req.body as { mode: "dev" | "prod" };

  // 2. Execute Seed Command
  try {
    const cwd = process.cwd();
    req.log.info({ cwd, mode }, "Starting database seed...");

    const command =
      mode === "prod"
        ? "pnpm --filter db db:seed:prod"
        : "pnpm --filter db db:seed";

    // Execution
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd.endsWith("api") ? "../../" : cwd, // Simple heuristic to find root if in app dir
      env: { ...process.env, FORCE_COLOR: "1" }, // Preserve output colors if possible
    });

    req.log.info("Database seed completed successfully");

    return {
      success: true,
      stdout: stdout || undefined,
      warnings: stderr ? stderr : undefined,
    };
  } catch (error) {
    req.log.error({ err: error }, "Database seed failed");
    return reply.status(500).send({
      message: "Failed to seed database",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getDemoAccountsHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  // 1. Environment Safety Check
  if (env.NODE_ENV !== "development") {
    return reply.status(403).send({
      message: "Demo accounts are only available in development environment",
    });
  }

  try {
    const { db, eq, users, userRoleAssignments, roles, accounts, SystemRoles } =
      await import("@workspace/db");

    // 1. Fetch all users who have credential accounts (password login)
    const credentialAccounts = await db
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(eq(accounts.providerId, "credential"));

    const credentialUserIds = credentialAccounts.map((a) => a.userId);

    if (credentialUserIds.length === 0) {
      return { users: [] };
    }

    // 2. Fetch users details

    // InArray check might be large if many users, but for demo it's fine.
    // Alternatively fetch all and filter in JS if needed, but strict is better.
    // Drizzle doesn't export `inArray` from @workspace/db by default unless we check index.ts
    // index.ts exports `inArray`.
    // Re-importing inArray to be safe if destructuring above failed or add it to destructuring
    const { inArray } = await import("@workspace/db"); // ensuring import

    const demoUsers = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, credentialUserIds));

    // 3. Fetch assignments for these users
    const assignments = await db
      .select({
        userId: userRoleAssignments.userId,
        roleName: roles.name,
      })
      .from(userRoleAssignments)
      .leftJoin(roles, eq(userRoleAssignments.roleId, roles.id))
      .where(inArray(userRoleAssignments.userId, credentialUserIds));

    // 4. Group by user
    const results = demoUsers.map((user) => {
      const userRoles = assignments
        .filter((a) => a.userId === user.id)
        .map((a) => a.roleName)
        .filter((r): r is string => r !== null);

      // Best Practice: Explicitly include "user" role for everyone in the UI
      // so it matches the implicit backend permissions.
      const allRoles = [...new Set([...userRoles, SystemRoles.USER])];

      return {
        id: user.id,
        email: user.email,
        roles: allRoles,
      };
    });

    return {
      users: results,
    };
  } catch (error) {
    req.log.error({ err: error }, "Failed to fetch demo accounts");
    return reply.status(500).send({
      message: "Failed to fetch demo accounts",
    });
  }
}
