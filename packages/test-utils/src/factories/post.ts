export interface MockPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  orgId: string;
  status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

let postCounter = 0;

/**
 * Create a mock post with realistic defaults
 *
 * @example
 * const post = createPost({ authorId: "user_1", orgId: "org_1" });
 * const published = createPost({ status: "published" });
 */
export function createPost(
  overrides: Partial<MockPost> & { authorId?: string; orgId?: string } = {}
): MockPost {
  postCounter += 1;
  const id = overrides.id ?? `post_${postCounter}`;

  return {
    id,
    title: `Test Post ${postCounter}`,
    content: `This is the content of test post ${postCounter}.`,
    authorId: overrides.authorId ?? "user_1",
    orgId: overrides.orgId ?? "org_1",
    status: "draft",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

/**
 * Reset the post counter (call in beforeEach for predictable IDs)
 */
export function resetPostCounter(): void {
  postCounter = 0;
}
