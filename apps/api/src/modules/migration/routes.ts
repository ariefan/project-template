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

/** Current API version */
const CURRENT_VERSION = "v1";

export function migrationRoutes(app: FastifyInstance) {
  /**
   * GET /v1/migration/status
   *
   * Returns migration status for the current API version.
   */
  app.get<{
    Reply: MigrationStatusResponse;
  }>("/v1/migration/status", () => {
    return {
      version: CURRENT_VERSION,
      status: "current",
    };
  });
}
