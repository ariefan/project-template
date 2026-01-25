import type { FastifyInstance } from "fastify";
import { getDemoAccountsHandler, seedDatabaseHandler } from "./handlers";

export function developerRoutes(app: FastifyInstance) {
  app.post(
    "/developer/database/seed",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["dev", "prod"], default: "dev" },
          },
        },
      },
    },
    seedDatabaseHandler
  );

  app.get("/developer/demo-accounts", getDemoAccountsHandler);
}
