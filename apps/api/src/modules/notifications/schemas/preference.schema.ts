import { z } from "zod";

/**
 * IANA timezone validation
 * Validates common timezone formats
 */
const timezoneSchema = z
  .string()
  .regex(
    /^[A-Z][a-z]+\/[A-Z][a-z_]+$/,
    "Must be a valid IANA timezone (e.g., America/New_York)"
  );

/**
 * Time format validation (HH:mm)
 */
const timeSchema = z
  .string()
  .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:mm format");

/**
 * Body schema for PATCH /preferences
 */
export const UpdatePreferencesBodySchema = z
  .object({
    // Channel preferences
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    telegramEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),

    // Category preferences
    marketingEnabled: z.boolean().optional(),
    transactionalEnabled: z.boolean().optional(),
    securityEnabled: z.boolean().optional(),
    systemEnabled: z.boolean().optional(),

    // Preferred contact info
    preferredEmail: z.string().email().optional(),
    preferredPhone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format")
      .optional(),
    preferredTelegramId: z.string().optional(),

    // Quiet hours
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: timeSchema.optional(),
    quietHoursEnd: timeSchema.optional(),
    quietHoursTimezone: timezoneSchema.optional(),
  })
  .refine(
    (data) => {
      // If quiet hours are enabled, all quiet hours fields must be provided
      if (data.quietHoursEnabled) {
        return Boolean(
          data.quietHoursStart && data.quietHoursEnd && data.quietHoursTimezone
        );
      }
      return true;
    },
    {
      message:
        "When quietHoursEnabled is true, quietHoursStart, quietHoursEnd, and quietHoursTimezone are required",
    }
  );

/**
 * Type export
 */
export type UpdatePreferencesBody = z.infer<typeof UpdatePreferencesBodySchema>;
