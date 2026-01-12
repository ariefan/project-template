#!/usr/bin/env node

/**
 * Development Orchestration Script
 *
 * Manages the local development workflow:
 * 1. Starts Docker infrastructure (PostgreSQL, optionally Redis/Caddy)
 * 2. Waits for services to be healthy
 * 3. Runs database migrations
 * 4. Starts all applications (or specific apps if filtered)
 *
 * Usage:
 *   node scripts/dev.mjs [options] [apps...]
 *
 * Options:
 *   --with-caddy    Include Caddy reverse proxy (HTTPS at https://localhost)
 *   --with-redis    Include Redis cache
 *   --skip-db       Skip Docker services (assume already running)
 *   --clean         Remove Docker volumes and start fresh
 *
 * Examples:
 *   pnpm dev                    # PostgreSQL + all apps
 *   pnpm dev api web            # PostgreSQL + only api and web
 *   pnpm dev:caddy api          # PostgreSQL + Caddy + only api
 *   pnpm dev:full api web       # PostgreSQL + Redis + Caddy + api and web
 */

import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const args = process.argv.slice(2);
const withCaddy = args.includes("--with-caddy");
const withRedis = args.includes("--with-redis");
const skipDb = args.includes("--skip-db");
const clean = args.includes("--clean");

// Extract app names (non-flag arguments) to filter which apps to run
const appNames = args.filter((arg) => !arg.startsWith("--"));

/**
 * Run a command and return a promise
 */
function run(command, cmdArgs = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, cmdArgs, {
      stdio: "inherit",
      shell: true,
      ...options,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Command failed with exit code ${code}: ${command} ${cmdArgs.join(" ")}`
          )
        );
      }
    });

    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
      proc.kill("SIGINT");
      process.exit(130);
    });
    process.on("SIGTERM", () => {
      proc.kill("SIGTERM");
      process.exit(143);
    });
  });
}

/**
 * Check if PostgreSQL is ready by running pg_isready in the container
 */
async function checkPostgresHealth() {
  console.log("⏳ Waiting for PostgreSQL to be ready...");

  for (let i = 0; i < 30; i++) {
    try {
      await run(
        "docker",
        ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "postgres"],
        { stdio: "ignore" }
      );
      return true;
    } catch {
      await setTimeout(1000);
    }
  }

  throw new Error("❌ PostgreSQL health check timeout after 30 seconds");
}

/**
 * Main orchestration logic
 */
async function main() {
  try {
    console.log("\n🚀 Starting development environment\n");

    // Clean volumes if requested
    if (clean) {
      console.log("🧹 Cleaning Docker volumes...");
      await run("docker", ["compose", "down", "-v"]);
      console.log("✅ Volumes cleaned\n");
    }

    // Start infrastructure unless skipped
    if (skipDb) {
      console.log("⏭️  Skipping Docker infrastructure (--skip-db)\n");
    } else {
      const profiles = [];
      if (withCaddy) {
        profiles.push("--profile", "with-caddy");
        console.log("🔒 Caddy reverse proxy enabled (https://localhost)");
      }
      if (withRedis) {
        profiles.push("--profile", "with-redis");
        console.log("📦 Redis cache enabled");
      }

      console.log("🐘 Starting infrastructure services...");
      await run("docker", ["compose", "up", "-d", ...profiles]);
      console.log("✅ Infrastructure started\n");

      // Wait for PostgreSQL to be ready
      await checkPostgresHealth();
      console.log("✅ PostgreSQL is ready\n");

      // Run migrations
      console.log("🔄 Running database migrations...");
      await run("pnpm", ["--filter", "@workspace/db", "db:migrate"]);
      console.log("✅ Migrations completed\n");
    }

    // Start applications
    if (appNames.length > 0) {
      console.log(`🚀 Starting applications: ${appNames.join(", ")}...\n`);
    } else {
      console.log("🚀 Starting all applications...\n");
    }
    console.log("───────────────────────────────────────────────────");

    if (withCaddy) {
      console.log("🌐 Access apps at: https://localhost");
    } else {
      console.log("🌐 API:    http://localhost:3001");
      console.log("🌐 Web:    http://localhost:3000");
      console.log("🌐 Drive:  http://localhost:3002");
      console.log("🌐 Mobile: http://localhost:8081");
    }

    console.log("───────────────────────────────────────────────────\n");

    // Build turbo command with app filters if specified
    const turboArgs = ["turbo", "dev"];
    if (appNames.length > 0) {
      for (const app of appNames) {
        turboArgs.push("--filter", app);
      }
    }

    await run("pnpm", turboArgs);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();
