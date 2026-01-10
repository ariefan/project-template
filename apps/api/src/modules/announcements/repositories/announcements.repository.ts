import { db } from "@workspace/db";
import {
  type AnnouncementInteractionRow,
  type AnnouncementPriority,
  type AnnouncementRow,
  type AnnouncementScope,
  announcementInteractions,
  announcements,
  type NewAnnouncementInteractionRow,
  type NewAnnouncementRow,
} from "@workspace/db/schema";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

// ============ TYPES ============

export interface ListAnnouncementsOptions {
  page?: number;
  pageSize?: number;
  priority?: AnnouncementPriority;
  scope?: AnnouncementScope;
  includeExpired?: boolean;
  includeInactive?: boolean;
  orderBy?: string;
}

export interface ListAnnouncementsResult {
  data: AnnouncementRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface AnnouncementWithInteraction extends AnnouncementRow {
  interaction?: AnnouncementInteractionRow;
}

// ============ ANNOUNCEMENTS CRUD ============

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  data: NewAnnouncementRow
): Promise<AnnouncementRow> {
  const [announcement] = await db
    .insert(announcements)
    .values(data)
    .returning();

  if (!announcement) {
    throw new Error("Failed to create announcement");
  }

  return announcement;
}

/**
 * Get announcement by ID
 */
export async function getAnnouncementById(
  announcementId: string,
  orgId?: string
): Promise<AnnouncementRow | null> {
  const conditions: SQL[] = [
    eq(announcements.id, announcementId),
    isNull(announcements.deletedAt),
  ];

  if (orgId) {
    const orCondition = or(
      eq(announcements.orgId, orgId),
      isNull(announcements.orgId)
    );
    if (orCondition) {
      conditions.push(orCondition);
    }
  }

  const [announcement] = await db
    .select()
    .from(announcements)
    .where(and(...conditions))
    .limit(1);

  return announcement ?? null;
}

/**
 * Get announcement with user interaction
 */
export async function getAnnouncementWithInteraction(
  announcementId: string,
  userId: string,
  orgId?: string
): Promise<AnnouncementWithInteraction | null> {
  const conditions: SQL[] = [
    eq(announcements.id, announcementId),
    isNull(announcements.deletedAt),
  ];

  if (orgId) {
    const orCondition = or(
      eq(announcements.orgId, orgId),
      isNull(announcements.orgId)
    );
    if (orCondition) {
      conditions.push(orCondition);
    }
  }

  const result = await db
    .select()
    .from(announcements)
    .leftJoin(
      announcementInteractions,
      and(
        eq(announcementInteractions.announcementId, announcements.id),
        eq(announcementInteractions.userId, userId)
      )
    )
    .where(and(...conditions))
    .limit(1);

  if (!(result.length && result[0]?.announcements)) {
    return null;
  }

  return {
    ...result[0].announcements,
    interaction: result[0].announcement_interactions ?? undefined,
  };
}

/**
 * List announcements with pagination and filtering
 */
