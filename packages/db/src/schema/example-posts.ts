import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { files } from "./files";

export const examplePostStatusEnum = pgEnum("example_post_status", [
  "draft",
  "published",
  "archived",
]);

export const examplePosts = pgTable("example_posts", {
  id: text("id").primaryKey(), // format: post_{randomString}
  orgId: text("org_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(),

  // Demo inputs
  category: text("category"),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  publishDate: timestamp("publish_date"),

  // Single file relations
  coverImageId: text("cover_image_id").references(() => files.id),
  attachmentFileId: text("attachment_file_id").references(() => files.id),

  status: examplePostStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const examplePostFiles = pgTable("example_post_files", {
  id: text("id").primaryKey(), // format: post_file_{randomString}
  postId: text("post_id")
    .notNull()
    .references(() => examplePosts.id, { onDelete: "cascade" }),
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  field: text("field").notNull(), // 'gallery' | 'document'
  sortOrder: integer("sort_order").default(0).notNull(),
});

export type ExamplePostRow = typeof examplePosts.$inferSelect;
export type NewExamplePostRow = typeof examplePosts.$inferInsert;
export type ExamplePostFileRow = typeof examplePostFiles.$inferSelect;
export type NewExamplePostFileRow = typeof examplePostFiles.$inferInsert;
