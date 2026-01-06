import Redis from "ioredis";
import { nanoid } from "nanoid";
import type { RealTimeEvent } from "../types";
import { EventChannels } from "./channels";
import type { EventBroadcaster, EventHandler } from "./event-broadcaster";

export interface RedisBroadcasterConfig {
  url: string;
  serverId?: string;
}

export function createRedisBroadcaster(
  config: RedisBroadcasterConfig
): EventBroadcaster {
  const serverId = config.serverId ?? nanoid();

  // Redis requires separate connections for publisher and subscriber
  const publisher = new Redis(config.url);
  const subscriber = new Redis(config.url);

  // Map of channel -> Set of handlers
  const handlers = new Map<string, Set<EventHandler>>();

  // Set up message handler
  subscriber.on("message", (channel: string, message: string) => {
    try {
      const event = JSON.parse(message) as RealTimeEvent;

      // Don't process our own messages (prevent echo)
      if (event.metadata.serverId === serverId) {
        return;
      }

      // Invoke all handlers for this channel
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
    } catch (error) {
      console.error("Error parsing event message:", error);
    }
  });

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

    async broadcast<T = unknown>(
      channel: string,
      event: Omit<RealTimeEvent<T>, "metadata">
    ): Promise<void> {
      const fullEvent = createEvent(event);
      await publisher.publish(channel, JSON.stringify(fullEvent));
    },

    async subscribe<T = unknown>(
      channel: string,
      handler: EventHandler<T>
    ): Promise<void> {
      let channelHandlers = handlers.get(channel);

      if (!channelHandlers) {
        // First subscriber to this channel
        channelHandlers = new Set();
        handlers.set(channel, channelHandlers);
        await subscriber.subscribe(channel);
      }

      channelHandlers.add(handler as EventHandler);
    },

    async unsubscribe(channel: string, handler?: EventHandler): Promise<void> {
      const channelHandlers = handlers.get(channel);

      if (!channelHandlers) {
        return;
      }

      if (handler) {
        // Remove specific handler
        channelHandlers.delete(handler);

        // If no more handlers, unsubscribe from Redis
        if (channelHandlers.size === 0) {
          handlers.delete(channel);
          await subscriber.unsubscribe(channel);
        }
      } else {
        // Remove all handlers for this channel
        handlers.delete(channel);
        await subscriber.unsubscribe(channel);
      }
    },

    async close(): Promise<void> {
      await subscriber.quit();
      await publisher.quit();
      handlers.clear();
    },
  };
}