export async function listAnnouncements(
  orgId: string,
  options: ListAnnouncementsOptions = {}
): Promise<ListAnnouncementsResult> {
  const {
    page = 1,
    pageSize = 20,
    priority,
    scope,
    includeExpired = false,
    includeInactive = false,
    orderBy = "-publishAt",
  } = options;

  // Build where conditions
  const baseConditions: (SQL | undefined)[] = [
    or(eq(announcements.orgId, orgId), isNull(announcements.orgId)),
    isNull(announcements.deletedAt),
  ];

  if (priority) {
    baseConditions.push(eq(announcements.priority, priority));
  }

  if (scope) {
    baseConditions.push(eq(announcements.scope, scope));
  }

  if (!includeExpired) {
    baseConditions.push(
      or(
        isNull(announcements.expiresAt),
        gte(announcements.expiresAt, new Date())
      )
    );
  }

  if (!includeInactive) {
    baseConditions.push(eq(announcements.isActive, true));
  }

  // Only show published announcements
  baseConditions.push(lte(announcements.publishAt, new Date()));

  const conditions: SQL[] = baseConditions.filter(
    (c): c is SQL => c !== undefined
  );

  const whereClause = and(...conditions);

  // Get total count
  const allAnnouncements = await db
    .select()
    .from(announcements)
    .where(whereClause);
  const totalCount = allAnnouncements.length;

  // Determine sort order
  const isDescending = orderBy.startsWith("-");
  const fieldName = isDescending ? orderBy.slice(1) : orderBy;
  // biome-ignore lint/suspicious/noExplicitAny: orderBy field needs dynamic access
  const field: any =
    announcements[fieldName as keyof typeof announcements] ??
    announcements.publishAt;
  const orderColumn = isDescending ? desc(field) : field;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const data = await db
    .select()
    .from(announcements)
    .where(whereClause)
    .orderBy(orderColumn)
    .limit(pageSize)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * List announcements with user interactions
 */
export async function listAnnouncementsWithInteractions(
  orgId: string,
  userId: string,
  options: ListAnnouncementsOptions = {}
): Promise<{
  data: AnnouncementWithInteraction[];
  pagination: ListAnnouncementsResult["pagination"];
}> {
  const {
    page = 1,
    pageSize = 20,
    priority,
    scope,
    includeExpired = false,
    includeInactive = false,
    orderBy = "-publishAt",
  } = options;

  // Build where conditions
  const baseConditions: (SQL | undefined)[] = [
    or(eq(announcements.orgId, orgId), isNull(announcements.orgId)),
    isNull(announcements.deletedAt),
  ];

  if (priority) {
    baseConditions.push(eq(announcements.priority, priority));
  }

  if (scope) {
    baseConditions.push(eq(announcements.scope, scope));
  }

  // Only show non-expired announcements (unless includeExpired is true)
  if (!includeExpired) {
    baseConditions.push(
      or(
        isNull(announcements.expiresAt),
        gte(announcements.expiresAt, new Date())
      )
    );
  }

  // Only show active announcements (unless includeInactive is true)
  if (!includeInactive) {
    baseConditions.push(eq(announcements.isActive, true));
  }

  // Only show published announcements (always applied)
  baseConditions.push(lte(announcements.publishAt, new Date()));

  const conditions: SQL[] = baseConditions.filter(
    (c): c is SQL => c !== undefined
  );

  const whereClause = and(...conditions);

  // Get total count
  const countResult = await db.select().from(announcements).where(whereClause);
  const totalCount = countResult.length;

  // Determine sort order
  const isDescending = orderBy.startsWith("-");
  const fieldName = isDescending ? orderBy.slice(1) : orderBy;
  // biome-ignore lint/suspicious/noExplicitAny: orderBy field needs dynamic access
  const field: any =
    announcements[fieldName as keyof typeof announcements] ??
    announcements.publishAt;
  const orderColumn = isDescending ? desc(field) : field;

  // Get paginated results with interactions
  const offset = (page - 1) * pageSize;
  const results = await db
    .select()
    .from(announcements)
    .leftJoin(
      announcementInteractions,
      and(
        eq(announcementInteractions.announcementId, announcements.id),
        eq(announcementInteractions.userId, userId)
      )
    )
    .where(whereClause)
    .orderBy(orderColumn)
    .limit(pageSize)
    .offset(offset);

  const data = results.map((row) => ({
    ...row.announcements,
    interaction: row.announcement_interactions ?? undefined,
  }));

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Update announcement
 */
export async function updateAnnouncement(
  announcementId: string,
  data: Partial<NewAnnouncementRow>
): Promise<AnnouncementRow | null> {
  const [updated] = await db
    .update(announcements)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(announcements.id, announcementId), isNull(announcements.deletedAt))
    )
    .returning();

  return updated ?? null;
}

/**
 * Soft delete announcement
 */
export async function deleteAnnouncement(
  announcementId: string
): Promise<AnnouncementRow | null> {
  const [deleted] = await db
    .update(announcements)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(announcements.id, announcementId))
    .returning();

  return deleted ?? null;
}

/**
 * Increment view count
 */
export async function incrementViewCount(
  announcementId: string
): Promise<void> {
  await db
    .update(announcements)
    .set({ viewCount: sql`${announcements.viewCount} + 1` })
    .where(eq(announcements.id, announcementId));
}

/**
 * Increment read count
 */
export async function incrementReadCount(
  announcementId: string
): Promise<void> {
  await db
    .update(announcements)
    .set({ readCount: sql`${announcements.readCount} + 1` })
    .where(eq(announcements.id, announcementId));
}

/**
 * Increment acknowledge count
 */
export async function incrementAcknowledgeCount(
  announcementId: string
): Promise<void> {
  await db
    .update(announcements)
    .set({ acknowledgeCount: sql`${announcements.acknowledgeCount} + 1` })
    .where(eq(announcements.id, announcementId));
}

/**
 * Increment dismiss count
 */
export async function incrementDismissCount(
  announcementId: string
): Promise<void> {
  await db
    .update(announcements)
    .set({ dismissCount: sql`${announcements.dismissCount} + 1` })
    .where(eq(announcements.id, announcementId));
}

// ============ INTERACTIONS ============

/**
 * Get or create interaction record
 */
