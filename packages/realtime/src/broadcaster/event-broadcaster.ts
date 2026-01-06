import type { RealTimeEvent } from "../types";

export type EventHandler<T = unknown> = (event: RealTimeEvent<T>) => void;

export interface EventBroadcaster {
  /**
   * Broadcast an event to a specific user
   */
  broadcastToUser<T = unknown>(
    userId: string,
    event: Omit<RealTimeEvent<T>, "metadata">
  ): Promise<void>;

  /**
   * Broadcast an event to all members of an organization
   */
  broadcastToOrg<T = unknown>(
    orgId: string,
    event: Omit<RealTimeEvent<T>, "metadata">
  ): Promise<void>;

  /**
   * Broadcast a system-wide event
   */
  broadcastToSystem<T = unknown>(
    event: Omit<RealTimeEvent<T>, "metadata">
  ): Promise<void>;

  /**
   * Broadcast to a specific channel
   */
  broadcast<T = unknown>(
    channel: string,
    event: Omit<RealTimeEvent<T>, "metadata">
  ): Promise<void>;

  /**
   * Subscribe to events on a channel
   */
  subscribe<T = unknown>(
    channel: string,
    handler: EventHandler<T>
  ): Promise<void>;

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, handler?: EventHandler): Promise<void>;

  /**
   * Close the broadcaster and cleanup resources
   */
  close(): Promise<void>;
}
