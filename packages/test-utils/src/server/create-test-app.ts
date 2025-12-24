import { vi } from "vitest";
import { createUser, type MockUser } from "../factories/user";
import { createMockCache, type MockCacheProvider } from "../mocks/cache";
import { createMockDb, type MockDb } from "../mocks/db";

export type TestAppOptions = {
  /** Use mock database instead of real one */
  mockDb?: boolean;
  /** Use mock cache instead of real one */
  mockCache?: boolean;
  /** Use mock authentication (user will be logged in) */
  mockAuth?: boolean | MockUser;
};

export type TestAppContext = {
  mockDb: MockDb | null;
  mockCache: MockCacheProvider | null;
  mockUser: MockUser | null;
};

/**
 * Create a test Fastify application with mocked dependencies
 *
 * This function sets up vi.mock() calls BEFORE importing the app.
 * You should call this in a beforeAll or beforeEach hook.
 *
 * @example
 * import { createTestApp } from "@workspace/test-utils";
 *
 * describe("Posts API", () => {
 *   let app: FastifyInstance;
 *   let ctx: TestAppContext;
 *
 *   beforeAll(async () => {
 *     const result = await createTestApp({
 *       mockDb: true,
 *       mockCache: true,
 *       mockAuth: true,
 *     });
 *     app = result.app;
 *     ctx = result.context;
 *   });
 *
 *   it("should return posts", async () => {
 *     ctx.mockDb?.select.mockQueryResult([{ id: "1", title: "Test" }]);
 *
 *     const response = await app.inject({
 *       method: "GET",
 *       url: "/posts",
 *     });
 *
 *     expect(response.statusCode).toBe(200);
 *   });
 * });
 */
export function createTestApp(options: TestAppOptions = {}): {
  app: unknown; // FastifyInstance - keeping as unknown to avoid circular dep
  context: TestAppContext;
} {
  const context: TestAppContext = {
    mockDb: null,
    mockCache: null,
    mockUser: null,
  };

  // Set up mocks before importing app
  if (options.mockDb) {
    context.mockDb = createMockDb();
    vi.mock("@workspace/db", () => ({
      db: context.mockDb,
    }));
  }

  if (options.mockCache) {
    context.mockCache = createMockCache();
    vi.mock("@workspace/cache", () => ({
      createCacheProvider: () => context.mockCache,
      MemoryCacheProvider: vi.fn(() => context.mockCache),
      RedisCacheProvider: vi.fn(() => context.mockCache),
    }));
  }

  if (options.mockAuth) {
    context.mockUser =
      typeof options.mockAuth === "object" ? options.mockAuth : createUser();

    vi.mock("@workspace/auth", () => ({
      auth: {
        api: {
          getSession: vi.fn().mockResolvedValue({
            session: { id: "session_1", userId: context.mockUser?.id },
            user: context.mockUser,
          }),
        },
      },
    }));
  }

  // Import app after mocks are set up
  // Note: The actual app import should be done by the test file
  // This function just prepares the mocking context
  return {
    app: null, // Test file should import app separately
    context,
  };
}

/**
 * Helper to inject mock user into request context
 */
export function createMockAuthMiddleware(user: MockUser) {
  return vi.fn((request: unknown, _reply: unknown) => {
    (request as { user: MockUser }).user = user;
    return Promise.resolve();
  });
}
