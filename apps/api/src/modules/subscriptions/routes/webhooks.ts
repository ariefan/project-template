import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { XenditWebhookEvent } from "../handlers/xendit-webhook.handler";
import { processWebhookEvent } from "../handlers/xendit-webhook.handler";
import { provider } from "../providers/factory";

const webhooksRoutes = (app: FastifyInstance): void => {
  /**
   * Xendit Webhook Handler
   * This is a public endpoint that receives payment events from Xendit
   */
  app.post(
    "/webhooks/payments/xendit",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get the callback token from headers
        const callbackToken = request.headers["x-callback-token"];
        if (!callbackToken || typeof callbackToken !== "string") {
          console.warn("Missing x-callback-token header in webhook request");
          // Return 200 to prevent Xendit retries
          return reply
            .status(200)
            .send({ received: false, error: "Missing signature" });
        }

        // Verify webhook signature
        const rawBody = JSON.stringify(request.body);
        const isValid = provider.verifyWebhookSignature(rawBody, callbackToken);

        if (!isValid) {
          console.error("Invalid webhook signature");
          // Return 200 to prevent Xendit retries
          return reply
            .status(200)
            .send({ received: false, error: "Invalid signature" });
        }

        // Parse event
        const event = request.body as XenditWebhookEvent;

        // Log the event
        console.log(
          `Received Xendit webhook event: ${event.event} (${event.id})`
        );

        // Process the event
        const result = await processWebhookEvent(event);

        // Always return 200 to acknowledge receipt
        return reply.status(200).send({
          received: true,
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        console.error("Error processing Xendit webhook:", error);

        // Return 200 even on error to prevent Xendit from retrying
        // Failed webhooks should be logged and reviewed manually
        return reply.status(200).send({
          received: true,
          success: false,
          error:
            error instanceof Error ? error.message : "Internal server error",
        });
      }
    }
  );

  /**
   * Health check endpoint for webhook
   */
  app.get(
    "/webhooks/payments/xendit/health",
    (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({
        status: "ok",
        message: "Xendit webhook endpoint is operational",
      });
    }
  );
};

export default webhooksRoutes;
