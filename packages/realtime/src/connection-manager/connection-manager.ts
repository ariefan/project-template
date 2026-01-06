import { nanoid } from "nanoid";
import type { Connection, ConnectionStats } from "./types";

export interface ConnectionManager {
  /**
   * Add a new connection
   */
  addConnection(
    connection: Omit<Connection, "id" | "connectedAt" | "lastHeartbeat">
  ): string;

  /**
   * Remove a connection by ID
   */
  removeConnection(connectionId: string): void;

  /**
   * Update last heartbeat time for a connection
   */
  updateHeartbeat(connectionId: string): void;

  /**
   * Get a connection by ID
   */
  getConnection(connectionId: string): Connection | undefined;

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): Connection[];

  /**
   * Get all connection IDs for a user
   */
  getUserConnectionIds(userId: string): string[];

  /**
   * Check if a user has any active connections
   */
  hasUserConnections(userId: string): boolean;

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats;

  /**
   * Close all connections and cleanup
   */
  close(): void;
}

export function createConnectionManager(): ConnectionManager {
  // Map of connectionId -> Connection
  const connections = new Map<string, Connection>();

  // Map of userId -> Set of connectionIds (for fast user lookup)
  const userConnections = new Map<string, Set<string>>();

  return {
    addConnection(
      connection: Omit<Connection, "id" | "connectedAt" | "lastHeartbeat">
    ): string {
      const id = nanoid();
      const now = new Date();

      const fullConnection: Connection = {
        ...connection,
        id,
        connectedAt: now,
        lastHeartbeat: now,
      };

      connections.set(id, fullConnection);

      // Index by user
      let userConns = userConnections.get(connection.userId);
      if (!userConns) {
        userConns = new Set();
        userConnections.set(connection.userId, userConns);
      }
      userConns.add(id);

      return id;
    },

    removeConnection(connectionId: string): void {
      const connection = connections.get(connectionId);
      if (!connection) {
        return;
      }

      connections.delete(connectionId);

      // Remove from user index
      const userConns = userConnections.get(connection.userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          userConnections.delete(connection.userId);
        }
      }
    },

    updateHeartbeat(connectionId: string): void {
      const connection = connections.get(connectionId);
      if (connection) {
        connection.lastHeartbeat = new Date();
      }
    },

    getConnection(connectionId: string): Connection | undefined {
      return connections.get(connectionId);
    },

    getUserConnections(userId: string): Connection[] {
      const connIds = userConnections.get(userId);
      if (!connIds) {
        return [];
      }

      const result: Connection[] = [];
      for (const connId of connIds) {
        const conn = connections.get(connId);
        if (conn) {
          result.push(conn);
        }
      }
      return result;
    },

    getUserConnectionIds(userId: string): string[] {
      const connIds = userConnections.get(userId);
      return connIds ? [...connIds] : [];
    },

    hasUserConnections(userId: string): boolean {
      const connIds = userConnections.get(userId);
      return connIds !== undefined && connIds.size > 0;
    },

    getStats(): ConnectionStats {
      let websocket = 0;
      let sse = 0;
      const byUser = new Map<string, number>();

      for (const connection of connections.values()) {
        if (connection.type === "websocket") {
          websocket++;
        } else {
          sse++;
        }

        const userCount = byUser.get(connection.userId) ?? 0;
        byUser.set(connection.userId, userCount + 1);
      }

      return {
        total: connections.size,
        websocket,
        sse,
        byUser,
      };
    },

    close(): void {
      connections.clear();
      userConnections.clear();
    },
  };
}
