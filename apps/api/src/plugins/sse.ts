import type { ConnectionManager, EventBroadcaster } from "@workspace/realtime";
import { EventChannels } from "@workspace/realtime";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { env } from "../env";
import { requireAuth } from "../modules/auth";

export interface SSEPluginOptions {
  broadcaster: EventBroadcaster;
  connectionManager: ConnectionManager;
  heartbeatInterval?: number;
}

function ssePlugin(fastify: FastifyInstance, options: SSEPluginOptions): void {
  const {
    broadcaster,
    connectionManager,
    heartbeatInterval = 30_000,
  } = options;

  // SSE endpoint for real-time events
  // Note: fastify-plugin removes encapsulation, so prefix option doesn't work
  // We manually include /v1 in the path
  fastify.get(
    "/v1/sse/events",
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          error: {
            code: "unauthorized",
            message: "User not authenticated",
            requestId: request.id,
          },
        });
      }

      // Set SSE headers
      // Note: reply.raw.writeHead bypasses Fastify plugins, so CORS headers must be set manually
      // Use configured CORS_ORIGIN for security (don't echo request origin)
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        "Access-Control-Allow-Origin": env.CORS_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
      });

      // Register connection
      const connectionId = connectionManager.addConnection({
        userId,
        type: "sse",
        metadata: {
          ip: request.ip,
          userAgent: request.headers["user-agent"],
        },
      });

      request.log.info(
        {
          connectionId,
          userId,
          ip: request.ip,
        },
        "SSE connection established"
      );

      // Subscribe to user channel
      const userChannel = EventChannels.user(userId);
      const eventHandler = (event: unknown) => {
        try {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
          request.log.error(
            { error, userId, connectionId },
            "Failed to send SSE event"
          );
        }
      };

      await broadcaster.subscribe(userChannel, eventHandler);

      // Send initial connection event
      reply.raw.write(
        `data: ${JSON.stringify({
          type: "sse:connected",
          data: { userId, connectionId },
          metadata: {
            serverId: process.env.HOSTNAME || "unknown",
            timestamp: new Date().toISOString(),
          },
          id: `sse_connected_${connectionId}`,
        })}\n\n`
      );

      // Set up heartbeat
      const heartbeat = setInterval(() => {
        try {
          // Send comment line as heartbeat
          reply.raw.write(": heartbeat\n\n");

          // Update heartbeat timestamp
          connectionManager.updateHeartbeat(connectionId);
        } catch (error) {
          request.log.error({ error, userId, connectionId }, "Heartbeat error");
          clearInterval(heartbeat);
        }
      }, heartbeatInterval);

      // Cleanup on disconnect
      request.raw.on("close", async () => {
        clearInterval(heartbeat);
        await broadcaster.unsubscribe(userChannel, eventHandler);
        connectionManager.removeConnection(connectionId);

        request.log.info({ userId, connectionId }, "SSE connection closed");
      });

      // Handle errors
      request.raw.on("error", (error) => {
        request.log.error(
          { error, userId, connectionId },
          "SSE connection error"
        );
        clearInterval(heartbeat);
      });
    }
  );

  fastify.log.info("SSE plugin registered");
}

export default fastifyPlugin(ssePlugin, {
  name: "sse",
  dependencies: [],
});
