/**
 * Idempotency Plugin
 *
 * Implements idempotency for POST/PATCH operations using the Idempotency-Key header.
 * As documented in docs/api-guide/06-quality/02-idempotency.md
 *
 * Features:
 * - Accepts Idempotency-Key header on POST/PATCH requests
 * - Caches responses for 24 hours (configurable)
 * - Returns X-Idempotent-Replayed: true when replaying cached response
 * - Uses cache provider (Redis or in-memory)
 *
 * Usage:
 * POST /v1/orgs/{orgId}/payments
 * Idempotency-Key: idem_abc123xyz
 *
 * First request: 201 Created (response stored)
 * Duplicate request: 200 OK + X-Idempotent-Replayed: true (cached response)
 */

import type { CacheProvider } from "@workspace/cache";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

interface IdempotencyConfig {
  /** Cache provider for storing idempotency results */
  cacheProvider: CacheProvider;
  /** TTL in seconds (default: 86400 = 24 hours) */
  ttlSeconds?: number;
  /** Header name for idempotency key (default: "idempotency-key") */
  headerName?: string;
  /** Key prefix for cache storage (default: "idempotency:") */
  keyPrefix?: string;
}

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  createdAt: string;
}

const DEFAULT_TTL_SECONDS = 86_400; // 24 hours
const DEFAULT_HEADER_NAME = "idempotency-key";
const DEFAULT_KEY_PREFIX = "idempotency:";

// Regex for validating idempotency key format (top-level for performance)
const IDEMPOTENCY_KEY_REGEX = /^[\w-]+$/i;

/**
 * Build cache key from idempotency key and request context
 */
function buildCacheKey(
  prefix: string,
  idempotencyKey: string,
  method: string,
  url: string
): string {
  // Include method and URL to prevent key collisions across different endpoints
  return `${prefix}${idempotencyKey}:${method}:${url}`;
}

/**
 * Validate idempotency key format
 * Accept alphanumeric, underscores, hyphens (common formats: UUID, idem_xxx, custom)
 */
function isValidIdempotencyKey(key: string): boolean {
  if (key.length < 8 || key.length > 128) {
    return false;
  }
  return IDEMPOTENCY_KEY_REGEX.test(key);
}

function idempotencyPlugin(app: FastifyInstance, options: IdempotencyConfig) {
  const {
    cacheProvider,
    ttlSeconds = DEFAULT_TTL_SECONDS,
    headerName = DEFAULT_HEADER_NAME,
    keyPrefix = DEFAULT_KEY_PREFIX,
  } = options;

  // Only apply to POST and PATCH methods
  const idempotentMethods = new Set(["POST", "PATCH"]);

  app.addHook("preHandler", async (request: FastifyRequest, reply) => {
    // Skip if not an idempotent-eligible method
    if (!idempotentMethods.has(request.method)) {
      return;
    }

    // Get idempotency key from header (case-insensitive)
    const idempotencyKey = request.headers[headerName] as string | undefined;

    // If no idempotency key provided, proceed normally
    if (!idempotencyKey) {
      return;
    }

    // Validate key format
    if (!isValidIdempotencyKey(idempotencyKey)) {
      reply.status(400).send({
        error: {
          code: "invalidIdempotencyKey",
          message:
            "Idempotency key must be 8-128 characters, alphanumeric with underscores or hyphens",
          requestId: request.id,
        },
      });
      return reply;
    }

    // Build cache key
    const cacheKey = buildCacheKey(
      keyPrefix,
      idempotencyKey,
      request.method,
      request.url
    );

    // Check for cached response
    const cached = await cacheProvider.get<CachedResponse>(cacheKey);

    if (cached) {
      // Replay cached response
      app.log.info(
        { idempotencyKey, cacheKey },
        "Replaying idempotent response"
      );

      // Set cached headers
      for (const [key, value] of Object.entries(cached.headers)) {
        reply.header(key, value);
      }

      // Add replayed indicator header
      reply.header("X-Idempotent-Replayed", "true");

      // For idempotent replay, use 200 OK (as documented)
      // unless original was a client error (4xx)
      const replayStatusCode =
        cached.statusCode >= 400 ? cached.statusCode : 200;
      reply.status(replayStatusCode).send(cached.body);
      return reply;
    }

    // Store idempotency key on request for later use
    request.idempotencyKey = idempotencyKey;
    request.idempotencyCacheKey = cacheKey;
  });

  // After response is serialized, cache it if idempotency key was provided
  app.addHook(
    "onSend",
    // biome-ignore lint/suspicious/useAwait: async required for Fastify hook signature
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      const idempotencyKey = request.idempotencyKey;
      const cacheKey = request.idempotencyCacheKey;

      // Skip if no idempotency key
      if (!(idempotencyKey && cacheKey)) {
        return payload;
      }

      // Only cache successful responses (2xx) and client errors (4xx)
      // Don't cache server errors (5xx) as they should be retried
      const statusCode = reply.statusCode;
      if (statusCode >= 500) {
        return payload;
      }

      // Extract relevant headers to cache
      const headersToCache: Record<string, string> = {};
      const headersToCopy = ["content-type", "location", "x-request-id"];
      for (const header of headersToCopy) {
        const value = reply.getHeader(header);
        if (value) {
          headersToCache[header] = String(value);
        }
      }

      // Parse payload if it's a string
      let body: unknown = payload;
      if (typeof payload === "string") {
        try {
          body = JSON.parse(payload);
        } catch {
          body = payload;
        }
      }

      const cachedResponse: CachedResponse = {
        statusCode,
        headers: headersToCache,
        body,
        createdAt: new Date().toISOString(),
      };

      // Store in cache (don't await to avoid blocking response)
      cacheProvider
        .set(cacheKey, cachedResponse, ttlSeconds)
        .catch((error: unknown) => {
          app.log.warn(
            { err: error, cacheKey },
            "Failed to cache idempotency response"
          );
        });

      return payload;
    }
  );

  app.log.info(
    `Idempotency plugin enabled (TTL: ${ttlSeconds}s, header: ${headerName})`
  );
}

// Extend FastifyRequest type (module augmentation requires interface)
declare module "fastify" {
  interface FastifyRequest {
    idempotencyKey?: string;
    idempotencyCacheKey?: string;
  }
}

export default fp(idempotencyPlugin, {
  name: "idempotency",
  fastify: "5.x",
});

export { idempotencyPlugin, type IdempotencyConfig };
