import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import scalarApiReference from "@scalar/fastify-api-reference";
import { createNotificationSystem } from "@workspace/notifications";
import { createStorageProvider } from "@workspace/storage";
import Fastify from "fastify";
import YAML from "yaml";
import { env } from "./env";
import { applicationsModule } from "./modules/applications";
import { authRoutes } from "./modules/auth";
import { authorizationModule } from "./modules/authorization";
import { examplePostsModule } from "./modules/example-posts";
import { filesModule, filesService } from "./modules/files";
import { healthRoutes } from "./modules/health";
import { jobsModule } from "./modules/jobs";
import { migrationRoutes } from "./modules/migration";
import { notificationsModule } from "./modules/notifications";
import { webhooksModule } from "./modules/webhooks";
import authorizationPlugin from "./plugins/authorization";
import rateLimitPlugin from "./plugins/rate-limit";
import securityHeadersPlugin from "./plugins/security-headers";

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

export async function buildApp() {
  const app = Fastify({ logger: true });

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

  // Authorization
  await app.register(authorizationPlugin);

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

  // Initialize notification system
  const notificationConfig = buildNotificationConfig();
  const hasAnyProvider =
    notificationConfig.email ||
    notificationConfig.sms ||
    notificationConfig.whatsapp ||
    notificationConfig.telegram;

  const notificationSystem = hasAnyProvider
    ? createNotificationSystem(notificationConfig)
    : null;

  app.decorate("notifications", notificationSystem);

  // Start notification queue if enabled
  if (notificationSystem) {
    await notificationSystem.start();
    app.addHook("onClose", async () => {
      await notificationSystem.stop();
    });
  }

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
  }

  // OpenAPI spec endpoint
  const openApiSpec = loadOpenApiSpec();
  app.get("/openapi.json", async () => openApiSpec);

  // Scalar API Reference
  await app.register(scalarApiReference, {
    routePrefix: "/docs",
    configuration: {
      pageTitle: "Project API",
      theme: "kepler",
      url: "/openapi.json",
    },
  });

  // Modules
  await app.register(healthRoutes);
  await app.register(migrationRoutes);
  await app.register(authRoutes);
  await app.register(applicationsModule, { prefix: "/v1" });
  await app.register(authorizationModule, { prefix: "/v1/orgs" });
  await app.register(examplePostsModule, { prefix: "/v1/orgs" });
  await app.register(jobsModule, { prefix: "/v1/orgs" });
  await app.register(filesModule, { prefix: "/v1/orgs" });
  await app.register(webhooksModule, { prefix: "/v1/orgs" });
  await app.register(notificationsModule, { prefix: "/v1" });

  return app;
}
