/**
 * ============================================================================
 * PAYMENT WEBHOOKS ROUTES - Payment Provider Webhooks
 * ============================================================================
 *
 * Public webhook endpoints for payment providers (Xendit, Stripe, etc.)
 * Authentication via webhook signature verification only.
 *
 * ============================================================================
 */

import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/payment-event.tsp";

using TypeSpec.Http;

namespace ProjectAPI;

/**
 * Payment Webhooks API
 *
 * Receive and process webhook events from payment providers.
 */
@route("/v1/webhooks/payments")
@tag("Subscriptions")
interface PaymentWebhooks {
  /**
   * Xendit webhook handler
   *
   * Receives webhook events from Xendit.
   * Verifies signature via x-callback-token header.
   */
  @route("/xendit")
  @post
  @summary("Handle Xendit webhook")
  handleXendit(
    /** Xendit callback token (signature) */
    @header("x-callback-token") callbackToken: string,

    /** Webhook payload */
    @body payload: Record<unknown>
  ): WebhookAcknowledgment | ErrorResponse;

  /**
   * Midtrans webhook handler
   *
   * Receives webhook events from Midtrans.
   */
  @route("/midtrans")
  @post
  @summary("Handle Midtrans webhook")
  handleMidtrans(
    /** Webhook payload */
    @body payload: Record<unknown>
  ): WebhookAcknowledgment | ErrorResponse;
}
