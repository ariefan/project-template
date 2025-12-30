import { vi } from "vitest";

interface ChainableQuery<_T = unknown> {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
}

export interface MockDb {
  select: ReturnType<typeof vi.fn> & {
    mockQueryResult: (data: unknown[]) => void;
  };
  insert: ReturnType<typeof vi.fn> & {
    mockInsertResult: (data: unknown) => void;
  };
  update: ReturnType<typeof vi.fn> & {
    mockUpdateResult: (data: unknown) => void;
  };
  delete: ReturnType<typeof vi.fn> & {
    mockDeleteResult: (count: number) => void;
  };
  transaction: ReturnType<typeof vi.fn>;
}

function createChainableQuery<T>(resolveWith: T): ChainableQuery<T> {
  const chain: ChainableQuery<T> = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
    execute: vi.fn().mockResolvedValue(resolveWith),
    returning: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
  };

  // Make all methods chainable
  for (const key of Object.keys(chain) as (keyof ChainableQuery)[]) {
    if (key !== "execute") {
      (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    }
  }

  return chain;
}

/**
 * Create a mock database that mimics Drizzle's chainable query API
 *
 * @example
 * const mockDb = createMockDb();
 *
 * // Mock a select query
 * mockDb.select.mockQueryResult([{ id: "1", name: "Test" }]);
 *
 * // In your test
 * vi.mock("@workspace/db", () => ({ db: mockDb }));
 */
export function createMockDb(): MockDb {
  const selectChain = createChainableQuery<unknown[]>([]);
  const insertChain = createChainableQuery<unknown>({});
  const updateChain = createChainableQuery<unknown>({});
  const deleteChain = createChainableQuery<number>(0);

  const select = vi.fn().mockReturnValue(selectChain) as MockDb["select"];
  select.mockQueryResult = (data: unknown[]) => {
    selectChain.execute.mockResolvedValue(data);
    // Also mock the common pattern where query resolves directly
    selectChain.where.mockResolvedValue(data);
    selectChain.limit.mockResolvedValue(data);
    selectChain.orderBy.mockResolvedValue(data);
  };

  const insert = vi.fn().mockReturnValue(insertChain) as MockDb["insert"];
  insert.mockInsertResult = (data: unknown) => {
    insertChain.returning.mockResolvedValue([data]);
    insertChain.execute.mockResolvedValue([data]);
  };

  const update = vi.fn().mockReturnValue(updateChain) as MockDb["update"];
  update.mockUpdateResult = (data: unknown) => {
    updateChain.returning.mockResolvedValue([data]);
    updateChain.execute.mockResolvedValue([data]);
  };

  const deleteFn = vi.fn().mockReturnValue(deleteChain) as MockDb["delete"];
  deleteFn.mockDeleteResult = (count: number) => {
    deleteChain.execute.mockResolvedValue(count);
  };

  return {
    select,
    insert,
    update,
    delete: deleteFn,
    transaction: vi.fn((callback) =>
      callback({ select, insert, update, delete: deleteFn })
    ),
  };
}

/**
 * Reset all mock functions on a MockDb instance
 */
export function resetMockDb(): void {
  vi.clearAllMocks();
}
