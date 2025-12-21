import type { ResponseMeta } from "@workspace/contracts";

export function createMeta(requestId: string): ResponseMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
}
