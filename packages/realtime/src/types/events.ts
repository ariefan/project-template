export type EventType =
  | "notification:created"
  | "notification:sent"
  | "notification:read"
  | "notification:unread"
  | "notification:deleted"
  | "notification:unread_count"
  | "notification:bulk_read"
  | "job:created"
  | "job:processing"
  | "job:progress"
  | "job:completed"
  | "job:failed"
  | "webhook:queued"
  | "webhook:delivered"
  | "webhook:failed";

export interface RealTimeEvent<T = unknown> {
  type: EventType;
  data: T;
  metadata: {
    serverId: string;
    timestamp: string;
    userId?: string;
    orgId?: string;
  };
  id: string;
}

export interface NotificationCreatedEvent {
  id: string;
  userId?: string;
  channel: string;
  category: string;
  priority: string;
  subject?: string;
  body?: string;
  createdAt: string;
}

export interface NotificationStatusEvent {
  id: string;
  status: string;
  timestamp: string;
}

export interface UnreadCountEvent {
  userId: string;
  count: number;
}

export interface JobStatusEvent {
  id: string;
  type: string;
  status: string;
  progress?: number;
  createdBy?: string;
  orgId?: string;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  status: string;
  attempts: number;
}
