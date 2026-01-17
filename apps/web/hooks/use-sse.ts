import { useEffect, useRef } from "react";
import { env } from "../lib/env";

export interface SSEEvent<T = unknown> {
  type: string;
  data: T;
  metadata: {
    serverId: string;
    timestamp: string;
    userId?: string;
    orgId?: string;
  };
  id: string;
}

export function useSSE<T = unknown>(
  onEvent: (event: SSEEvent<T>) => void,
  enabled = true
): void {
  const onEventRef = useRef(onEvent);

  // Update ref when callback changes
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30_000; // 30 seconds

    function connect() {
      try {
        // Create SSE connection with credentials (session cookie)
        // SSE endpoint is at /v1/sse/events on the API server
        const sseUrl = `${env.NEXT_PUBLIC_API_URL}/v1/sse/events`;
        eventSource = new EventSource(sseUrl, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          reconnectAttempts = 0;
        };

        eventSource.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data) as SSEEvent<T>;
            onEventRef.current(event);
          } catch (error) {
            console.error("[SSE] Failed to parse event:", error);
          }
        };

        eventSource.onerror = (_error) => {
          // Don't log the specific error object as it's usually just a generic Event ({})
          // which confuses users. The reconnection log below is sufficient.

          // Close the connection
          eventSource?.close();

          // Calculate exponential backoff delay
          const delay = Math.min(
            1000 * 2 ** reconnectAttempts,
            maxReconnectDelay
          );
          reconnectAttempts++;

          console.log(
            `[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`
          );

          // Schedule reconnection
          reconnectTimeout = setTimeout(() => {
            connect();
          }, delay);
        };
      } catch (error) {
        console.error("[SSE] Failed to create connection:", error);
      }
    }

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [enabled]);
}
