import type { NewAnnouncementRow } from "@workspace/db/schema";
import { NotFoundError } from "../../../lib/errors";
import * as repository from "../repositories/announcements.repository";

// ============ TYPES ============

export interface CreateAnnouncementInput {
  orgId?: string;
  title: string;
  content: string;
  priority?: "info" | "warning" | "critical" | "success";
  scope?: "system" | "organization";
  targetRoles?: string[];
  isDismissible?: boolean;
  publishAt?: Date;
  expiresAt?: Date;
  isActive?: boolean;
  createdBy: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  priority?: "info" | "warning" | "critical" | "success";
  targetRoles?: string[];
  isDismissible?: boolean;
  publishAt?: Date;
  expiresAt?: Date;
  isActive?: boolean;
}

export interface ListAnnouncementsInput {
  page?: number;
  pageSize?: number;
  priority?: "info" | "warning" | "critical" | "success";
  scope?: "system" | "organization";
  readStatus?: "read" | "unread";
  dismissedStatus?: "dismissed" | "not-dismissed";
  includeExpired?: boolean;
  includeInactive?: boolean;
  orderBy?: string;
}

// ============ CRUD OPERATIONS ============

/**
 * Create a new announcement
 */
export async function createAnnouncement(input: CreateAnnouncementInput) {
  const announcementId = `ann_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;

  const data: NewAnnouncementRow = {
    id: announcementId,
    orgId: input.orgId ?? null,
    title: input.title,
    content: input.content,
    priority: input.priority ?? "info",
    scope: input.scope ?? "organization",
    targetRoles: input.targetRoles ?? [],
    isDismissible: input.isDismissible ?? true,
    isActive: input.isActive ?? true,
    publishAt: input.publishAt ?? new Date(),
    expiresAt: input.expiresAt ?? null,
    createdBy: input.createdBy,
  };

  return await repository.createAnnouncement(data);
}

/**
 * Get announcement by ID
 */
export async function getAnnouncement(announcementId: string, orgId?: string) {
  const announcement = await repository.getAnnouncementById(
    announcementId,
    orgId
  );

  if (!announcement) {
    throw new NotFoundError("Announcement not found");
  }

  return announcement;
}

/**
 * Get announcement with user interaction
 */
export async function getAnnouncementWithInteraction(
  announcementId: string,
  userId: string,
  orgId?: string
) {
  const announcement = await repository.getAnnouncementWithInteraction(
    announcementId,
    userId,
    orgId
  );

  if (!announcement) {
    throw new NotFoundError("Announcement not found");
  }

  return announcement;
}

/**
 * List announcements for organization
 */
export async function listAnnouncements(
  orgId: string,
  input: ListAnnouncementsInput = {}
) {
  const options: repository.ListAnnouncementsOptions = {
    page: input.page,
    pageSize: Math.min(input.pageSize ?? 20, 100), // Cap at 100
    priority: input.priority,
    scope: input.scope,
    includeExpired: input.includeExpired ?? false,
    includeInactive: input.includeInactive ?? false,
    orderBy: input.orderBy,
  };

  return await repository.listAnnouncements(orgId, options);
}

/**
 * List announcements with user interactions
 */
export async function listAnnouncementsWithInteractions(
  orgId: string,
  userId: string,
  input: ListAnnouncementsInput = {}
) {
  const options: repository.ListAnnouncementsOptions = {
    page: input.page,
    pageSize: Math.min(input.pageSize ?? 20, 100),
    priority: input.priority,
    scope: input.scope,
    includeExpired: input.includeExpired ?? false,
    includeInactive: input.includeInactive ?? false,
    orderBy: input.orderBy,
  };

  let results = await repository.listAnnouncementsWithInteractions(
    orgId,
    userId,
    options
  );

  // Filter by read status if requested
  if (input.readStatus) {
    const isReadFilter = input.readStatus === "read";
    results = {
      ...results,
      data: results.data.filter((ann) => {
        const isRead = ann.interaction?.readAt !== null;
        return isRead === isReadFilter;
      }),
    };
    // Adjust pagination counts after filtering
    results.pagination.totalCount = results.data.length;
    results.pagination.totalPages = Math.ceil(
      results.pagination.totalCount / results.pagination.pageSize
    );
    results.pagination.hasNext =
      results.pagination.page < results.pagination.totalPages;
  }

  // Filter by dismissed status if requested
  if (input.dismissedStatus) {
    const isDismissedFilter = input.dismissedStatus === "dismissed";
    results = {
      ...results,
      data: results.data.filter((ann) => {
        const isDismissed = ann.interaction?.dismissedAt !== null;
        return isDismissed === isDismissedFilter;
      }),
    };
    // Adjust pagination counts after filtering
    results.pagination.totalCount = results.data.length;
    results.pagination.totalPages = Math.ceil(
      results.pagination.totalCount / results.pagination.pageSize
    );
    results.pagination.hasNext =
      results.pagination.page < results.pagination.totalPages;
  }

  return results;
}

/**
 * Update announcement
 */
export async function updateAnnouncement(
  announcementId: string,
  orgId: string,
  input: UpdateAnnouncementInput
) {
  // Verify announcement exists and belongs to org
  await getAnnouncement(announcementId, orgId);

  const updates: Partial<NewAnnouncementRow> = {};

  if (input.title !== undefined) {
    updates.title = input.title;
  }
  if (input.content !== undefined) {
    updates.content = input.content;
  }
  if (input.priority !== undefined) {
    updates.priority = input.priority;
  }
  if (input.targetRoles !== undefined) {
    updates.targetRoles = input.targetRoles;
  }
  if (input.isDismissible !== undefined) {
    updates.isDismissible = input.isDismissible;
  }
  if (input.publishAt !== undefined) {
    updates.publishAt = input.publishAt;
  }
  if (input.expiresAt !== undefined) {
    updates.expiresAt = input.expiresAt;
  }
  if (input.isActive !== undefined) {
    updates.isActive = input.isActive;
  }

  const updated = await repository.updateAnnouncement(announcementId, updates);

  if (!updated) {
    throw new NotFoundError("Announcement not found");
  }

  return updated;
}

/**
 * Delete announcement (soft delete)
 */
export async function deleteAnnouncement(
  announcementId: string,
  orgId: string
) {
  // Verify announcement exists and belongs to org
  await getAnnouncement(announcementId, orgId);

  const deleted = await repository.deleteAnnouncement(announcementId);

  if (!deleted) {
    throw new NotFoundError("Announcement not found");
  }

  return deleted;
}

/**
 * Check if user is the owner of the announcement
 */
export async function getAnnouncementOwnerId(
  announcementId: string,
  orgId: string
): Promise<string> {
  const announcement = await getAnnouncement(announcementId, orgId);
  return announcement.createdBy;
}

// ============ INTERACTION OPERATIONS ============

/**
 * Mark announcement as viewed
 */
export async function markAnnouncementAsViewed(
  announcementId: string,
  userId: string,
  orgId: string
) {
  // Verify announcement exists
  await getAnnouncement(announcementId, orgId);

  return await repository.markAsViewed(announcementId, userId);
}

/**
 * Mark announcement as read
 */
export async function markAnnouncementAsRead(
  announcementId: string,
  userId: string,
  orgId: string
) {
  // Verify announcement exists
  await getAnnouncement(announcementId, orgId);

  return await repository.markAsRead(announcementId, userId);
}

/**
 * Dismiss announcement
 */
export async function dismissAnnouncement(
  announcementId: string,
  userId: string,
  orgId: string
) {
  // Verify announcement exists and is dismissible
  const announcement = await getAnnouncement(announcementId, orgId);

  if (!announcement.isDismissible) {
    throw new Error("This announcement cannot be dismissed");
  }

  return await repository.markAsDismissed(announcementId, userId);
}

/**
 * Acknowledge critical announcement
 */
export async function acknowledgeAnnouncement(
  announcementId: string,
  userId: string,
  orgId: string
) {
  // Verify announcement exists and is critical
  const announcement = await getAnnouncement(announcementId, orgId);

  if (announcement.priority !== "critical") {
    throw new Error("Only critical announcements can be acknowledged");
  }

  return await repository.markAsAcknowledged(announcementId, userId);
}

/**
 * Get unread announcement count for user
 */
export async function getUnreadAnnouncementCount(
  orgId: string,
  userId: string
) {
  return await repository.getUnreadCount(orgId, userId);
}

/**
 * Get announcement statistics
 */
export async function getAnnouncementStats(
  announcementId: string,
  orgId: string
) {
  const announcement = await getAnnouncement(announcementId, orgId);

  const viewRate =
    announcement.viewCount > 0
      ? (announcement.viewCount / announcement.viewCount) * 100
      : 0;

  const readRate =
    announcement.viewCount > 0
      ? (announcement.readCount / announcement.viewCount) * 100
      : 0;

  const acknowledgeRate =
    announcement.priority === "critical" && announcement.viewCount > 0
      ? (announcement.acknowledgeCount / announcement.viewCount) * 100
      : 0;

  return {
    viewCount: announcement.viewCount,
    readCount: announcement.readCount,
    acknowledgeCount: announcement.acknowledgeCount,
    dismissCount: announcement.dismissCount,
    viewRate,
    readRate,
    acknowledgeRate,
  };
}
