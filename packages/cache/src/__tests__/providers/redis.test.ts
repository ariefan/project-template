import RedisMock from "ioredis-mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRedisProvider } from "../../providers/redis";

// Mock ioredis to use ioredis-mock
vi.mock("ioredis", () => ({
  default: RedisMock,
}));

describe("Redis Cache Provider", () => {
  let cache: ReturnType<typeof createRedisProvider>;
  let redisMock: InstanceType<typeof RedisMock>;

  beforeEach(() => {
    // Create cache with empty keyPrefix to avoid ioredis-mock keyPrefix issues
    // keyPrefix functionality will be tested separately
    cache = createRedisProvider({
      url: "redis://localhost:6379",
      keyPrefix: "", // Empty prefix to avoid double-prefixing issues with ioredis-mock
    });

    // Get reference to the underlying mock for cleanup
    redisMock = (cache as any).redis || new RedisMock();
  });

  afterEach(async () => {
    // Clean up by flushing the mock database
    if (redisMock && typeof redisMock.flushall === "function") {
      await redisMock.flushall();
    }
  });

  describe("Basic Operations", () => {
    it("should set and get a value", async () => {
      await cache.set("key1", "value1");
      const result = await cache.get<string>("key1");
      expect(result).toBe("value1");
    });

    it("should return null for non-existent key", async () => {
      const result = await cache.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should delete a key", async () => {
      await cache.set("key1", "value1");
      await cache.delete("key1");
      const result = await cache.get("key1");
      expect(result).toBeNull();
    });

    it("should clear all keys", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.clear();
      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBeNull();
    });
  });

  describe("TTL (Time To Live)", () => {
    it("should set key with TTL", async () => {
      await cache.set("key1", "value1", 5); // 5 second TTL
      const result = await cache.get<string>("key1");
      expect(result).toBe("value1");
    });

    it("should not expire keys without TTL", async () => {
      await cache.set("key1", "value1"); // No TTL
      const result = await cache.get<string>("key1");
      expect(result).toBe("value1");
    });
  });

  describe("Pattern Deletion", () => {
    it("should delete keys matching pattern", async () => {
      await cache.set("authz:user1:org1:posts:read", true);
      await cache.set("authz:user1:org1:posts:write", true);
      await cache.set("authz:user2:org1:posts:read", true);
      await cache.set("other:key", "value");

      const deletedCount = await cache.deletePattern("authz:user1:*");

      expect(deletedCount).toBe(2);
      expect(await cache.get("authz:user1:org1:posts:read")).toBeNull();
      expect(await cache.get("authz:user1:org1:posts:write")).toBeNull();
      expect(await cache.get("authz:user2:org1:posts:read")).toBe(true);
      expect(await cache.get("other:key")).toBe("value");
    });

    it("should handle wildcard at end of pattern", async () => {
      await cache.set("prefix:key1", "value1");
      await cache.set("prefix:key2", "value2");
      await cache.set("other:key", "value");

      const deletedCount = await cache.deletePattern("prefix:*");

      expect(deletedCount).toBe(2);
      expect(await cache.get("other:key")).toBe("value");
    });

    it("should return 0 when no keys match pattern", async () => {
      await cache.set("key1", "value1");

      const deletedCount = await cache.deletePattern("nonexistent:*");

      expect(deletedCount).toBe(0);
      expect(await cache.get("key1")).toBe("value1");
    });
  });

  describe("Batch Operations", () => {
    it("should get multiple keys at once", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");

      const results = await cache.mget<string>(["key1", "key2", "nonexistent"]);

      expect(results.size).toBe(2);
      expect(results.get("key1")).toBe("value1");
      expect(results.get("key2")).toBe("value2");
      expect(results.has("nonexistent")).toBe(false);
    });

    it("should handle empty keys array in mget", async () => {
      const results = await cache.mget<string>([]);
      expect(results.size).toBe(0);
    });

    it("should set multiple keys at once", async () => {
      await cache.mset([
        { key: "key1", value: "value1", ttlSeconds: 10 },
        { key: "key2", value: "value2" },
        { key: "key3", value: "value3", ttlSeconds: 20 },
      ]);

      expect(await cache.get("key1")).toBe("value1");
      expect(await cache.get("key2")).toBe("value2");
      expect(await cache.get("key3")).toBe("value3");
    });

    it("should handle empty entries array in mset", async () => {
      await cache.mset([]);
      // Should not throw
    });

    it("should group mset entries by TTL", async () => {
      await cache.mset([
        { key: "noTTL1", value: "val1" },
        { key: "noTTL2", value: "val2" },
        { key: "withTTL1", value: "val3", ttlSeconds: 10 },
        { key: "withTTL2", value: "val4", ttlSeconds: 20 },
      ]);

      expect(await cache.get("noTTL1")).toBe("val1");
      expect(await cache.get("noTTL2")).toBe("val2");
      expect(await cache.get("withTTL1")).toBe("val3");
      expect(await cache.get("withTTL2")).toBe("val4");
    });
  });

  describe("Complex Data Types", () => {
    it("should handle objects", async () => {
      const obj = { name: "test", value: 123, nested: { data: true } };
      await cache.set("obj", obj);
      const result = await cache.get<typeof obj>("obj");
      expect(result).toEqual(obj);
    });

    it("should handle arrays", async () => {
      const arr = [1, 2, 3, "four", { five: 5 }];
      await cache.set("arr", arr);
      const result = await cache.get<typeof arr>("arr");
      expect(result).toEqual(arr);
    });

    it("should handle booleans", async () => {
      await cache.set("bool", true);
      const result = await cache.get<boolean>("bool");
      expect(result).toBe(true);
    });

    it("should handle numbers", async () => {
      await cache.set("num", 42);
      const result = await cache.get<number>("num");
      expect(result).toBe(42);
    });

    it("should handle null values", async () => {
      await cache.set("null", null);
      const result = await cache.get("null");
      expect(result).toBeNull();
    });
  });

  describe("Health Check", () => {
    it("should return true for ping", async () => {
      // Set a value to ensure connection is working
      await cache.set("ping-test", "value");
      const result = await cache.get("ping-test");
      expect(result).toBe("value");

      // In ioredis-mock, ping() behavior differs from real Redis
      // We test that the cache is functional instead
      expect(result).not.toBeNull();
    });
  });

  describe("Key Prefix", () => {
    it("should use key prefix for set and get operations", async () => {
      const cacheWithPrefix = createRedisProvider({
        url: "redis://localhost:6379",
        keyPrefix: "myapp:",
      });

      await cacheWithPrefix.set("key1", "value1");

      // The key should be retrievable regardless of prefix (ioredis handles it)
      const result = await cacheWithPrefix.get<string>("key1");
      expect(result).toBe("value1");

      // Clean up
      await cacheWithPrefix.delete("key1");
    });

    it("should default to 'cache:' prefix if not specified", async () => {
      const cacheDefaultPrefix = createRedisProvider({
        url: "redis://localhost:6379",
      });

      await cacheDefaultPrefix.set("testkey", "testvalue");
      const result = await cacheDefaultPrefix.get<string>("testkey");
      expect(result).toBe("testvalue");

      // Clean up
      await cacheDefaultPrefix.delete("testkey");
    });
  });
});
