import type { WebSocket } from "@fastify/websocket";
import type { Session, User } from "@workspace/auth";
import type { FastifyRequest } from "fastify";

export interface WebSocketAuthData {
  session: Session;
  user: User;
}

// WeakMap to store auth data for WebSocket connections
// WeakMap allows garbage collection when socket is closed
const connectionAuth = new WeakMap<WebSocket, WebSocketAuthData>();

/**
 * Authenticate a WebSocket connection using session cookie
 */
export async function authenticateWebSocket(
  request: FastifyRequest
): Promise<WebSocketAuthData | null> {
  try {
    // Get auth instance from Fastify decorator
    // biome-ignore lint/suspicious/noExplicitAny: Fastify decorator type not available
    const auth = (request.server as any).auth;

    const session = await auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (!(session?.session && session.user)) {
      return null;
    }

    return {
      session: session.session,
      user: session.user,
    };
  } catch (error) {
    request.log.error({ error }, "WebSocket authentication failed");
    return null;
  }
}

/**
 * Refresh session for an active WebSocket connection
 */
export async function refreshConnectionSession(
  request: FastifyRequest,
  socket: WebSocket
): Promise<boolean> {
  try {
    // Get auth instance from Fastify decorator
    // biome-ignore lint/suspicious/noExplicitAny: Fastify decorator type not available
    const auth = (request.server as any).auth;

    const session = await auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (!(session?.session && session.user)) {
      return false;
    }

    // Update stored auth data
    connectionAuth.set(socket, {
      session: session.session,
      user: session.user,
    });

    return true;
  } catch (error) {
    request.log.error({ error }, "WebSocket session refresh failed");
    return false;
  }
}

/**
 * Store auth data for a WebSocket connection
 */
export function setConnectionAuth(
  socket: WebSocket,
  authData: WebSocketAuthData
): void {
  connectionAuth.set(socket, authData);
}

/**
 * Get auth data for a WebSocket connection
 */
export function getConnectionAuth(
  socket: WebSocket
): WebSocketAuthData | undefined {
  return connectionAuth.get(socket);
}

/**
 * Remove auth data for a WebSocket connection
 */
export function clearConnectionAuth(socket: WebSocket): void {
  connectionAuth.delete(socket);
}

/**
 * Check if session needs refresh (older than 1 day)
 */
export function shouldRefreshSession(session: Session): boolean {
  const sessionAge = Date.now() - new Date(session.createdAt).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return sessionAge > oneDayMs;
}
