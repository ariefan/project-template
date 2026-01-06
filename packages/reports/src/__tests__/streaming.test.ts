import { describe, expect, it, vi } from "vitest";
import { ChunkProcessor, chunkArray, createChunkProcessor } from "../streaming";

interface TestItem {
  id: number;
  name: string;
}

function createTestData(count: number): TestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));
}

describe("ChunkProcessor", () => {
  describe("processChunks", () => {
    it("should process data in chunks", async () => {
      const processor = new ChunkProcessor({ batchSize: 3 });
      const allData = createTestData(10);

      const fetcher = async (offset: number, limit: number) => {
        return allData.slice(offset, offset + limit);
      };

      const chunks: TestItem[][] = [];
      for await (const chunk of processor.processChunks(fetcher)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(4); // 3 + 3 + 3 + 1
      expect(chunks[0]).toHaveLength(3);
      expect(chunks[1]).toHaveLength(3);
      expect(chunks[2]).toHaveLength(3);
      expect(chunks[3]).toHaveLength(1);
    });

    it("should stop when fetcher returns empty array", async () => {
      const processor = new ChunkProcessor({ batchSize: 5 });

      const fetcher = async (offset: number) => {
        if (offset >= 10) {
          return [];
        }
        return createTestData(5);
      };

      const chunks: TestItem[][] = [];
      for await (const chunk of processor.processChunks(fetcher)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(2);
    });

    it("should call onProgress callback", async () => {
      const onProgress = vi.fn();
      const processor = new ChunkProcessor({ batchSize: 3, onProgress });
      const allData = createTestData(7);

      const fetcher = async (offset: number, limit: number) => {
        return allData.slice(offset, offset + limit);
      };

      const chunks: TestItem[][] = [];
      for await (const chunk of processor.processChunks(fetcher, 7)) {
        chunks.push(chunk);
      }

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, 3, 7);
      expect(onProgress).toHaveBeenNthCalledWith(2, 6, 7);
      expect(onProgress).toHaveBeenNthCalledWith(3, 7, 7);
    });

    it("should handle empty data source", async () => {
      const processor = new ChunkProcessor({ batchSize: 10 });

      const fetcher = async () => [] as TestItem[];

      const chunks: TestItem[][] = [];
      for await (const chunk of processor.processChunks(fetcher)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(0);
    });

    it("should apply chunk delay when configured", async () => {
      const processor = new ChunkProcessor({ batchSize: 2, chunkDelay: 10 });
      const allData = createTestData(4);

      const fetcher = async (offset: number, limit: number) => {
        return allData.slice(offset, offset + limit);
      };

      const startTime = Date.now();
      const chunks: TestItem[][] = [];
      for await (const chunk of processor.processChunks(fetcher)) {
        chunks.push(chunk);
      }
      const duration = Date.now() - startTime;

      // Should have at least 1 delay between chunks (10ms)
      // Being lenient due to timer precision
      expect(duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe("collectAll", () => {
    it("should collect all chunks into single array", async () => {
      const processor = new ChunkProcessor({ batchSize: 3 });
      const allData = createTestData(10);

      const fetcher = async (offset: number, limit: number) => {
        return allData.slice(offset, offset + limit);
      };

      const result = await processor.collectAll(fetcher);

      expect(result).toHaveLength(10);
      expect(result[0]).toEqual({ id: 1, name: "Item 1" });
      expect(result[9]).toEqual({ id: 10, name: "Item 10" });
    });

    it("should return empty array for empty data source", async () => {
      const processor = new ChunkProcessor({ batchSize: 10 });

      const fetcher = async () => [] as TestItem[];

      const result = await processor.collectAll(fetcher);

      expect(result).toHaveLength(0);
    });
  });

  describe("transformChunks", () => {
    it("should transform chunks during processing", async () => {
      const processor = new ChunkProcessor({ batchSize: 3 });
      const allData = createTestData(6);

      const fetcher = async (offset: number, limit: number) => {
        return allData.slice(offset, offset + limit);
      };

      const transformer = (chunk: TestItem[]) => {
        return chunk.map((item) => item.id * 2);
      };

      const results: number[][] = [];
      for await (const chunk of processor.transformChunks(
        fetcher,
        transformer
      )) {
        results.push(chunk);
      }

      expect(results.length).toBe(2);
      expect(results[0]).toEqual([2, 4, 6]);
      expect(results[1]).toEqual([8, 10, 12]);
    });

    it("should support async transformers", async () => {
      const processor = new ChunkProcessor({ batchSize: 3 });
      const allData = createTestData(3);

      const fetcher = async (offset: number, limit: number) => {
        return allData.slice(offset, offset + limit);
      };

      const transformer = async (chunk: TestItem[]) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return chunk.map((item) => `Transformed: ${item.name}`);
      };

      const results: string[][] = [];
      for await (const chunk of processor.transformChunks(
        fetcher,
        transformer
      )) {
        results.push(chunk);
      }

      expect(results.length).toBe(1);
      expect(results[0]).toEqual([
        "Transformed: Item 1",
        "Transformed: Item 2",
        "Transformed: Item 3",
      ]);
    });
  });

  describe("countTotal", () => {
    it("should return count for small datasets", async () => {
      const processor = new ChunkProcessor({ batchSize: 100 });
      const allData = createTestData(50);

      const fetcher = async (offset: number, limit: number) => {
        return allData.slice(offset, offset + limit);
      };

      const count = await processor.countTotal(fetcher);

      expect(count).toBe(50);
    });

    it("should return undefined for large datasets", async () => {
      const processor = new ChunkProcessor({ batchSize: 10 });
      const allData = createTestData(100);

      const fetcher = async (offset: number, limit: number) => {
        return allData.slice(offset, offset + limit);
      };

      const count = await processor.countTotal(fetcher);

      expect(count).toBeUndefined();
    });
  });
});

describe("createChunkProcessor", () => {
  it("should create a new chunk processor instance", () => {
    const processor = createChunkProcessor();

    expect(processor).toBeInstanceOf(ChunkProcessor);
  });

  it("should create with custom options", () => {
    const onProgress = vi.fn();
    const processor = createChunkProcessor({
      batchSize: 500,
      onProgress,
      chunkDelay: 100,
    });

    expect(processor).toBeInstanceOf(ChunkProcessor);
  });
});

describe("chunkArray", () => {
  it("should split array into chunks", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const chunks = [...chunkArray(data, 3)];

    expect(chunks.length).toBe(4);
    expect(chunks[0]).toEqual([1, 2, 3]);
    expect(chunks[1]).toEqual([4, 5, 6]);
    expect(chunks[2]).toEqual([7, 8, 9]);
    expect(chunks[3]).toEqual([10]);
  });

  it("should handle exact multiple", () => {
    const data = [1, 2, 3, 4, 5, 6];
    const chunks = [...chunkArray(data, 3)];

    expect(chunks.length).toBe(2);
    expect(chunks[0]).toEqual([1, 2, 3]);
    expect(chunks[1]).toEqual([4, 5, 6]);
  });

  it("should handle empty array", () => {
    const chunks = [...chunkArray([], 3)];

    expect(chunks.length).toBe(0);
  });

  it("should handle chunk size larger than array", () => {
    const data = [1, 2, 3];
    const chunks = [...chunkArray(data, 10)];

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toEqual([1, 2, 3]);
  });

  it("should handle chunk size of 1", () => {
    const data = [1, 2, 3];
    const chunks = [...chunkArray(data, 1)];

    expect(chunks.length).toBe(3);
    expect(chunks[0]).toEqual([1]);
    expect(chunks[1]).toEqual([2]);
    expect(chunks[2]).toEqual([3]);
  });
});
