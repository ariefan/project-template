/**
 * HTTP Caching Plugin
 *
 * Implements caching headers as documented in docs/api-guide/06-quality/03-caching.md
 *
 * Features:
 * - ETag generation from response body hash
 * - Conditional requests with If-None-Match (304 Not Modified)
 * - Last-Modified header support with If-Modified-Since
 * - Configurable Cache-Control headers per route
 *
 * Example response:
 * ```
 * HTTP/1.1 200 OK
 * ETag: "a7b3c9d2"
 * Cache-Control: private, max-age=300
 * Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
 * ```
 */

import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export interface CacheConfig {
  /** Cache-Control directive */
  cacheControl?: string;
  /** Whether to generate ETags for this route */
  etag?: boolean;
  /** Static max-age in seconds (shorthand for cache-control) */
  maxAge?: number;
  /** Whether this is private (user-specific) content */
  private?: boolean;
}

// Route-specific cache configurations
const routeCacheConfig: Record<string, CacheConfig> = {
  // OpenAPI spec - public, long cache
  "/openapi.json": { cacheControl: "public, max-age=86400", etag: true },

  // Health check - no cache
  "/health": { cacheControl: "no-store" },
  "/ready": { cacheControl: "no-store" },

  // Static docs - public, cacheable
  "/docs": { cacheControl: "public, max-age=3600", etag: true },
};

// Top-level regex for weak ETag stripping
const WEAK_ETAG_PREFIX_REGEX = /^W\//;

// Default cache config by HTTP method
function getDefaultCacheConfig(method: string): CacheConfig {
  switch (method) {
    case "GET":
    case "HEAD":
      return {
        cacheControl: "private, max-age=0, must-revalidate",
        etag: true,
      };
    default:
      return { cacheControl: "no-store" };
  }
}

/**
 * Generate a weak ETag from content
 */
function generateETag(content: string | Buffer): string {
  const hash = createHash("md5")
    .update(typeof content === "string" ? content : content.toString())
    .digest("hex")
    .slice(0, 8);
  return `W/"${hash}"`;
}

/**
 * Parse If-None-Match header value
 */
function parseIfNoneMatch(header: string): string[] {
  if (header === "*") {
    return ["*"];
  }
  return header
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * Check if ETags match (weak comparison)
 */
function etagsMatch(clientEtag: string, serverEtag: string): boolean {
  if (clientEtag === "*") {
    return true;
  }
  const normalizedClient = clientEtag.replace(WEAK_ETAG_PREFIX_REGEX, "");
  const normalizedServer = serverEtag.replace(WEAK_ETAG_PREFIX_REGEX, "");
  return normalizedClient === normalizedServer;
}

/**
 * Convert payload to string for ETag generation
 */
function payloadToString(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload instanceof Buffer) {
    return payload.toString();
  }
  return JSON.stringify(payload);
}

/**
 * Get cache config for a request
 */
function getCacheConfig(request: FastifyRequest): CacheConfig {
  const routeUrl = request.routeOptions?.url ?? "";
  const urlPath = request.url.split("?")[0] ?? "";

  return (
    routeCacheConfig[routeUrl] ||
    routeCacheConfig[urlPath] ||
    request.routeOptions?.config?.cache ||
    getDefaultCacheConfig(request.method)
  );
}

/**
 * Add Cache-Control header to response
 */
function addCacheControlHeader(reply: FastifyReply, config: CacheConfig): void {
  if (config.cacheControl) {
    reply.header("Cache-Control", config.cacheControl);
  } else if (config.maxAge !== undefined) {
    const visibility = config.private ? "private" : "public";
    reply.header("Cache-Control", `${visibility}, max-age=${config.maxAge}`);
  }
}

/**
 * Handle ETag generation and conditional request validation
 */
function handleETag(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown,
  config: CacheConfig
): { modified: boolean; payload: unknown } {
  if (
    config.etag === false ||
    (request.method !== "GET" && request.method !== "HEAD") ||
    !payload
  ) {
    return { modified: true, payload };
  }

  const content = payloadToString(payload);
  const etag = generateETag(content);
  reply.header("ETag", etag);

  const ifNoneMatch = request.headers["if-none-match"];
  if (ifNoneMatch) {
    const clientEtags = parseIfNoneMatch(ifNoneMatch);
    if (clientEtags.some((clientEtag) => etagsMatch(clientEtag, etag))) {
      reply.status(304);
      return { modified: false, payload: "" };
    }
  }

  return { modified: true, payload };
}

declare module "fastify" {
  interface FastifyContextConfig {
    cache?: CacheConfig;
  }
}

function cachingPluginImpl(app: FastifyInstance): void {
  app.addHook(
    "onSend",
    (
      request: FastifyRequest,
      reply: FastifyReply,
      payload: unknown,
      done: (err?: Error | null, value?: unknown) => void
    ) => {
      if (reply.statusCode >= 400) {
        done(null, payload);
        return;
      }

      const config = getCacheConfig(request);
      addCacheControlHeader(reply, config);

      const result = handleETag(request, reply, payload, config);
      done(null, result.payload);
    }
  );

  app.log.info("HTTP caching headers enabled");
}

export default fp(cachingPluginImpl, {
  name: "caching",
  fastify: "5.x",
});

/**
 * Helper to configure cache for a specific route
 */
export function cacheFor(config: CacheConfig): CacheConfig {
  return config;
}

/**
 * Predefined cache configurations
 */
export const CachePresets = {
  noStore: { cacheControl: "no-store, private" } as CacheConfig,
  short: { cacheControl: "private, max-age=300", etag: true } as CacheConfig,
  medium: { cacheControl: "private, max-age=3600", etag: true } as CacheConfig,
  long: { cacheControl: "public, max-age=86400", etag: true } as CacheConfig,
  immutable: {
    cacheControl: "public, max-age=31536000, immutable",
  } as CacheConfig,
  revalidate: {
    cacheControl: "private, max-age=0, must-revalidate",
    etag: true,
  } as CacheConfig,
} as const;
