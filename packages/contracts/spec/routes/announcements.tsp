import "@typespec/http";
import "../common/responses.tsp";
import "../common/errors.tsp";
import "../models/announcement.tsp";

using TypeSpec.Http;

namespace ProjectAPI {
  /**
   * Announcements API endpoints
   *
   * Provides endpoints for:
   * - Creating and managing announcements (admin only)
   * - Viewing active announcements (all users)
   * - Tracking user interactions (view, read, dismiss, acknowledge)
   * - Analytics on announcement engagement
   */
  @route("/v1/orgs/{orgId}/announcements")
  @tag("Announcements")
  interface Announcements {
    /**
     * List active announcements for the organization
     * Returns only published, non-expired announcements targeted to the user's role
     * Includes user interaction data (viewed, read, dismissed, acknowledged)
     */
    @get
    @summary("List active announcements")
    list(
      /** Organization ID */
      @path orgId: string,

      /** Page number (1-indexed, default: 1) */
      @query page?: int32 = 1,

      /** Number of items per page (max: 100, default: 20) */
      @query pageSize?: int32 = 20,

      /** Filter by priority */
      @query priority?: AnnouncementPriority,

      /** Filter by scope */
      @query scope?: AnnouncementScope,

      /** Filter by read status ("read" or "unread") */
      @query readStatus?: "read" | "unread",

      /** Filter by dismissed status ("dismissed" or "not-dismissed") */
      @query dismissedStatus?: "dismissed" | "not-dismissed",

      /** Include expired announcements (default: false) */
      @query includeExpired?: boolean = false,

      /** Include inactive announcements (default: false) */
      @query includeInactive?: boolean = false,

      /** Sort order. Use "-field" for descending. Supports: publishAt, createdAt, priority */
      @query orderBy?: string
    ): AnnouncementListResponse | ErrorResponse;

    /**
     * Get a specific announcement by ID
     * Includes user interaction data
     */
    @get
    @summary("Get announcement by ID")
    get(
      /** Organization ID */
      @path orgId: string,

      /** Announcement ID */
      @path announcementId: string
    ): AnnouncementWithInteractionResponse | ErrorResponse;

    /**
     * Create a new announcement
     * Requires admin permission
     */
    @post
    @summary("Create announcement")
    create(
      /** Organization ID */
      @path orgId: string,

      /** Announcement data */
      @body request: CreateAnnouncementRequest
    ): {
      @statusCode statusCode: 201;
      @body body: AnnouncementResponse;
    } | ErrorResponse;

    /**
     * Update an announcement
     * Requires admin permission or ownership
     */
    @patch(#{implicitOptionality: true})
    @summary("Update announcement")
    update(
      /** Organization ID */
      @path orgId: string,

      /** Announcement ID */
      @path announcementId: string,

      /** Updated announcement data */
      @body request: UpdateAnnouncementRequest
    ): AnnouncementResponse | ErrorResponse;

    /**
     * Delete an announcement (soft delete)
     * Requires admin permission or ownership
     */
    @delete
    @summary("Delete announcement")
    delete(
      /** Organization ID */
      @path orgId: string,

      /** Announcement ID */
      @path announcementId: string
    ): SoftDeleteResponse | ErrorResponse;

    /**
     * Mark announcement as viewed
     * Automatically called when announcement is displayed to user
     */
    @post
    @route("/{announcementId}/view")
    @summary("Mark announcement as viewed")
    markViewed(
      /** Organization ID */
      @path orgId: string,

      /** Announcement ID */
      @path announcementId: string
    ): MarkViewedResponse | ErrorResponse;

    /**
     * Mark announcement as read
     * Called when user opens/expands the announcement
     */
    @post
    @route("/{announcementId}/read")
    @summary("Mark announcement as read")
    markRead(
      /** Organization ID */
      @path orgId: string,

      /** Announcement ID */
      @path announcementId: string
    ): MarkReadResponse | ErrorResponse;

    /**
     * Dismiss an announcement
     * Hides the announcement from the user's view
     */
    @post
    @route("/{announcementId}/dismiss")
    @summary("Dismiss announcement")
    dismiss(
      /** Organization ID */
      @path orgId: string,

      /** Announcement ID */
      @path announcementId: string
    ): DismissAnnouncementResponse | ErrorResponse;

    /**
     * Acknowledge a critical announcement
     * Required for critical priority announcements
     */
    @post
    @route("/{announcementId}/acknowledge")
    @summary("Acknowledge critical announcement")
    acknowledge(
      /** Organization ID */
      @path orgId: string,

      /** Announcement ID */
      @path announcementId: string
    ): AcknowledgeAnnouncementResponse | ErrorResponse;

    /**
     * Get unread announcement count for current user
     * Returns count of unread announcements and critical announcements needing acknowledgment
     */
    @get
    @route("/unread-count")
    @summary("Get unread announcement count")
    getUnreadCount(
      /** Organization ID */
      @path orgId: string
    ): UnreadAnnouncementsResponse | ErrorResponse;

    /**
     * Get announcement statistics
     * Returns analytics data for a specific announcement
     * Requires admin permission
     */
    @get
    @route("/{announcementId}/stats")
    @summary("Get announcement statistics")
    getStats(
      /** Organization ID */
      @path orgId: string,

      /** Announcement ID */
      @path announcementId: string
    ): AnnouncementStatsResponse | ErrorResponse;
  }
}
