/**
 * Job Types Routes
 *
 * Public endpoint for discovering available job types and their metadata.
 * Used by the frontend to dynamically populate job type dropdowns and forms.
 */

import type { JobTypesListResponse } from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { createMeta } from "../../../lib/response";
import { jobHandlerRegistry } from "../handlers/registry";

/**
 * Job types routes
 * Provides endpoint for listing available job types
 */
export function jobTypesRoutes(app: FastifyInstance) {
  /**
   * GET /job-types - List available job types
   *
   * Returns metadata about all registered job handlers.
   * No authentication required - this is discovery information.
   */
  app.get("/job-types", (request): JobTypesListResponse => {
    const handlers = jobHandlerRegistry.getAll();

    const jobTypes = handlers.map((h) => ({
      type: h.type,
      label: h.label ?? h.type,
      description: h.description ?? "",
      configSchema: h.configSchema,
      exampleConfig: h.exampleConfig,
    }));

    return {
      data: jobTypes,
      meta: createMeta(request.id),
    };
  });
}
