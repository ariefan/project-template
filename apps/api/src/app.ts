import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import scalarApiReference from "@scalar/fastify-api-reference";
import type { Auth } from "@workspace/auth";
import type { Authorization } from "@workspace/authorization";
import type { Database } from "@workspace/db";
import { createNotificationSystem } from "@workspace/notifications";
import { createStorageProvider } from "@workspace/storage";
import Fastify from "fastify";
import YAML from "yaml";
import { env } from "./env";
import { announcementsModule } from "./modules/announcements";
import { applicationsModule } from "./modules/applications";
import { authRoutes } from "./modules/auth";
import {
  authorizationModule,
  contextRoutes,
  globalRoleRoutes,
} from "./modules/authorization";
import { examplePostsModule } from "./modules/example-posts";
import { filesModule, filesService } from "./modules/files";
import { healthRoutes } from "./modules/health";
import { jobsModule, jobTypesRoutes } from "./modules/jobs";
import { legalDocumentsModule } from "./modules/legal-documents";
import { migrationRoutes } from "./modules/migration";
import { notificationsModule } from "./modules/notifications";
import { organizationsModule } from "./modules/organizations";
import { reportsModule } from "./modules/reports";
import { schedulesModule } from "./modules/schedules";
import { createScheduler } from "./modules/schedules/services/scheduler";
import { storageRoutes } from "./modules/storage";
import subscriptionsModule, {
  registerSubscriptionHandlers,
} from "./modules/subscriptions";
import { webhooksModule } from "./modules/webhooks";
import authorizationPlugin from "./plugins/authorization";
import rateLimitPlugin from "./plugins/rate-limit";
import securityHeadersPlugin from "./plugins/security-headers";
import { systemOrganizationsRoutes } from "./routes/system-organizations/system-organizations.routes";

export interface AppConfig {
  auth: Auth;
  enforcer: Authorization;
  db: Database;
}

const require = createRequire(import.meta.url);

// Load OpenAPI spec from contracts package
function loadOpenApiSpec() {
  const contractsPath = dirname(require.resolve("@workspace/contracts"));
  const specPath = join(contractsPath, "../tsp-output/openapi/openapi.yaml");
  const specContent = readFileSync(specPath, "utf-8");
  return YAML.parse(specContent);
}

// Build notification system config from environment
function buildEmailConfig() {
  // Console provider (development/testing) - no API keys required
  if (env.EMAIL_PROVIDER === "console") {
    return {
      provider: "console" as const,
      defaultFrom: env.EMAIL_FROM,
    };
  }

  // Production providers require API keys
  if (!env.RESEND_API_KEY) {
    return;
  }

  const nodemailerAuth =
    env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined;

  const nodemailerConfig =
    env.EMAIL_PROVIDER === "nodemailer" && env.SMTP_HOST
      ? {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT ?? 587,
          secure: env.SMTP_SECURE,
          auth: nodemailerAuth,
        }
      : undefined;

  return {
    provider: env.EMAIL_PROVIDER as "resend" | "nodemailer",
    defaultFrom: env.EMAIL_FROM,
    resend:
      env.EMAIL_PROVIDER === "resend"
        ? { apiKey: env.RESEND_API_KEY }
        : undefined,
    nodemailer: nodemailerConfig,
  };
}

function buildTwilioConfig(fromNumber: string | undefined) {
  if (!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && fromNumber)) {
    return;
  }
  return {
    provider: "twilio" as const,
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      fromNumber,
    },
  };
}

function buildNotificationConfig() {
  return {
    email: buildEmailConfig(),
    sms: buildTwilioConfig(env.TWILIO_SMS_FROM),
    whatsapp: buildTwilioConfig(env.TWILIO_WHATSAPP_FROM),
    telegram: env.TELEGRAM_BOT_TOKEN
      ? { botToken: env.TELEGRAM_BOT_TOKEN }
      : undefined,
    queue: env.QUEUE_ENABLED
      ? {
          connectionString: env.DATABASE_URL,
          concurrency: env.QUEUE_CONCURRENCY,
          maxRetries: env.QUEUE_MAX_RETRIES,
        }
      : undefined,
  };
}

