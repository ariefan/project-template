/**
 * Cache entry with value and expiration timestamp
 */
export type CacheEntry<T = unknown> = {
  value: T;
  expiresAt: number | null;
};

/**
 * Core cache provider interface
 * All implementations must follow this contract
 */
export type CacheProvider = {
  readonly name: string;

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds (optional, null = never expire)
   */
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a specific key from cache
   * @param key Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Delete all keys matching a pattern
   * Pattern format: prefix:* for wildcard matching
   * @param pattern Pattern to match (e.g., "authz:user123:*")
   * @returns Number of keys deleted
   */
  deletePattern(pattern: string): Promise<number>;

  /**
   * Clear all entries from cache
   */
  clear(): Promise<void>;

  /**
   * Get multiple values at once
   * @param keys Array of cache keys
   * @returns Map of key -> value (missing keys not included)
   */
  mget<T = unknown>(keys: string[]): Promise<Map<string, T>>;

  /**
   * Set multiple values at once
   * @param entries Array of {key, value, ttlSeconds}
   */
  mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttlSeconds?: number }>
  ): Promise<void>;

  /**
   * Health check - verify cache is accessible
   * @returns true if healthy, false otherwise
   */
  ping(): Promise<boolean>;
};

/**
 * Cache provider configuration options
 */
export type CacheProviderConfig =
  | {
      type: "memory";
      maxSize?: number; // Max entries before LRU eviction, default 1000
    }
  | {
      type: "redis";
      url: string; // Redis connection URL
      keyPrefix?: string; // Key prefix for namespacing, default "cache:"
    };

/**
 * Cache provider factory return type
 */
export type { CacheProvider as default };
