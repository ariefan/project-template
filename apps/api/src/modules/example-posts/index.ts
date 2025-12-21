import type { FastifyInstance } from "fastify";
import { commentsRoutes } from "./routes/comments";
import { postsRoutes } from "./routes/posts";

export function examplePostsModule(app: FastifyInstance) {
  postsRoutes(app);
  commentsRoutes(app);
}

export * as commentsService from "./services/comments.service";
// Re-export services for cross-module communication
export * as postsService from "./services/posts.service";
