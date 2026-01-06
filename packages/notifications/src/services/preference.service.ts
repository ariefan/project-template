import {
  db,
  eq,
  type NotificationPreference,
  notificationPreferences,
} from "@workspace/db";
import { nanoid } from "nanoid";

export type PreferenceUpdate = Partial<
  Omit<NotificationPreference, "id" | "userId" | "createdAt" | "updatedAt">
>;

export interface PreferenceService {
  getPreferences(userId: string): Promise<NotificationPreference | null>;
  upsertPreferences(
    userId: string,
    updates: PreferenceUpdate
  ): Promise<NotificationPreference>;
  isChannelEnabled(
    userId: string,
    channel: "email" | "sms" | "whatsapp" | "telegram" | "push" | "none"
  ): Promise<boolean>;
  isCategoryEnabled(
    userId: string,
    category: "transactional" | "marketing" | "security" | "system"
  ): Promise<boolean>;
}

export function createPreferenceService(): PreferenceService {
  return {
    async getPreferences(
      userId: string
    ): Promise<NotificationPreference | null> {
      const [preferences] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      return preferences ?? null;
    },

    async upsertPreferences(
      userId: string,
      updates: PreferenceUpdate
    ): Promise<NotificationPreference> {
      const existing = await this.getPreferences(userId);

      if (existing) {
        const results = await db
          .update(notificationPreferences)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(notificationPreferences.userId, userId))
          .returning();

        if (!results[0]) {
          throw new Error("Failed to update preferences");
        }
        return results[0];
      }

      const results = await db
        .insert(notificationPreferences)
        .values({
          id: nanoid(),
          userId,
          ...updates,
        })
        .returning();

      if (!results[0]) {
        throw new Error("Failed to create preferences");
      }
      return results[0];
    },

    async isChannelEnabled(
      userId: string,
      channel: "email" | "sms" | "whatsapp" | "telegram" | "push" | "none"
    ): Promise<boolean> {
      const preferences = await this.getPreferences(userId);

      if (!preferences) {
        return true;
      }

      switch (channel) {
        case "email":
          return preferences.emailEnabled;
        case "sms":
          return preferences.smsEnabled;
        case "whatsapp":
          return preferences.whatsappEnabled;
        case "telegram":
          return preferences.telegramEnabled;
        case "push":
          return preferences.pushEnabled;
        case "none":
          // In-app only notifications are always enabled (no external delivery)
          return true;
        default:
          return true;
      }
    },

    async isCategoryEnabled(
      userId: string,
      category: "transactional" | "marketing" | "security" | "system"
    ): Promise<boolean> {
      const preferences = await this.getPreferences(userId);

      if (!preferences) {
        return true;
      }

      switch (category) {
        case "marketing":
          return preferences.marketingEnabled;
        case "transactional":
          return preferences.transactionalEnabled;
        case "security":
          return preferences.securityEnabled;
        case "system":
          return true;
        default:
          return true;
      }
    },
  };
}
