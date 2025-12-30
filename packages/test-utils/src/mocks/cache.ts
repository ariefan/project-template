import { vi } from "vitest";

export interface MockCacheProvider {
  name: string;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  deletePattern: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  mget: ReturnType<typeof vi.fn>;
  mset: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  /** Internal storage for simulating cache behavior */
  _storage: Map<string, unknown>;
  /** Helper to preset cached values */
  _preset: (key: string, value: unknown) => void;
}

/**
 * Create a mock cache provider that simulates @workspace/cache behavior
 *
 * @example
 * const mockCache = createMockCache();
 *
 * // Preset some cached values
 * mockCache._preset("user:1", { id: "1", name: "Test" });
 *
 * // In your test
 * const result = await mockCache.get("user:1");
 * expect(result).toEqual({ id: "1", name: "Test" });
 */
export function createMockCache(): MockCacheProvider {
  const storage = new Map<string, unknown>();

  const cache: MockCacheProvider = {
    name: "mock",
    _storage: storage,
    _preset: (key: string, value: unknown) => {
      storage.set(key, value);
    },

    get: vi.fn(<T>(key: string): Promise<T | null> => {
      const value = storage.get(key);
      return Promise.resolve((value as T) ?? null);
    }),

    set: vi.fn((key: string, value: unknown, _ttl?: number): Promise<void> => {
      storage.set(key, value);
      return Promise.resolve();
    }),

    delete: vi.fn(
      (key: string): Promise<boolean> => Promise.resolve(storage.delete(key))
    ),

    deletePattern: vi.fn((pattern: string): Promise<number> => {
      // Simple pattern matching for tests (supports * wildcard)
      const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
      let count = 0;
      for (const key of storage.keys()) {
        if (regex.test(key)) {
          storage.delete(key);
          count += 1;
        }
      }
      return Promise.resolve(count);
    }),

    clear: vi.fn((): Promise<void> => {
      storage.clear();
      return Promise.resolve();
    }),

    mget: vi.fn(<T>(keys: string[]): Promise<Map<string, T | null>> => {
      const result = new Map<string, T | null>();
      for (const key of keys) {
        result.set(key, (storage.get(key) as T) ?? null);
      }
      return Promise.resolve(result);
    }),

    mset: vi.fn(
      (entries: Map<string, unknown>, _ttl?: number): Promise<void> => {
        for (const [key, value] of entries) {
          storage.set(key, value);
        }
        return Promise.resolve();
      }
    ),

    ping: vi.fn((): Promise<boolean> => Promise.resolve(true)),
  };

  return cache;
}

/**
 * Reset a mock cache (clears storage and mock call history)
 */
export function resetMockCache(cache: MockCacheProvider): void {
  cache._storage.clear();
  vi.clearAllMocks();
}
