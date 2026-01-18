/**
 * Test Job Handler
 *
 * A demonstration job handler that fetches real data from PokéAPI.
 * Used for testing the job queue system and UI with actual network I/O.
 *
 * PokéAPI: https://pokeapi.co/ - Free Pokémon data API with 1000+ entries
 */

import { jobHandlerRegistry } from "./registry";
import type { JobContext, JobResult } from "./types";

/**
 * Input parameters for test jobs
 */
export interface TestJobInput {
  /** Number of pages to fetch (default: 5, more pages = longer job) */
  pages?: number;
  /** Items per page (default: 20, max 100 for PokéAPI) */
  pageSize?: number;
  /** PokéAPI resource to fetch from (default: "pokemon") */
  source?: "pokemon" | "ability" | "move" | "type" | "berry";
  /** Whether to fail partway through (for testing error handling) */
  failAtPage?: number;
}

/**
 * PokéAPI endpoints - each has 1000+ entries for realistic testing
 */
const POKEAPI_BASE = "https://pokeapi.co/api/v2";

const SOURCES: Record<
  string,
  { url: string; name: string; totalCount: number }
> = {
  pokemon: {
    url: `${POKEAPI_BASE}/pokemon`,
    name: "Pokémon",
    totalCount: 1302,
  },
  ability: {
    url: `${POKEAPI_BASE}/ability`,
    name: "Abilities",
    totalCount: 361,
  },
  move: {
    url: `${POKEAPI_BASE}/move`,
    name: "Moves",
    totalCount: 1010,
  },
  type: {
    url: `${POKEAPI_BASE}/type`,
    name: "Types",
    totalCount: 21,
  },
  berry: {
    url: `${POKEAPI_BASE}/berry`,
    name: "Berries",
    totalCount: 1025,
  },
};

/**
 * PokéAPI list response structure
 */
interface PokeAPIListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{ name: string; url: string }>;
}

/**
 * Handle test job
 *
 * Fetches real data from PokéAPI to demonstrate async job processing.
 * Network I/O provides natural delay, no artificial sleep needed.
 *
 * PokéAPI has rate limiting but is generous for testing purposes.
 */
async function handleTestJob(context: JobContext): Promise<JobResult> {
  const { input, helpers } = context;
  const {
    pages = 5,
    pageSize = 20,
    source = "pokemon",
    failAtPage,
  } = input as TestJobInput;

  const sourceConfig = SOURCES[source];
  if (!sourceConfig) {
    return {
      error: {
        code: "INVALID_SOURCE",
        message: `Unknown source: ${source}. Valid options: ${Object.keys(
          SOURCES
        ).join(", ")}`,
        retryable: false,
      },
    };
  }

  const startTime = Date.now();
  const results: Array<{ name: string; url: string }> = [];

  await helpers.updateProgress(
    0,
    `Starting fetch from ${sourceConfig.name} (${pages} pages)`
  );

  // Fetch multiple pages - real network I/O takes time
  // PokéAPI uses offset/limit pagination, not page numbers
  for (let page = 1; page <= pages; page++) {
    // Test failure simulation
    if (failAtPage && page === failAtPage) {
      return {
        error: {
          code: "TEST_FAILURE",
          message: `Test job failed at page ${page} as requested (failAtPage=${failAtPage})`,
          retryable: true,
        },
      };
    }

    try {
      const offset = (page - 1) * pageSize;
      const url = `${sourceConfig.url}?limit=${pageSize}&offset=${offset}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "project-template/1.0 (https://github.com/yourusername/project-template)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as PokeAPIListResponse;
      results.push(...data.results);

      await helpers.updateProgress(
        Math.round((page / pages) * 100),
        `Fetched page ${page}/${pages} (${results.length} total records)`
      );

      // Small delay to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      return {
        error: {
          code: "FETCH_FAILED",
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
      };
    }
  }

  const elapsed = Date.now() - startTime;

  return {
    output: {
      result: "Test completed successfully",
      source: sourceConfig.name,
      sourceType: source,
      pages,
      recordsFetched: results.length,
      totalAvailable: sourceConfig.totalCount,
      duration: elapsed,
      completedAt: new Date().toISOString(),
      // Include a sample of the fetched data for inspection
      sample: results.slice(0, 5),
      // Include total sample data size (rough estimate)
      sampleSizeBytes: JSON.stringify(results.slice(0, 5)).length,
    },
  };
}

/**
 * Register the test job handler
 */
export function registerTestHandler(): void {
  jobHandlerRegistry.register({
    type: "dev:test-pokeapi",
    handler: handleTestJob,
    concurrency: 5,
    retryLimit: 2,
    expireInSeconds: 600, // 10 minutes
    // UI metadata
    label: "Test Job (PokéAPI)",
    description: "Fetch data from PokéAPI for testing the job queue system",
    configSchema:
      '{ pages?: number, pageSize?: number, source?: "pokemon"|"ability"|"move"|"type"|"berry", failAtPage?: number }',
    exampleConfig: { pages: 3, pageSize: 20, source: "pokemon" },
  });
}
