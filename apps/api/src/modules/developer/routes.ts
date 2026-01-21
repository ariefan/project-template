import type { FastifyInstance } from "fastify";
import { seedDatabaseHandler } from "./handlers";

export async function developerRoutes(app: FastifyInstance) {
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
		seedDatabaseHandler,
	);
}
