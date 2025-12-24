import { createMemoryProvider } from "./providers/memory";
import { createRedisProvider } from "./providers/redis";
import type { CacheProvider, CacheProviderConfig } from "./types";

/**
 * Factory function to create cache providers
 * @param config Cache provider configuration
 * @returns Configured cache provider instance
 * @throws Error if config type is unknown
 */
export function createCacheProvider(
  config: CacheProviderConfig
): CacheProvider {
  switch (config.type) {
    case "memory":
      return createMemoryProvider({ maxSize: config.maxSize });

    case "redis": {
      if (!config.url) {
        throw new Error("Redis provider requires a url");
      }
      return createRedisProvider({
        url: config.url,
        keyPrefix: config.keyPrefix,
      });
    }

    default:
      throw new Error(
        `Unknown cache provider type: ${(config as { type: string }).type}`
      );
  }
}
