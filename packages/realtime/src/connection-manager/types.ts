export interface Connection {
  id: string;
  userId: string;
  type: "websocket" | "sse";
  connectedAt: Date;
  lastHeartbeat: Date;
  metadata?: Record<string, unknown>;
}

export interface ConnectionStats {
  total: number;
  websocket: number;
  sse: number;
  byUser: Map<string, number>;
}