export async function getOrCreateInteraction(
  announcementId: string,
  userId: string
): Promise<AnnouncementInteractionRow> {
  // Try to get existing interaction
  const [existing] = await db
    .select()
    .from(announcementInteractions)
    .where(
      and(
        eq(announcementInteractions.announcementId, announcementId),
        eq(announcementInteractions.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  // Create new interaction
  const newInteraction: NewAnnouncementInteractionRow = {
    id: `anint_${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`,
    announcementId,
    userId,
  };

  const [created] = await db
    .insert(announcementInteractions)
    .values(newInteraction)
    .returning();

  if (!created) {
    throw new Error("Failed to create announcement interaction");
  }

  return created;
}

/**
 * Mark announcement as viewed
 */
export async function markAsViewed(
  announcementId: string,
  userId: string
): Promise<AnnouncementInteractionRow> {
  const interaction = await getOrCreateInteraction(announcementId, userId);

  if (interaction.viewedAt) {
    return interaction; // Already viewed
  }

  const [updated] = await db
    .update(announcementInteractions)
    .set({ viewedAt: new Date(), updatedAt: new Date() })
    .where(eq(announcementInteractions.id, interaction.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to mark announcement as viewed");
  }

  // Increment announcement view count
  await incrementViewCount(announcementId);

  return updated;
}

/**
 * Mark announcement as read
 */
export async function markAsRead(
  announcementId: string,
  userId: string
): Promise<AnnouncementInteractionRow> {
  const interaction = await getOrCreateInteraction(announcementId, userId);

  const updates: Partial<NewAnnouncementInteractionRow> = {
    readAt: new Date(),
    updatedAt: new Date(),
  };

  // Also mark as viewed if not already
  if (!interaction.viewedAt) {
    updates.viewedAt = new Date();
    await incrementViewCount(announcementId);
  }

  const [updated] = await db
    .update(announcementInteractions)
    .set(updates)
    .where(eq(announcementInteractions.id, interaction.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to mark announcement as read");
  }

  // Increment read count if this is the first read
  if (!interaction.readAt) {
    await incrementReadCount(announcementId);
  }

  return updated;
}

/**
 * Mark announcement as dismissed
 */
export async function markAsDismissed(
  announcementId: string,
  userId: string
): Promise<AnnouncementInteractionRow> {
  const interaction = await getOrCreateInteraction(announcementId, userId);

  const updates: Partial<NewAnnouncementInteractionRow> = {
    dismissedAt: new Date(),
    updatedAt: new Date(),
  };

  // Also mark as viewed if not already
  if (!interaction.viewedAt) {
    updates.viewedAt = new Date();
    await incrementViewCount(announcementId);
  }

  const [updated] = await db
    .update(announcementInteractions)
    .set(updates)
    .where(eq(announcementInteractions.id, interaction.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to mark announcement as dismissed");
  }

  // Increment dismiss count if this is the first dismissal
  if (!interaction.dismissedAt) {
    await incrementDismissCount(announcementId);
  }

  return updated;
}

/**
 * Mark announcement as acknowledged
 */
export async function markAsAcknowledged(
  announcementId: string,
  userId: string
): Promise<AnnouncementInteractionRow> {
  const interaction = await getOrCreateInteraction(announcementId, userId);

  const updates: Partial<NewAnnouncementInteractionRow> = {
    acknowledgedAt: new Date(),
    updatedAt: new Date(),
  };

  // Also mark as viewed and read if not already
  if (!interaction.viewedAt) {
    updates.viewedAt = new Date();
    await incrementViewCount(announcementId);
  }
  if (!interaction.readAt) {
    updates.readAt = new Date();
    await incrementReadCount(announcementId);
  }

  const [updated] = await db
    .update(announcementInteractions)
    .set(updates)
    .where(eq(announcementInteractions.id, interaction.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to mark announcement as acknowledged");
  }

  // Increment acknowledge count if this is the first acknowledgment
  if (!interaction.acknowledgedAt) {
    await incrementAcknowledgeCount(announcementId);
  }

  return updated;
}

/**
 * Get unread announcement count for user
 */
export async function getUnreadCount(
  orgId: string,
  userId: string
): Promise<{ unreadCount: number; criticalCount: number }> {
  const now = new Date();

  // Get active, published, non-expired announcements
  const activeAnnouncements = await db
    .select()
    .from(announcements)
    .leftJoin(
      announcementInteractions,
      and(
        eq(announcementInteractions.announcementId, announcements.id),
        eq(announcementInteractions.userId, userId)
      )
    )
    .where(
      and(
        or(eq(announcements.orgId, orgId), isNull(announcements.orgId)),
        isNull(announcements.deletedAt),
        eq(announcements.isActive, true),
        lte(announcements.publishAt, now),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now)),
        isNull(announcementInteractions.dismissedAt)
      )
    );

  let unreadCount = 0;
  let criticalCount = 0;

  for (const row of activeAnnouncements) {
    const isRead = row.announcement_interactions?.readAt !== null;
    const isAcknowledged =
      row.announcement_interactions?.acknowledgedAt !== null;

    if (!isRead) {
      unreadCount++;
    }

    if (row.announcements.priority === "critical" && !isAcknowledged) {
      criticalCount++;
    }
  }

  return { unreadCount, criticalCount };
}
