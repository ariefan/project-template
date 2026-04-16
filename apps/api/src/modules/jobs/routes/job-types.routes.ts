/**
 * Job Types Routes
 *
 * Public endpoint for discovering available job types and their metadata.
 * Used by the frontend to dynamically populate job type dropdowns and forms.
 */

import type { JobTypesListResponse } from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { createMeta } from "../../../lib/response";
import { attachSession } from "../../auth/middleware";
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
   * Filters based on user role: non-admins see only 'user' category.
   */
  app.get(
    "/job-types",
    { preHandler: [attachSession] },
    (request): JobTypesListResponse => {
      const handlers = jobHandlerRegistry.getAll();
      const user = request.user;
      const isSystemAdmin = user?.role === "admin" || user?.role === "system";

      const filteredHandlers = handlers.filter((h) => {
        // System admins see everything
        if (isSystemAdmin) {
          return true;
        }

        // Standard users see only 'user' category and non-hidden jobs
        const isUserJob = !h.category || h.category === "user";
        return isUserJob && !h.hidden;
      });

      const jobTypes = filteredHandlers.map((h) => ({
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
    }
  );
}
