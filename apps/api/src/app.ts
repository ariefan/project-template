import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import scalarApiReference from "@scalar/fastify-api-reference";
import { createNotificationSystem } from "@workspace/notifications";
import Fastify from "fastify";
import YAML from "yaml";
import { env } from "./env";
import { authRoutes } from "./modules/auth";
import { examplePostsModule } from "./modules/example-posts";
import { healthRoutes } from "./modules/health";
import { notificationsModule } from "./modules/notifications";

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

export async function buildApp() {
  const app = Fastify({ logger: true });

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  // Cookies
  await app.register(cookie);

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
  await app.register(authRoutes);
  await app.register(examplePostsModule, { prefix: "/v1/orgs" });
  await app.register(notificationsModule, { prefix: "/v1" });

  return app;
}
