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
