/**
 * ============================================================================
 * WEBHOOKS API - Event Notification Configuration
 * ============================================================================
 *
 * Manage webhook endpoints for receiving event notifications.
 *
 * @see docs/api-guide/07-integrations/01-webhooks.md
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/webhook.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Webhooks API endpoints
 *
 * Create and manage webhook configurations.
 */
@route("/v1/orgs/{orgId}/webhooks")
@tag("Webhooks")
interface Webhooks {
  /**
   * List all webhooks in an organization
   */
  @get
  @summary("List webhooks")
  list(
    /** Organization ID */
    @path orgId: string,

    /** Page number (1-indexed) */
    @query page?: int32 = 1,

    /** Number of items per page */
    @query pageSize?: int32 = 50,

    /** Filter by active status */
    @query isActive?: boolean
  ): WebhookListResponse | ErrorResponse;

  /**
   * Create a new webhook
   *
   * The secret is only returned once in the response.
   * Store it securely for signature verification.
   */
  @post
  @summary("Create webhook")
  create(
    /** Organization ID */
    @path orgId: string,

    /** Webhook configuration */
    @body body: CreateWebhookRequest
  ):
    | {
        @statusCode statusCode: 201;
        @body body: WebhookCreatedResponse;
      }
    | ErrorResponse;

  /**
   * Get available event types
   *
   * Returns all event types that can be subscribed to.
   */
  @route("/event-types")
  @get
  @summary("List event types")
  listEventTypes(
    /** Organization ID */
    @path orgId: string
  ): WebhookEventTypesResponse | ErrorResponse;

  /**
   * Get a webhook by ID
   */
  @route("/{webhookId}")
  @get
  @summary("Get webhook")
  get(
    /** Organization ID */
    @path orgId: string,

    /** Webhook ID */
    @path webhookId: string
  ): WebhookResponse | ErrorResponse;

  /**
   * Update a webhook
   */
  @route("/{webhookId}")
  @patch(#{ implicitOptionality: true })
  @summary("Update webhook")
  update(
    /** Organization ID */
    @path orgId: string,

    /** Webhook ID */
    @path webhookId: string,

    /** Update data */
    @body body: UpdateWebhookRequest
  ): WebhookResponse | ErrorResponse;

  /**
   * Delete a webhook
   */
  @route("/{webhookId}")
  @delete
  @summary("Delete webhook")
  delete(
    /** Organization ID */
    @path orgId: string,

    /** Webhook ID */
    @path webhookId: string
  ):
    | {
        @statusCode statusCode: 204;
      }
    | ErrorResponse;

  /**
   * Rotate webhook secret
   *
   * Generates a new secret. The old secret immediately stops working.
   */
  @route("/{webhookId}/rotate-secret")
  @post
  @summary("Rotate webhook secret")
  rotateSecret(
    /** Organization ID */
    @path orgId: string,

    /** Webhook ID */
    @path webhookId: string
  ): WebhookCreatedResponse | ErrorResponse;

  /**
   * Test a webhook
   *
   * Sends a test event to verify the webhook is configured correctly.
   */
  @route("/{webhookId}/test")
  @post
  @summary("Test webhook")
  test(
    /** Organization ID */
    @path orgId: string,

    /** Webhook ID */
    @path webhookId: string
  ): {
    data: {
      /** Whether the test was successful */
      success: boolean;

      /** HTTP status code from the webhook endpoint */
      httpStatus?: int32;

      /** Response time in milliseconds */
      durationMs?: int32;

      /** Error message if failed */
      error?: string;
    };

    meta: ResponseMeta;
  } | ErrorResponse;

  /**
   * List webhook deliveries
   *
   * View delivery history for debugging.
   */
  @route("/{webhookId}/deliveries")
  @get
  @summary("List webhook deliveries")
  listDeliveries(
    /** Organization ID */
    @path orgId: string,

    /** Webhook ID */
    @path webhookId: string,

    /** Page number */
    @query page?: int32 = 1,

    /** Items per page */
    @query pageSize?: int32 = 50,

    /** Filter by status */
    @query status?: WebhookDeliveryStatus,

    /** Filter by event type */
    @query eventType?: string,

    /** Filter deliveries after this timestamp */
    @query createdAfter?: utcDateTime
  ): WebhookDeliveryListResponse | ErrorResponse;

  /**
   * Get a specific delivery
   */
  @route("/{webhookId}/deliveries/{deliveryId}")
  @get
  @summary("Get webhook delivery")
  getDelivery(
    /** Organization ID */
    @path orgId: string,

    /** Webhook ID */
    @path webhookId: string,

    /** Delivery ID */
    @path deliveryId: string
  ): WebhookDeliveryResponse | ErrorResponse;

  /**
   * Retry a failed delivery
   *
   * Manually triggers a retry for a failed delivery.
   */
  @route("/{webhookId}/deliveries/{deliveryId}/retry")
  @post
  @summary("Retry delivery")
  retryDelivery(
    /** Organization ID */
    @path orgId: string,

    /** Webhook ID */
    @path webhookId: string,

    /** Delivery ID */
    @path deliveryId: string
  ): WebhookDeliveryResponse | ErrorResponse;
}
