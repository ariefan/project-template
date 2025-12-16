import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });
  await app.register(cookie);
  await app.register(healthRoutes);
  await app.register(authRoutes);

  return app;
}
