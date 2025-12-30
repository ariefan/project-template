/**
 * Deprecation Headers Plugin
 *
 * Implements deprecation notices as documented in:
 * - docs/api-guide/08-governance/04-deprecation.md
 * - docs/api-guide/01-core-concepts/04-versioning.md
 *
 * Features:
 * - Deprecation header for deprecated endpoints
 * - Sunset header with retirement date
 * - Link header pointing to migration documentation
 * - Warning messages in response body
 *
 * Example response headers:
 * ```
 * Deprecation: true
 * Sunset: Sat, 31 Dec 2024 23:59:59 GMT
 * Link: <https://docs.example.com/migrations/v1-to-v2>; rel="deprecation"
 * ```
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export interface DeprecationConfig {
  /** Whether this endpoint/version is deprecated */
  deprecated: boolean;
  /** ISO date string when the endpoint will be removed */
  sunsetDate?: string;
  /** URL to migration documentation */
  documentationUrl?: string;
  /** Alternative endpoint to use */
  alternative?: string;
  /** Custom deprecation message */
  message?: string;
}

export interface DeprecationWarning {
  code: "endpointDeprecated" | "versionDeprecated" | "fieldDeprecated";
  message: string;
  sunsetDate?: string;
  alternative?: string;
  documentationUrl?: string;
}

// Registry of deprecated routes
const deprecatedRoutes: Record<string, DeprecationConfig> = {
  // Example:
  // "/v1/legacy-endpoint": {
  //   deprecated: true,
  //   sunsetDate: "2024-12-31T23:59:59Z",
  //   documentationUrl: "https://docs.example.com/migrations/legacy",
  //   alternative: "/v2/new-endpoint",
  //   message: "This endpoint is deprecated.",
  // },
};

// Deprecated API versions
const deprecatedVersions: Record<string, DeprecationConfig> = {
  // Example:
  // "v1": {
  //   deprecated: true,
  //   sunsetDate: "2025-06-30T23:59:59Z",
  //   documentationUrl: "https://docs.example.com/migrations/v1-to-v2",
  //   alternative: "v2",
  //   message: "API v1 is deprecated. Please migrate to v2.",
  // },
};

// Top-level regex for version extraction
const VERSION_REGEX = /^\/(v\d+)\//;

/**
 * Format date as HTTP-date (RFC 7231)
 */
function formatHttpDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toUTCString();
}

/**
 * Extract API version from URL path
 */
function extractVersion(url: string): string | null {
  const match = url.match(VERSION_REGEX);
  return match?.[1] ?? null;
}

/**
 * Build deprecation warning object
 */
function buildWarning(
  config: DeprecationConfig,
  code: DeprecationWarning["code"]
): DeprecationWarning {
  return {
    code,
    message:
      config.message ??
      (config.sunsetDate
        ? `This endpoint will be sunset on ${config.sunsetDate.split("T")[0]}`
        : "This endpoint is deprecated"),
    sunsetDate: config.sunsetDate,
    alternative: config.alternative,
    documentationUrl: config.documentationUrl,
  };
}

/**
 * Add deprecation headers to response
 */
function addDeprecationHeaders(
  reply: FastifyReply,
  config: DeprecationConfig
): void {
  reply.header("Deprecation", "true");

  if (config.sunsetDate) {
    reply.header("Sunset", formatHttpDate(config.sunsetDate));
  }

  if (config.documentationUrl) {
    const existingLink = reply.getHeader("Link");
    const deprecationLink = `<${config.documentationUrl}>; rel="deprecation"`;

    if (existingLink) {
      reply.header("Link", `${existingLink}, ${deprecationLink}`);
    } else {
      reply.header("Link", deprecationLink);
    }
  }
}

/**
 * Check and apply deprecation for a request
 */
function checkDeprecation(
  request: FastifyRequest,
  reply: FastifyReply
): DeprecationWarning[] {
  const warnings: DeprecationWarning[] = [];
  const url = request.url.split("?")[0] ?? "";

  // Check route-specific deprecation
  const routeConfig =
    deprecatedRoutes[url] || request.routeOptions?.config?.deprecation;

  if (routeConfig?.deprecated) {
    addDeprecationHeaders(reply, routeConfig);
    warnings.push(buildWarning(routeConfig, "endpointDeprecated"));
  }

  // Check version deprecation
  const version = extractVersion(url);
  if (version) {
    const versionConfig = deprecatedVersions[version];
    if (versionConfig?.deprecated) {
      addDeprecationHeaders(reply, versionConfig);
      warnings.push(buildWarning(versionConfig, "versionDeprecated"));
    }
  }

  return warnings;
}

/**
 * Inject warnings into JSON payload
 */
function injectWarnings(
  payload: unknown,
  warnings: DeprecationWarning[],
  contentType: string | undefined
): unknown {
  if (!warnings.length) {
    return payload;
  }

  if (!contentType?.includes("application/json")) {
    return payload;
  }

  if (typeof payload !== "string") {
    return payload;
  }

  try {
    const parsed = JSON.parse(payload);
    parsed.warnings = warnings;
    return JSON.stringify(parsed);
  } catch {
    return payload;
  }
}

declare module "fastify" {
  interface FastifyContextConfig {
    deprecation?: DeprecationConfig;
  }

  interface FastifyReply {
    deprecationWarnings?: DeprecationWarning[];
  }
}

function deprecationPluginImpl(app: FastifyInstance): void {
  app.decorateReply("deprecationWarnings", undefined);

  app.addHook(
    "onRequest",
    (
      request: FastifyRequest,
      reply: FastifyReply,
      done: (err?: Error) => void
    ) => {
      reply.deprecationWarnings = checkDeprecation(request, reply);
      done();
    }
  );

  app.addHook(
    "onSend",
    (
      _request: FastifyRequest,
      reply: FastifyReply,
      payload: unknown,
      done: (err?: Error | null, value?: unknown) => void
    ) => {
      const warnings = reply.deprecationWarnings ?? [];
      const contentType = reply.getHeader("content-type")?.toString();
      const result = injectWarnings(payload, warnings, contentType);
      done(null, result);
    }
  );

  app.log.info("Deprecation headers plugin enabled");
}

export default fp(deprecationPluginImpl, {
  name: "deprecation",
  fastify: "5.x",
});

/**
 * Helper to mark a route as deprecated
 */
export function deprecate(
  config: Omit<DeprecationConfig, "deprecated">
): DeprecationConfig {
  return { deprecated: true, ...config };
}

/**
 * Programmatically add a deprecated route
 */
export function addDeprecatedRoute(
  route: string,
  config: DeprecationConfig
): void {
  deprecatedRoutes[route] = config;
}

/**
 * Programmatically add a deprecated API version
 */
export function addDeprecatedVersion(
  version: string,
  config: DeprecationConfig
): void {
  deprecatedVersions[version] = config;
}

/**
 * Get deprecation config for a specific version
 */
export function getVersionDeprecation(
  version: string
): DeprecationConfig | undefined {
  return deprecatedVersions[version];
}
