import { nanoid } from "nanoid";
import type { RealTimeEvent } from "../types";
import { EventChannels } from "./channels";
import type { EventBroadcaster, EventHandler } from "./event-broadcaster";

export interface MemoryBroadcasterConfig {
  serverId?: string;
}

/**
 * In-memory event broadcaster for single-server deployments or testing.
 * Does not support cross-server event broadcasting.
 */
export function createMemoryBroadcaster(
  config: MemoryBroadcasterConfig = {}
): EventBroadcaster {
  const serverId = config.serverId ?? nanoid();

  // Map of channel -> Set of handlers
  const handlers = new Map<string, Set<EventHandler>>();

  function createEvent<T>(
    eventData: Omit<RealTimeEvent<T>, "metadata">
  ): RealTimeEvent<T> {
    return {
      ...eventData,
      metadata: {
        serverId,
        timestamp: new Date().toISOString(),
      },
    } as RealTimeEvent<T>;
  }

  function notifyHandlers<T>(channel: string, event: RealTimeEvent<T>): void {
    const channelHandlers = handlers.get(channel);
    if (channelHandlers) {
      for (const handler of channelHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error("Error in event handler:", error);
        }
      }
    }
  }

  return {
    async broadcastToUser<T = unknown>(
      userId: string,
      event: Omit<RealTimeEvent<T>, "metadata">
    ): Promise<void> {
      const channel = EventChannels.user(userId);
      await this.broadcast(channel, event);
    },

    async broadcastToOrg<T = unknown>(
      orgId: string,
      event: Omit<RealTimeEvent<T>, "metadata">
    ): Promise<void> {
      const channel = EventChannels.org(orgId);
      await this.broadcast(channel, event);
    },

    async broadcastToSystem<T = unknown>(
      event: Omit<RealTimeEvent<T>, "metadata">
    ): Promise<void> {
      const channel = EventChannels.system();
      await this.broadcast(channel, event);
    },

    broadcast<T = unknown>(
      channel: string,
      event: Omit<RealTimeEvent<T>, "metadata">
    ): Promise<void> {
      const fullEvent = createEvent(event);
      // Notify handlers synchronously in memory
      notifyHandlers(channel, fullEvent);
      return Promise.resolve();
    },

    subscribe<T = unknown>(
      channel: string,
      handler: EventHandler<T>
    ): Promise<void> {
      let channelHandlers = handlers.get(channel);

      if (!channelHandlers) {
        channelHandlers = new Set();
        handlers.set(channel, channelHandlers);
      }

      channelHandlers.add(handler as EventHandler);
      return Promise.resolve();
    },

    unsubscribe(channel: string, handler?: EventHandler): Promise<void> {
      const channelHandlers = handlers.get(channel);

      if (!channelHandlers) {
        return Promise.resolve();
      }

      if (handler) {
        channelHandlers.delete(handler);

        if (channelHandlers.size === 0) {
          handlers.delete(channel);
        }
      } else {
        handlers.delete(channel);
      }
      return Promise.resolve();
    },

    close(): Promise<void> {
      handlers.clear();
      return Promise.resolve();
    },
  };
}
