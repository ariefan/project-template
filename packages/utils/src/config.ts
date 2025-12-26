/**
 * DEV-ONLY SERVICE TOPOLOGY
 *
 * ⚠️ THIS IS FOR LOCAL DEVELOPMENT ONLY
 *
 * Defines:
 * - Local development ports
 * - Development URLs (localhost)
 * - Caddy vs direct mode switching
 *
 * ❌ NOT for production configuration
 * ❌ NOT for runtime secrets
 * ❌ NOT for environment-specific domains
 *
 * Production environments MUST provide explicit configuration via env vars.
 * These defaults should NEVER be used in production.
 */

/**
 * Service ports configuration - SINGLE SOURCE OF TRUTH
 *
 * These ports are used across all apps and should not be hardcoded elsewhere.
 */
export const PORTS = {
  /** Web app (Next.js) */
  WEB: 3000,
  /** API server (Fastify) */
  API: 3001,
  /** PostgreSQL database */
  DATABASE: 5432,
  /** Redis cache */
  REDIS: 6379,
} as const;

/**
 * URL generation modes
 */
export type UrlMode = "direct" | "caddy";

/**
 * URL builder configuration
 */
export type UrlConfig = {
  /** Mode: direct (individual ports) or caddy (reverse proxy) */
  mode: UrlMode;
  /** Protocol (http or https) */
  protocol?: "http" | "https";
  /** Host (default: localhost) */
  host?: string;
};

/**
 * Generate service URLs based on configuration mode
 *
 * @example
 * ```ts
 * // Direct mode (default)
 * const urls = createServiceUrls({ mode: "direct" });
 * // { WEB: "http://localhost:3000", API: "http://localhost:3001", ... }
 *
 * // Caddy mode (reverse proxy)
 * const urls = createServiceUrls({ mode: "caddy" });
 * // { WEB: "https://localhost", API: "https://localhost", ... }
 * ```
 */
export function createServiceUrls(config: UrlConfig = { mode: "direct" }) {
  const { mode, protocol = "http", host = "localhost" } = config;

  if (mode === "caddy") {
    // Caddy mode: everything behind https://localhost
    return {
      WEB: "https://localhost",
      API: "https://localhost",
      DATABASE: `postgresql://${host}:${PORTS.DATABASE}`,
      REDIS: `redis://${host}:${PORTS.REDIS}`,
    } as const;
  }

  // Direct mode: each service on its own port
  return {
    WEB: `${protocol}://${host}:${PORTS.WEB}`,
    API: `${protocol}://${host}:${PORTS.API}`,
    DATABASE: `postgresql://${host}:${PORTS.DATABASE}`,
    REDIS: `redis://${host}:${PORTS.REDIS}`,
  } as const;
}

/**
 * Default URLs for development (direct mode)
 *
 * Use these as defaults in environment schemas.
 */
export const DEFAULT_URLS = createServiceUrls({ mode: "direct" });