// Build storage provider config from environment
function buildStorageConfig() {
  return {
    type: env.STORAGE_PROVIDER,
    localPath: env.STORAGE_LOCAL_PATH,
    s3Endpoint: env.S3_ENDPOINT,
    s3Region: env.S3_REGION,
    s3Bucket: env.S3_BUCKET,
    s3AccessKeyId: env.S3_ACCESS_KEY_ID,
    s3SecretAccessKey: env.S3_SECRET_ACCESS_KEY,
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: App bootstrap requires sequential plugin registration with conditional logic
export async function buildApp(config: AppConfig) {
  console.log("--- BUILDING APP (Hot Reload Check) ---");
  const app = Fastify({ logger: true });

  // Decorate Fastify with auth instance for use in routes
  app.decorate("auth", config.auth);

  // Security Headers
  await app.register(securityHeadersPlugin);

  // Metrics (early registration to capture all requests)
  if (env.METRICS_ENABLED) {
    const { default: metricsPlugin } = await import("./plugins/metrics");
    await app.register(metricsPlugin);
  }

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Cookies
  await app.register(cookie);

  // Multipart (for file uploads)
  await app.register(multipart, {
    limits: {
      fileSize: env.FILE_MAX_SIZE,
    },
  });

  // Rate Limiting
  await app.register(rateLimitPlugin);

  // Authorization (DB-driven role lookup, Casbin for permission evaluation)
  await app.register(authorizationPlugin, {
    enforcer: config.enforcer,
    db: config.db,
  });

  // Idempotency (for POST/PATCH operations)
  // As documented in docs/api-guide/06-quality/02-idempotency.md
  if (env.IDEMPOTENCY_ENABLED) {
    const { createCacheProvider } = await import("@workspace/cache");
    const { default: idempotencyPlugin } = await import(
      "./plugins/idempotency"
    );

    const cacheProvider = createCacheProvider(
      env.CACHE_PROVIDER === "redis" && env.REDIS_URL
        ? { type: "redis", url: env.REDIS_URL, keyPrefix: "idempotency:" }
        : { type: "memory", maxSize: env.CACHE_MAX_SIZE }
    );

    await app.register(idempotencyPlugin, {
      cacheProvider,
      ttlSeconds: env.IDEMPOTENCY_TTL,
    });
  }

  // HTTP Caching (ETag, Cache-Control headers)
  // As documented in docs/api-guide/06-quality/03-caching.md
  if (env.CACHING_ENABLED) {
    const { default: cachingPlugin } = await import("./plugins/caching");
    await app.register(cachingPlugin);
  }

  // Deprecation Headers (Sunset, version warnings)
  // As documented in docs/api-guide/08-governance/04-deprecation.md
  if (env.DEPRECATION_ENABLED) {
    const { default: deprecationPlugin } = await import(
      "./plugins/deprecation"
    );
    await app.register(deprecationPlugin);
  }

  // Initialize storage provider for file uploads
  const storageProvider = createStorageProvider(buildStorageConfig());
  filesService.initFilesService(storageProvider);

  // Initialize real-time event broadcaster (before notification system)
  let eventBroadcaster: import("@workspace/realtime").EventBroadcaster | null =
    null;
  let connectionManager:
    | import("@workspace/realtime").ConnectionManager
    | null = null;

  if (env.REALTIME_ENABLED) {
    const {
      createRedisBroadcaster,
      createMemoryBroadcaster,
      createConnectionManager,
    } = await import("@workspace/realtime");

    // Use Redis broadcaster if Redis is available, otherwise memory
    eventBroadcaster =
      env.CACHE_PROVIDER === "redis" && env.REDIS_URL
        ? createRedisBroadcaster({ url: env.REDIS_URL })
        : createMemoryBroadcaster();

    connectionManager = createConnectionManager();

    // Close broadcaster on shutdown
    app.addHook("onClose", async () => {
      if (eventBroadcaster) {
        await eventBroadcaster.close();
      }
      if (connectionManager) {
        connectionManager.close();
      }
    });

    app.log.info("Real-time event broadcaster initialized");
  }

  // Initialize notification system
  const notificationConfig = buildNotificationConfig();
  const hasAnyProvider =
    notificationConfig.email ||
    notificationConfig.sms ||
    notificationConfig.whatsapp ||
    notificationConfig.telegram;

  const notificationSystem = hasAnyProvider
    ? createNotificationSystem({
        ...notificationConfig,
        // biome-ignore lint/suspicious/noExplicitAny: EventBroadcaster types are compatible at runtime
        eventBroadcaster: eventBroadcaster as any,
      })
    : null;

  app.decorate("notifications", notificationSystem);

  // Start notification queue if enabled
  if (notificationSystem) {
    await notificationSystem.start();
    app.addHook("onClose", async () => {
      await notificationSystem.stop();
    });
  }

  // Register WebSocket and SSE plugins
  if (env.REALTIME_ENABLED && eventBroadcaster && connectionManager) {
    const websocketPlugin = await import("./plugins/websocket");
    const ssePlugin = await import("./plugins/sse");

    await app.register(websocketPlugin.default, {
      broadcaster: eventBroadcaster,
      connectionManager,
      heartbeatInterval: env.REALTIME_HEARTBEAT_INTERVAL,
    });

    // Register SSE plugin (path is hardcoded as /v1/sse/events)
    await app.register(ssePlugin.default, {
      broadcaster: eventBroadcaster,
      connectionManager,
      heartbeatInterval: env.REALTIME_HEARTBEAT_INTERVAL,
    });

    app.log.info("Real-time notifications enabled (WebSocket + SSE)");
  }

  // Register generic job handlers for discovery and processing
  const {
    registerReportHandler,
    registerTestHandler,
    registerStorageCleanupHandler,
  } = await import("./modules/jobs");

  registerReportHandler();
  registerTestHandler();
  registerSubscriptionHandlers();
  registerStorageCleanupHandler();

  // Initialize webhook delivery queue (uses same QUEUE_ENABLED setting)
  if (env.QUEUE_ENABLED) {
    const { createWebhookQueue } = await import("./modules/webhooks");
    const { initQueue } = await import(
      "./modules/webhooks/services/webhook-delivery.service"
    );

    const webhookQueue = createWebhookQueue({
      connectionString: env.DATABASE_URL,
      concurrency: env.QUEUE_CONCURRENCY,
    });

    initQueue(webhookQueue);
    await webhookQueue.start();

    app.addHook("onClose", async () => {
      await webhookQueue.stop();
    });

    // Initialize generic job queue with handlers
    const { createJobQueue, jobsService } = await import("./modules/jobs");

    const jobQueue = createJobQueue({
      connectionString: env.DATABASE_URL,
      defaultConcurrency: env.QUEUE_CONCURRENCY,
    });

    jobsService.initQueue(jobQueue);
    await jobQueue.start();

    // Schedule recurring maintenance jobs
    await jobQueue.schedule("system:subscription-monitor", "0 * * * *");

    // Schedule storage cleanup
    await jobQueue.schedule("system:storage-cleanup", "0 * * * *");

    // Initialize and start the scheduled job worker
    // This polls for due schedules and automatically creates jobs
    const scheduledJobWorker = createScheduler(
      {
        createAndEnqueueJob: jobsService.createAndEnqueueJob.bind(jobsService),
      },
      {
        intervalMs: 60_000, // Check every minute
        batchSize: 50,
      }
    );
    await scheduledJobWorker.start();

    app.addHook("onClose", async () => {
      await jobQueue.stop();
      await scheduledJobWorker.stop();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // API Documentation
  // ─────────────────────────────────────────────────────────────
  // This server exposes two separate OpenAPI documentation endpoints:
  //
  // 1. Public API Documentation (this endpoint):
  //    - UI: /docs
  //    - Spec: /openapi.json
  //    - Generated from TypeSpec contracts in packages/contracts
  //    - Covers public API endpoints (/v1/*)
  //    - Deploy to: api.yourcompany.com
  //
  // 2. Better Auth Documentation (internal auth):
  //    - UI: /api/auth/docs
  //    - Spec: /api/auth/open-api/generate-schema
  //    - Generated by Better Auth's built-in OpenAPI plugin
  //    - Covers internal authentication for dashboard (/api/auth/*)
  //    - Used by web/mobile apps for user login, not public API consumers
  //
  // Architecture: This follows the standard public API pattern where
  // Better Auth handles internal dashboard auth at /api/auth/*, while
  // your public API (the actual product) lives at /v1/*.
  // ─────────────────────────────────────────────────────────────

  // Main API OpenAPI spec endpoint
  const openApiSpec = loadOpenApiSpec();
  app.get("/openapi.json", async () => openApiSpec);

  // Main API documentation UI
  await app.register(scalarApiReference, {
    routePrefix: "/docs",
    configuration: {
      pageTitle: "Project API Documentation",
      theme: "kepler",
      url: "/openapi.json",
    },
  });

  app.get("/debug/info", async () => ({
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
    routes: app.printRoutes(),
  }));

  // Modules
  await app.register(healthRoutes);
  await app.register(storageRoutes);
  await app.register(migrationRoutes);
  await app.register(authRoutes);

  await app.register(applicationsModule, { prefix: "/v1" });
  await app.register(contextRoutes, { prefix: "/v1" });
  await app.register(globalRoleRoutes, { prefix: "/v1" });
  await app.register(authorizationModule, { prefix: "/v1/orgs" });
  await app.register(announcementsModule, { prefix: "/v1/orgs" });
  await app.register(examplePostsModule, { prefix: "/v1/orgs" });
  await app.register(jobsModule, { prefix: "/v1/orgs" });
  await app.register(filesModule, { prefix: "/v1/orgs" });
  await app.register(webhooksModule, { prefix: "/v1/orgs" });
  await app.register(notificationsModule, { prefix: "/v1" });
  await app.register(organizationsModule, { prefix: "/v1/orgs" });
  await app.register(reportsModule, { prefix: "/v1/orgs" });
  await app.register(schedulesModule, { prefix: "/v1/orgs" });
  await app.register(subscriptionsModule, { prefix: "/v1" });
  await app.register(legalDocumentsModule, { prefix: "/v1" });
  await app.register(jobTypesRoutes, { prefix: "/v1" });
  await app.register(systemOrganizationsRoutes, {
    prefix: "/v1/system-organizations",
  });

  return app;
}
