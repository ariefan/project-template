import type { CacheProvider } from "../types";

type MemoryEntry = {
  value: unknown;
  expiresAt: number | null;
};

/**
 * In-memory cache provider with LRU eviction
 * Uses Map for O(1) operations
 * Not shared across processes - single instance only
 */
export function createMemoryProvider(config?: {
  maxSize?: number;
}): CacheProvider {
  const maxSize = config?.maxSize ?? 1000;
  const cache = new Map<string, MemoryEntry>();
  let cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Check if entry has expired
   */
  function isExpired(entry: MemoryEntry): boolean {
    if (entry.expiresAt === null) {
      return false;
    }
    return Date.now() > entry.expiresAt;
  }

  /**
   * Remove expired entry
   */
  function removeIfExpired(key: string): boolean {
    const entry = cache.get(key);
    if (entry && isExpired(entry)) {
      cache.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  function startCleanup(): void {
    if (cleanupInterval) {
      return;
    }

    cleanupInterval = setInterval(() => {
      let _expiredCount = 0;
      for (const [key, entry] of cache.entries()) {
        if (isExpired(entry)) {
          cache.delete(key);
          _expiredCount += 1;
        }
      }

      // Stop cleanup if cache is empty
      if (cache.size === 0 && cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    }, 60_000); // Run every 60 seconds

    // Don't keep process alive just for cleanup
    cleanupInterval.unref();
  }

  /**
   * Evict oldest entry using LRU (first entry in iteration order)
   */
  function evictOldest(): void {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }

  const provider: CacheProvider = {
    name: "memory",

    get<T = unknown>(key: string): Promise<T | null> {
      removeIfExpired(key);
      const entry = cache.get(key);
      if (!entry) {
        return Promise.resolve(null);
      }
      return Promise.resolve(entry.value as T);
    },

    set<T = unknown>(
      key: string,
      value: T,
      ttlSeconds?: number
    ): Promise<void> {
      const expiresAt =
        ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;

      // Evict oldest if at max size (before adding new entry)
      if (!cache.has(key) && cache.size >= maxSize) {
        evictOldest();
      }

      cache.set(key, {
        value,
        expiresAt,
      });

      // Start cleanup when cache has entries
      if (cache.size > 0) {
        startCleanup();
      }
      return Promise.resolve();
    },

    delete(key: string): Promise<void> {
      cache.delete(key);
      return Promise.resolve();
    },

    deletePattern(pattern: string): Promise<number> {
      const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
      let count = 0;

      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key);
          count += 1;
        }
      }

      return Promise.resolve(count);
    },

    clear(): Promise<void> {
      cache.clear();
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
      return Promise.resolve();
    },

    mget<T = unknown>(keys: string[]): Promise<Map<string, T>> {
      const result = new Map<string, T>();

      for (const key of keys) {
        removeIfExpired(key);
        const entry = cache.get(key);
        if (entry) {
          result.set(key, entry.value as T);
        }
      }

      return Promise.resolve(result);
    },

    async mset<T = unknown>(
      entries: Array<{ key: string; value: T; ttlSeconds?: number }>
    ): Promise<void> {
      for (const { key, value, ttlSeconds } of entries) {
        await provider.set(key, value, ttlSeconds);
      }
    },

    ping(): Promise<boolean> {
      return Promise.resolve(true);
    },
  };

  return provider;
}
