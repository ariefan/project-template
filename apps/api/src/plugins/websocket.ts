import fastifyWebSocket from "@fastify/websocket";
import type { ConnectionManager, EventBroadcaster } from "@workspace/realtime";
import { EventChannels } from "@workspace/realtime";
import type { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import {
  authenticateWebSocket,
  clearConnectionAuth,
  getConnectionAuth,
  refreshConnectionSession,
  setConnectionAuth,
  shouldRefreshSession,
} from "../modules/realtime/websocket-auth";

export interface WebSocketPluginOptions {
  broadcaster: EventBroadcaster;
  connectionManager: ConnectionManager;
  heartbeatInterval?: number;
}

async function websocketPlugin(
  fastify: FastifyInstance,
  options: WebSocketPluginOptions
): Promise<void> {
  const {
    broadcaster,
    connectionManager,
    heartbeatInterval = 30_000,
  } = options;

  // Register WebSocket support
  await fastify.register(fastifyWebSocket);

  // WebSocket endpoint
  fastify.get("/ws", { websocket: true }, async (socket, request) => {
    // 1. Authenticate via session cookie
    const authData = await authenticateWebSocket(request);

    if (!authData) {
      socket.close(4001, "Unauthorized");
      request.log.warn(
        { ip: request.ip, userAgent: request.headers["user-agent"] },
        "WebSocket connection rejected: Unauthorized"
      );
      return;
    }

    const userId = authData.user.id;

    // 2. Store auth data for this connection
    setConnectionAuth(socket, authData);

    // 3. Register connection
    const connectionId = connectionManager.addConnection({
      userId,
      type: "websocket",
      metadata: {
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      },
    });

    request.log.info(
      {
        connectionId,
        userId,
        sessionId: authData.session.id,
        ip: request.ip,
      },
      "WebSocket connection established"
    );

    // 4. Subscribe to user channel
    const userChannel = EventChannels.user(userId);
    await broadcaster.subscribe(userChannel, (event) => {
      try {
        socket.send(JSON.stringify(event));
      } catch (error) {
        request.log.error(
          { error, userId, connectionId },
          "Failed to send event to WebSocket client"
        );
      }
    });

    // 5. Send connection success event
    socket.send(
      JSON.stringify({
        type: "auth:success",
        data: { userId, connectionId },
        metadata: {
          serverId: process.env.HOSTNAME || "unknown",
          timestamp: new Date().toISOString(),
        },
        id: `auth_success_${connectionId}`,
      })
    );

    // 6. Set up heartbeat with session refresh
    const heartbeat = setInterval(async () => {
      try {
        // Send ping
        socket.ping();

        // Update heartbeat timestamp
        connectionManager.updateHeartbeat(connectionId);

        // Check if session needs refresh
        const currentAuth = getConnectionAuth(socket);
        if (currentAuth && shouldRefreshSession(currentAuth.session)) {
          const refreshed = await refreshConnectionSession(request, socket);

          if (!refreshed) {
            // Session refresh failed - close connection
            socket.close(4010, "Session Expired");
            request.log.warn(
              { userId, connectionId },
              "WebSocket connection closed: Session refresh failed"
            );
            return;
          }

          // Send refresh success event
          socket.send(
            JSON.stringify({
              type: "auth:refreshed",
              data: { timestamp: new Date().toISOString() },
              metadata: {
                serverId: process.env.HOSTNAME || "unknown",
                timestamp: new Date().toISOString(),
              },
              id: `auth_refresh_${connectionId}`,
            })
          );

          request.log.debug(
            { userId, connectionId },
            "WebSocket session refreshed"
          );
        }
      } catch (error) {
        request.log.error({ error, userId, connectionId }, "Heartbeat error");
      }
    }, heartbeatInterval);

    // 7. Handle client messages (for future features like channel subscriptions)
    socket.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as { type?: string };
        request.log.debug(
          { userId, connectionId, messageType: data.type },
          "WebSocket message received"
        );

        // Handle different message types here
        // For now, just log them
      } catch (error) {
        request.log.error(
          { error, userId, connectionId },
          "Failed to parse WebSocket message"
        );
      }
    });

    // 8. Cleanup on disconnect
    socket.on("close", async () => {
      clearInterval(heartbeat);
      await broadcaster.unsubscribe(userChannel);
      connectionManager.removeConnection(connectionId);
      clearConnectionAuth(socket);

      request.log.info({ userId, connectionId }, "WebSocket connection closed");
    });

    // 9. Handle errors
    socket.on("error", (error: Error) => {
      request.log.error({ error, userId, connectionId }, "WebSocket error");
    });
  });

  fastify.log.info("WebSocket plugin registered");
}

export default fastifyPlugin(websocketPlugin, {
  name: "websocket",
  dependencies: [],
});
