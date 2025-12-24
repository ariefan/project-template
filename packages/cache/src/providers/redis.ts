import Redis from "ioredis";
import type { CacheProvider } from "../types";

/**
 * Redis cache provider
 * Shared across processes and instances
 * Requires Redis server to be running
 */
export function createRedisProvider(config: {
  url: string;
  keyPrefix?: string;
}): CacheProvider {
  const redis = new Redis(config.url, {
    lazyConnect: true,
    keyPrefix: config.keyPrefix ?? "cache:",
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  const provider: CacheProvider = {
    name: "redis",

    async get<T = unknown>(key: string): Promise<T | null> {
      try {
        const value = await redis.get(key);
        if (!value) {
          return null;
        }
        return JSON.parse(value) as T;
      } catch (error) {
        // Log but don't throw - allow graceful degradation
        console.error("Cache get error:", error);
        return null;
      }
    },

    async set<T = unknown>(
      key: string,
      value: T,
      ttlSeconds?: number
    ): Promise<void> {
      try {
        const serialized = JSON.stringify(value);

        if (ttlSeconds !== undefined) {
          await redis.setex(key, ttlSeconds, serialized);
        } else {
          await redis.set(key, serialized);
        }
      } catch (error) {
        // Log but don't throw - allow graceful degradation
        console.error("Cache set error:", error);
      }
    },

    async delete(key: string): Promise<void> {
      try {
        await redis.del(key);
      } catch (error) {
        console.error("Cache delete error:", error);
      }
    },

    async deletePattern(pattern: string): Promise<number> {
      try {
        // Use SCAN instead of KEYS for better performance on large datasets
        let count = 0;
        let cursor = "0";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          // Convert pattern to glob format for SCAN MATCH
          // Pattern: "authz:user123:*" becomes "authz:user123:*"
          // eslint-disable-next-line no-await-in-loop
          const [newCursor, keys] = await redis.scan(
            cursor,
            "MATCH",
            pattern,
            "COUNT",
            100
          );

          if (keys.length > 0) {
            // eslint-disable-next-line no-await-in-loop
            count += await redis.del(...keys);
          }

          cursor = newCursor;
          if (cursor === "0") {
            break;
          }
        }

        return count;
      } catch (error) {
        console.error("Cache deletePattern error:", error);
        return 0;
      }
    },

    async clear(): Promise<void> {
      try {
        // Only clear keys with our prefix using SCAN
        let cursor = "0";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const [newCursor, keys] = await redis.scan(cursor, "COUNT", 1000);

          if (keys.length > 0) {
            // eslint-disable-next-line no-await-in-loop
            await redis.del(...keys);
          }

          cursor = newCursor;
          if (cursor === "0") {
            break;
          }
        }
      } catch (error) {
        console.error("Cache clear error:", error);
      }
    },

    async mget<T = unknown>(keys: string[]): Promise<Map<string, T>> {
      try {
        if (keys.length === 0) {
          return new Map();
        }

        const values = await redis.mget(...keys);
        const result = new Map<string, T>();

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = values[i];
          if (value && key) {
            result.set(key, JSON.parse(value) as T);
          }
        }

        return result;
      } catch (error) {
        console.error("Cache mget error:", error);
        return new Map();
      }
    },

    async mset<T = unknown>(
      entries: Array<{ key: string; value: T; ttlSeconds?: number }>
    ): Promise<void> {
      try {
        if (entries.length === 0) {
          return;
        }

        // Group by TTL for efficient execution
        const withoutTTL: Array<string | number> = [];
        const withTTL: Array<{
          key: string;
          value: T;
          ttlSeconds: number;
        }> = [];

        for (const entry of entries) {
          if (entry.ttlSeconds === undefined) {
            withoutTTL.push(entry.key);
            withoutTTL.push(JSON.stringify(entry.value));
          } else {
            withTTL.push(entry as (typeof withTTL)[0]);
          }
        }

        // Set without TTL using MSET
        if (withoutTTL.length > 0) {
          await redis.mset(...withoutTTL);
        }

        // Set with TTL using MULTI/EXEC for atomicity
        if (withTTL.length > 0) {
          const pipeline = redis.pipeline();

          for (const { key, value, ttlSeconds } of withTTL) {
            pipeline.setex(key, ttlSeconds, JSON.stringify(value));
          }

          // eslint-disable-next-line no-await-in-loop
          await pipeline.exec();
        }
      } catch (error) {
        console.error("Cache mset error:", error);
      }
    },

    async ping(): Promise<boolean> {
      try {
        if (redis.status === "connecting" || redis.status === "reconnecting") {
          // Wait for connection
          await redis.ping();
        } else if (redis.status === "ready") {
          // Already connected
          return true;
        } else {
          // Try to connect
          await redis.connect();
          await redis.ping();
        }
        return true;
      } catch (error) {
        console.error("Cache ping error:", error);
        return false;
      }
    },
  };

  return provider;
}
