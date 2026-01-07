import type { FastifyInstance } from "fastify";
import { announcementsRoutes } from "./routes/announcements.routes";

/**
 * Announcements Module
 *
 * Provides system and organization announcements with:
 * - CRUD operations for announcements (admin only)
 * - User interaction tracking (view, read, dismiss, acknowledge)
 * - Role-based targeting
 * - Scheduled publishing and expiration
 * - Priority levels (info, warning, critical)
 * - Analytics (view rate, read rate, acknowledgment rate)
 */
export function announcementsModule(app: FastifyInstance) {
  announcementsRoutes(app);
}

// Re-export service and repository for use by other modules
export * as announcementsRepository from "./repositories/announcements.repository";
export * as announcementsService from "./services/announcements.service";
