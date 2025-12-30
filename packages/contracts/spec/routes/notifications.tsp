import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/notification.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * Notifications API endpoints
   *
   * Provides endpoints for:
   * - Sending notifications across multiple channels
   * - Viewing notification history
   * - Managing read/unread status
   * - Soft deleting and restoring notifications
   * - Managing notification preferences
   */
  @route("/v1/notifications")
  @tag("Notifications")
  interface Notifications {
    /**
     * List user's notification history
     * Returns notifications for the authenticated user, excluding soft-deleted ones
     */
    @get
    @summary("List notifications")
    list(
      /** Number of items to return (max: 100) */
      @query limit?: int32 = 50,

      /** Number of items to skip */
      @query offset?: int32 = 0,

      /** Filter by notification channel */
      @query channel?: NotificationChannel,

      /** Filter by notification category */
      @query category?: NotificationCategory,

      /** Filter by notification status */
      @query status?: NotificationStatus
    ): NotificationListResponse | ErrorResponse;

    /**
     * Get a specific notification by ID
     * Only returns notifications owned by the authenticated user
     */
    @get
    @summary("Get notification by ID")
    get(@path id: string): NotificationResponse | ErrorResponse;

    /**
     * Send a notification
     * Queues the notification for delivery through the specified channel
     * Requires authentication. Consider adding authorization for production use.
     */
    @post
    @route("/send")
    @summary("Send notification")
    send(@body request: SendNotificationRequest):
      | SendNotificationResponse
      | ErrorResponse;

    /**
     * Mark a notification as read
     * Updates the readAt timestamp for the notification
     */
    @patch
    @route("/{id}/read")
    @summary("Mark notification as read")
    markRead(@path id: string): {
      @statusCode statusCode: 204;
    } | ErrorResponse;

    /**
     * Mark a notification as unread
     * Clears the readAt timestamp for the notification
     */
    @patch
    @route("/{id}/unread")
    @summary("Mark notification as unread")
    markUnread(@path id: string): {
      @statusCode statusCode: 204;
    } | ErrorResponse;

    /**
     * Mark all notifications as read for the current user
     * Returns the count of notifications that were marked as read
     */
    @post
    @route("/mark-all-read")
    @summary("Mark all notifications as read")
    markAllRead(): MarkAllReadResponse | ErrorResponse;

    /**
     * Get count of unread notifications
     * Returns the number of unread notifications for the current user
     */
    @get
    @route("/unread/count")
    @summary("Get unread notification count")
    getUnreadCount(): UnreadCountResponse | ErrorResponse;

    /**
     * Soft delete a notification
     * Marks the notification as deleted without actually removing it
     */
    @delete
    @route("/{id}")
    @summary("Delete notification")
    delete(@path id: string): {
      @statusCode statusCode: 204;
    } | ErrorResponse;

    /**
     * Restore a soft-deleted notification
     * Clears the deletedAt timestamp to restore the notification
     */
    @post
    @route("/{id}/restore")
    @summary("Restore notification")
    restore(@path id: string): {
      @statusCode statusCode: 204;
    } | ErrorResponse;
  }

  /**
   * Notification Preferences API endpoints
   *
   * Manages user notification preferences including:
   * - Channel enablement (email, SMS, WhatsApp, etc.)
   * - Category preferences (marketing, transactional, etc.)
   * - Quiet hours configuration
   */
  @route("/v1/preferences")
  @tag("Notification Preferences")
  interface NotificationPreferencesRoutes {
    /**
     * Get notification preferences for the current user
     * Returns default values if no preferences are set
     */
    @get
    @summary("Get notification preferences")
    getPreferences(): NotificationPreferencesResponse | ErrorResponse;

    /**
     * Update notification preferences for the current user
     * Supports partial updates - only provided fields will be updated
     */
    @patch
    @summary("Update notification preferences")
    updatePreferences(
      @body request: UpdatePreferencesRequest
    ): NotificationPreferencesResponse | ErrorResponse;
  }
}
