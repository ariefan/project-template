/**
 * Migration Status Routes
 *
 * Provides information about API version lifecycle and migration requirements.
 *
 * @see docs/api-guide/08-governance/05-migration.md
 * @see docs/api-guide/01-core-concepts/04-versioning.md
 */

import type { MigrationStatusResponse } from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import {
  type DeprecationConfig,
  getVersionDeprecation,
} from "../../plugins/deprecation";

/** Current API version */
const CURRENT_VERSION = "v1";

/** Base URL for migration documentation */
const DOCS_BASE_URL = "https://docs.example.com/migrations";

/**
 * Calculate days until a given date
 */
function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Build migration status response from deprecation config
 */
function buildMigrationStatus(
  version: string,
  config: DeprecationConfig | undefined
): MigrationStatusResponse {
  if (!config?.deprecated) {
    return {
      version,
      status: "current",
    };
  }

  const response: MigrationStatusResponse = {
    version,
    status:
      config.sunsetDate && new Date(config.sunsetDate) < new Date()
        ? "sunset"
        : "deprecated",
  };

  if (config.sunsetDate) {
    response.sunsetDate = config.sunsetDate;
    response.daysUntilSunset = daysUntil(config.sunsetDate);
  }

  if (config.alternative) {
    response.replacementVersion = config.alternative;
  }

  if (config.documentationUrl) {
    response.migrationGuideUrl = config.documentationUrl;
  } else if (config.alternative) {
    response.migrationGuideUrl = `${DOCS_BASE_URL}/${version}-to-${config.alternative}`;
  }

  return response;
}

export function migrationRoutes(app: FastifyInstance) {
  /**
   * GET /v1/migration/status
   *
   * Returns migration status for the current API version.
   * Includes deprecation info, sunset dates, and migration guidance.
   */
  app.get<{
    Reply: MigrationStatusResponse;
  }>("/v1/migration/status", () => {
    const deprecationConfig = getVersionDeprecation(CURRENT_VERSION);
    return buildMigrationStatus(CURRENT_VERSION, deprecationConfig);
  });
}
