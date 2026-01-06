/**
 * Chunk Processor
 *
 * Processes large datasets in chunks for memory-efficient exports
 */

export interface ChunkProcessorOptions {
  /** Number of rows per chunk (default: 1000) */
  batchSize?: number;
  /** Progress callback */
  onProgress?: (processed: number, total?: number) => void;
  /** Delay between chunks in ms (for rate limiting) */
  chunkDelay?: number;
}

export type DataFetcher<T> = (offset: number, limit: number) => Promise<T[]>;

export class ChunkProcessor {
  private readonly options: Required<ChunkProcessorOptions>;

  constructor(options?: ChunkProcessorOptions) {
    this.options = {
      batchSize: options?.batchSize ?? 1000,
      onProgress: options?.onProgress ?? (() => undefined),
      chunkDelay: options?.chunkDelay ?? 0,
    };
  }

  /**
   * Process data in chunks as an async generator
   */
  async *processChunks<T>(
    fetcher: DataFetcher<T>,
    totalCount?: number
  ): AsyncGenerator<T[], void, unknown> {
    let offset = 0;
    let processed = 0;

    while (true) {
      const chunk = await fetcher(offset, this.options.batchSize);

      if (chunk.length === 0) {
        break;
      }

      yield chunk;

      processed += chunk.length;
      this.options.onProgress(processed, totalCount);

      // If we got fewer items than requested, we've reached the end
      if (chunk.length < this.options.batchSize) {
        break;
      }

      offset += this.options.batchSize;

      // Apply delay if configured
      if (this.options.chunkDelay > 0) {
        await this.delay(this.options.chunkDelay);
      }
    }
  }

  /**
   * Process all chunks and collect results
   */
  async collectAll<T>(
    fetcher: DataFetcher<T>,
    totalCount?: number
  ): Promise<T[]> {
    const results: T[] = [];

    for await (const chunk of this.processChunks(fetcher, totalCount)) {
      results.push(...chunk);
    }

    return results;
  }

  /**
   * Process chunks with a transformer
   */
  async *transformChunks<T, R>(
    fetcher: DataFetcher<T>,
    transformer: (chunk: T[]) => R[] | Promise<R[]>,
    totalCount?: number
  ): AsyncGenerator<R[], void, unknown> {
    for await (const chunk of this.processChunks(fetcher, totalCount)) {
      const transformed = await transformer(chunk);
      yield transformed;
    }
  }

  /**
   * Count total items (for progress tracking)
   */
  async countTotal<T>(
    fetcher: DataFetcher<T>,
    estimateFromFirstChunk = true
  ): Promise<number | undefined> {
    if (estimateFromFirstChunk) {
      // Fetch first chunk to see if we can estimate
      const firstChunk = await fetcher(0, this.options.batchSize);

      if (firstChunk.length < this.options.batchSize) {
        // Small dataset, we have the total
        return firstChunk.length;
      }
    }

    // For large datasets, we can't easily count without iterating
    return undefined;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a chunk processor with options
 */
export function createChunkProcessor(
  options?: ChunkProcessorOptions
): ChunkProcessor {
  return new ChunkProcessor(options);
}

/**
 * Process an array in chunks (for in-memory data)
 */
export function* chunkArray<T>(
  data: T[],
  batchSize: number
): Generator<T[], void, unknown> {
  for (let i = 0; i < data.length; i += batchSize) {
    yield data.slice(i, i + batchSize);
  }
}
