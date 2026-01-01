// Load environment variables FIRST, before any other imports
// This ensures config is available when initializing packages
import "./env";

import {
  createAuth,
  createConsoleEmailService,
  createConsoleSmsService,
} from "@workspace/auth";
import { createAuthorization } from "@workspace/authorization";
import { closeDefaultDb, getDefaultDb, initDefaultDb } from "@workspace/db";
import { buildApp } from "./app";
import { env } from "./env";

async function start() {
  // Initialize database before building app
  // This enables the lazy `db` export for convenience
  initDefaultDb({ connectionString: env.DATABASE_URL });

  const db = getDefaultDb();

  // Create auth instance with injected database
  const auth = createAuth({
    db,
    baseUrl: env.BETTER_AUTH_URL,
    emailService: createConsoleEmailService(),
    smsService: createConsoleSmsService(),
    environment: env.NODE_ENV,
    // Allow cross-origin requests from the web app
    trustedOrigins: [env.CORS_ORIGIN],
    socialProviders: {
      github:
        env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
          ? {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
            }
          : undefined,
      google:
        env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
          ? {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
          : undefined,
    },
    passkey:
      env.PASSKEY_RP_ID && env.PASSKEY_RP_NAME
        ? {
            rpID: env.PASSKEY_RP_ID,
            rpName: env.PASSKEY_RP_NAME,
          }
        : undefined,
  });

  // Create authorization enforcer with injected database
  const enforcer = await createAuthorization(db);

  const app = await buildApp({ auth, enforcer });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    await closeDefaultDb();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    await closeDefaultDb();
    process.exit(1);
  }
}

start();
