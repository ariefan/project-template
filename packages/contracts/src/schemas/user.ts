import { z } from "zod";
import { idSchema, timestampsSchema } from "./common.js";

// User schema
export const userSchema = z
  .object({
    id: idSchema,
    email: z.string().email(),
    name: z.string().min(1).max(100),
    role: z.enum(["user", "admin"]).default("user"),
  })
  .merge(timestampsSchema);

export type User = z.infer<typeof userSchema>;

// Create user input
export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Update user input
export const updateUserSchema = createUserSchema.partial();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
