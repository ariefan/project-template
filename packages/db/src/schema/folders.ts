import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const folders = pgTable(
  "folders",
  {
    id: text("id").primaryKey(), // folder_abc123
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    parentId: text("parent_id"), // Self-reference

    ownerId: text("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("folders_org_id_idx").on(table.orgId),
    index("folders_parent_id_idx").on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "folders_parent_id_fk",
    }),
  ]
);

export type FolderRow = typeof folders.$inferSelect;
export type NewFolderRow = typeof folders.$inferInsert;
