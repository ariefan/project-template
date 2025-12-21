import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { examplePosts } from "./example-posts";

export const exampleComments = pgTable("example_comments", {
  id: text("id").primaryKey(), // format: cmt_{randomString}
  orgId: text("org_id").notNull(),
  postId: text("post_id")
    .notNull()
    .references(() => examplePosts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ExampleCommentRow = typeof exampleComments.$inferSelect;
export type NewExampleCommentRow = typeof exampleComments.$inferInsert;
