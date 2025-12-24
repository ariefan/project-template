import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryProvider } from "../../providers/memory";

describe("Memory Cache Provider", () => {
  let cache: ReturnType<typeof createMemoryProvider>;

  beforeEach(() => {
    cache = createMemoryProvider({ maxSize: 10 }); // Increased to avoid eviction in tests
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
    it("should expire keys after TTL", async () => {
      vi.useFakeTimers();

      await cache.set("key1", "value1", 5); // 5 second TTL
      expect(await cache.get("key1")).toBe("value1");

      // Fast-forward 6 seconds
      vi.advanceTimersByTime(6000);

      expect(await cache.get("key1")).toBeNull();

      vi.useRealTimers();
    });

    it("should not expire keys without TTL", async () => {
      vi.useFakeTimers();

      await cache.set("key1", "value1"); // No TTL
      expect(await cache.get("key1")).toBe("value1");

      // Fast-forward 1 hour
      vi.advanceTimersByTime(3600000);

      expect(await cache.get("key1")).toBe("value1");

      vi.useRealTimers();
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used item when maxSize exceeded", async () => {
      // Create cache with maxSize of 3
      const lruCache = createMemoryProvider({ maxSize: 3 });

      await lruCache.set("key1", "value1");
      await lruCache.set("key2", "value2");
      await lruCache.set("key3", "value3");

      // All three should exist
      expect(await lruCache.get("key1")).toBe("value1");
      expect(await lruCache.get("key2")).toBe("value2");
      expect(await lruCache.get("key3")).toBe("value3");

      // Adding a 4th item should evict key1 (least recently used)
      await lruCache.set("key4", "value4");

      expect(await lruCache.get("key1")).toBeNull(); // Evicted
      expect(await lruCache.get("key2")).toBe("value2");
      expect(await lruCache.get("key3")).toBe("value3");
      expect(await lruCache.get("key4")).toBe("value4");
    });

    it("should use insertion order for eviction (simplified LRU)", async () => {
      const lruCache = createMemoryProvider({ maxSize: 3 });

      await lruCache.set("key1", "value1");
      await lruCache.set("key2", "value2");
      await lruCache.set("key3", "value3");

      // Note: This implementation doesn't update LRU order on get()
      await lruCache.get("key1");

      // Add key4, should evict key1 (first inserted, insertion-order based)
      await lruCache.set("key4", "value4");

      expect(await lruCache.get("key1")).toBeNull(); // Evicted (first inserted)
      expect(await lruCache.get("key2")).toBe("value2");
      expect(await lruCache.get("key3")).toBe("value3");
      expect(await lruCache.get("key4")).toBe("value4");
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
  });

  describe("Health Check", () => {
    it("should return true for ping", async () => {
      const result = await cache.ping();
      expect(result).toBe(true);
    });
  });
});
