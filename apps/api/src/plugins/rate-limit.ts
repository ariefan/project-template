/**
 * Rate Limiting Plugin
 *
 * Implements DDoS protection using @fastify/rate-limit with Redis backend.
 *
 * Features:
 * - Global rate limiting for all routes
 * - Redis-backed storage for distributed rate limiting
 * - Standard rate limit headers (X-RateLimit-*)
 * - Graceful degradation if Redis fails
 * - Configurable via environment variables
 *
 * Headers returned:
 * - X-RateLimit-Limit: Maximum requests allowed in time window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when the window resets
 * - Retry-After: Seconds to wait before retrying (when limited)
 *
 * Example usage:
 * GET /api/v1/posts
 * Response headers:
 * X-RateLimit-Limit: 100
 * X-RateLimit-Remaining: 95
 * X-RateLimit-Reset: 1735123456
 *
 * When rate limited (HTTP 429):
 * {
 *   "statusCode": 429,
 *   "error": "Too Many Requests",
 *   "message": "Rate limit exceeded, retry in 900 seconds"
 * }
 */

import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";
import Redis from "ioredis";
import { env } from "../env";

/**
 * Rate limit tiers as documented in docs/api-guide/03-security/03-rate-limiting.md
 */
type RateLimitTier = "free" | "basic" | "pro" | "enterprise";

/**
 * Determine user's rate limit tier based on user metadata.
 * Override this function to implement tier logic based on your subscription system.
 */
function getUserTier(_request: FastifyRequest): RateLimitTier {
  // In production, check user subscription tier from database
  // For now, default to 'free' tier for unauthenticated users
  // Example implementation:
  // const user = _request.user as { tier?: string } | undefined;
  // const tier = user?.tier as RateLimitTier | undefined;
  // return tier || 'free';

  // Default to 'free' tier
  // Extend User type in your application to include tier information
  return "free";
}

/**
 * Get max requests per window for a given tier.
 */
function getTierLimit(tier: RateLimitTier): number {
  const limits = {
    free: env.RATE_LIMIT_FREE,
    basic: env.RATE_LIMIT_BASIC,
    pro: env.RATE_LIMIT_PRO,
    enterprise: env.RATE_LIMIT_ENTERPRISE,
  };
  return limits[tier];
}

// Regex for parsing time window strings (top-level for performance)
const TIME_WINDOW_REGEX = /^(\d+)\s*(second|minute|hour|day)s?$/i;

/**
 * Parse time window string to seconds for X-RateLimit-Window header.
 * Examples: "1 hour" -> 3600, "15 minutes" -> 900
 */
function parseTimeWindowToSeconds(window: string): number {
  const match = window.match(TIME_WINDOW_REGEX);
  if (!(match?.[1] && match[2])) {
    return 3600; // Default to 1 hour
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86_400,
  };

  return value * (multipliers[unit] || 3600);
}

export default async function rateLimitPlugin(app: FastifyInstance) {
  // Skip rate limiting if disabled
  if (!env.RATE_LIMIT_ENABLED) {
    app.log.info("Rate limiting is disabled");
    return;
  }

  // Create Redis client for rate limiting if Redis URL is configured
  const redis =
    env.CACHE_PROVIDER === "redis" && env.REDIS_URL
      ? new Redis(env.REDIS_URL, {
          lazyConnect: true,
          keyPrefix: "rate-limit:",
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          enableOfflineQueue: true,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        })
      : undefined;

  // Connect to Redis if available
  if (redis) {
    try {
      await redis.connect();
      app.log.info("Rate limiter connected to Redis");

      // Clean up Redis connection on app close
      app.addHook("onClose", async () => {
        await redis.quit();
      });
    } catch (error) {
      app.log.warn(
        { err: error },
        "Failed to connect to Redis for rate limiting, falling back to in-memory store"
      );
    }
  } else {
    app.log.info(
      "Rate limiting using in-memory store (not suitable for production clusters)"
    );
  }

  // Tier-based rate limiting with dynamic max based on user tier
  await app.register(rateLimit, {
    global: true, // Apply to all routes
    timeWindow: env.RATE_LIMIT_WINDOW,

    // Dynamic max based on user tier
    max: (request) => {
      const tier = getUserTier(request);
      return getTierLimit(tier);
    },

    // Use Redis if available, otherwise in-memory
    redis,

    // Continue counting even after limit is exceeded
    continueExceeding: true,

    // Skip rate limiting if Redis/cache fails (graceful degradation)
    skipOnError: true,

    // Generate rate limit key based on user ID and tier
    keyGenerator: (request) => {
      const userId = request.user?.id;
      const ip = request.ip;
      const tier = getUserTier(request);

      // Include tier in key so different tiers have separate counters
      if (userId) {
        return `user:${userId}:${tier}`;
      }
      return `ip:${ip}:${tier}`;
    },

    // Custom error response
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded, retry in ${context.after}`,
    }),

    // Add rate limit info to response headers
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },

    // Add Retry-After header when rate limited
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
  });

  // Add X-RateLimit-Window header to all responses (as documented)
  const windowSeconds = parseTimeWindowToSeconds(env.RATE_LIMIT_WINDOW);
  app.addHook("onSend", (_request, reply, _payload, done) => {
    reply.header("X-RateLimit-Window", windowSeconds);
    done();
  });

  app.log.info(
    `Rate limiting enabled with tier-based limits: Free=${env.RATE_LIMIT_FREE}, Basic=${env.RATE_LIMIT_BASIC}, Pro=${env.RATE_LIMIT_PRO}, Enterprise=${env.RATE_LIMIT_ENTERPRISE} per ${env.RATE_LIMIT_WINDOW}`
  );
}
