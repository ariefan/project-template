import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
  status: examplePostStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ExamplePostRow = typeof examplePosts.$inferSelect;
export type NewExamplePostRow = typeof examplePosts.$inferInsert;
