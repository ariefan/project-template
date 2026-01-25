import { EventEmitter } from "node:events";

/**
 * Standard event names for internal decoupling
 */
export const Events = {
  ANN_CREATED: "announcement:created",
  ANN_UPDATED: "announcement:updated",
  ANN_DELETED: "announcement:deleted",

  ORG_CREATED: "organization:created",

  USER_CREATED: "user:created",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

/**
 * Global internal event emitter
 * Modules can use this to communicate without direct dependencies
 */
class InternalEventEmitter extends EventEmitter {
  /**
   * Typed emit for consistency
   */
  emitEvent(event: EventName, payload: unknown): boolean {
    return this.emit(event, payload);
  }

  /**
   * Typed listener
   */
  onEvent(event: EventName, listener: (payload: unknown) => void): this {
    return this.on(event, listener);
  }
}

export const eventBus = new InternalEventEmitter();
