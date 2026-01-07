import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

/**
 * Announcement priority level
 */
enum AnnouncementPriority {
  /** Informational announcement (blue) */
  info: "info",
  /** Warning announcement (yellow) */
  warning: "warning",
  /** Critical announcement requiring acknowledgment (red) */
  critical: "critical",
}

/**
 * Announcement scope
 */
enum AnnouncementScope {
  /** System-wide announcement visible to all users */
  system: "system",
  /** Organization-specific announcement */
  organization: "organization",
}

/**
 * User role for targeting
 */
enum AnnouncementTargetRole {
  /** All users */
  all: "all",
  /** Admin users only */
  admin: "admin",
  /** Member users only */
  member: "member",
}

/**
 * Announcement resource model
 */
model Announcement {
  /** Unique announcement identifier */
  @example("ann_abc123")
  id: string;

  /** Organization ID (null for system-wide announcements) */
  @example("org_xyz789")
  orgId?: string;

  /** Announcement title */
  @example("Scheduled Maintenance")
  title: string;

  /** Announcement content (supports markdown) */
  @example("We will be performing scheduled maintenance on...")
  content: string;

  /** Optional link for more information */
  @example("https://status.example.com")
  linkUrl?: string;

  /** Link text */
  @example("View Status Page")
  linkText?: string;

  /** Priority level */
  priority: AnnouncementPriority;

  /** Scope of announcement */
  scope: AnnouncementScope;

  /** Target roles (empty array means all roles) */
  targetRoles: AnnouncementTargetRole[];

  /** Whether users can dismiss this announcement */
  isDismissible: boolean;

  /** Scheduled publish date/time */
  publishAt: utcDateTime;

  /** Optional expiration date/time */
  expiresAt?: utcDateTime;

  /** Whether announcement is active (manually toggled) */
  isActive: boolean;

  /** User ID who created the announcement */
  @example("usr_admin123")
  createdBy: string;

  /** Timestamp when created */
  createdAt: utcDateTime;

  /** Timestamp when last updated */
  updatedAt: utcDateTime;

  /** Timestamp when soft deleted */
  deletedAt?: utcDateTime;

  /** Analytics: total view count */
  viewCount?: int32;

  /** Analytics: total read count */
  readCount?: int32;

  /** Analytics: total acknowledgment count */
  acknowledgeCount?: int32;

  /** Analytics: total dismissal count */
  dismissCount?: int32;
}

/**
 * Announcement interaction tracking
 */
model AnnouncementInteraction {
  /** Unique interaction identifier */
  id: string;

  /** Announcement ID */
  announcementId: string;

  /** User ID */
  userId: string;

  /** Timestamp when user first viewed the announcement */
  viewedAt?: utcDateTime;

  /** Timestamp when user read (opened/expanded) the announcement */
  readAt?: utcDateTime;

  /** Timestamp when user dismissed the announcement */
  dismissedAt?: utcDateTime;

  /** Timestamp when user acknowledged the announcement (critical only) */
  acknowledgedAt?: utcDateTime;

  /** Timestamp when created */
  createdAt: utcDateTime;

  /** Timestamp when last updated */
  updatedAt: utcDateTime;
}

/**
 * Request body for creating an announcement
 */
model CreateAnnouncementRequest {
  /** Organization ID (omit for system-wide announcements) */
  orgId?: string;

  /** Announcement title */
  @minLength(1)
  @maxLength(200)
  @example("System Upgrade Scheduled")
  title: string;

  /** Announcement content (supports markdown) */
  @minLength(1)
  @maxLength(5000)
  @example("We will be upgrading our systems this weekend...")
  content: string;

  /** Optional link for more information */
  @example("https://docs.example.com/upgrade")
  linkUrl?: string;

  /** Link text */
  @example("Learn More")
  linkText?: string;

  /** Priority level (default: info) */
  priority?: AnnouncementPriority;

  /** Scope (default: organization) */
  scope?: AnnouncementScope;

  /** Target roles (empty means all roles) */
  targetRoles?: AnnouncementTargetRole[];

  /** Whether users can dismiss (default: true) */
  isDismissible?: boolean;

  /** Scheduled publish date/time (default: now) */
  publishAt?: utcDateTime;

  /** Optional expiration date/time */
  expiresAt?: utcDateTime;

  /** Whether announcement is active (default: true) */
  isActive?: boolean;
}

/**
 * Request body for updating an announcement
 */
model UpdateAnnouncementRequest {
  /** Announcement title */
  @minLength(1)
  @maxLength(200)
  title?: string;

  /** Announcement content */
  @minLength(1)
  @maxLength(5000)
  content?: string;

  /** Optional link for more information */
  linkUrl?: string;

  /** Link text */
  linkText?: string;

  /** Priority level */
  priority?: AnnouncementPriority;

  /** Target roles */
  targetRoles?: AnnouncementTargetRole[];

  /** Whether users can dismiss */
  isDismissible?: boolean;

  /** Scheduled publish date/time */
  publishAt?: utcDateTime;

  /** Optional expiration date/time */
  expiresAt?: utcDateTime;

  /** Whether announcement is active */
  isActive?: boolean;
}

/**
 * Announcement with user interaction data
 */
model AnnouncementWithInteraction {
  ...Announcement;

  /** User's interaction with this announcement */
  interaction?: AnnouncementInteraction;

  /** Whether current user has viewed */
  hasViewed?: boolean;

  /** Whether current user has read */
  hasRead?: boolean;

  /** Whether current user has dismissed */
  hasDismissed?: boolean;

  /** Whether current user has acknowledged */
  hasAcknowledged?: boolean;
}

/**
 * Single announcement response
 */
model AnnouncementResponse {
  data: Announcement;
  meta: ResponseMeta;
}

/**
 * Announcement with interaction response
 */
model AnnouncementWithInteractionResponse {
  data: AnnouncementWithInteraction;
  meta: ResponseMeta;
}

/**
 * Announcement collection response
 */
model AnnouncementListResponse {
  data: AnnouncementWithInteraction[];
  pagination: Pagination;
  meta: ResponseMeta;
}

/**
 * Mark as viewed response
 */
model MarkViewedResponse {
  data: {
    /** Announcement ID */
    announcementId: string;

    /** Timestamp when viewed */
    viewedAt: utcDateTime;
  };
  meta: ResponseMeta;
}

/**
 * Mark as read response
 */
model MarkReadResponse {
  data: {
    /** Announcement ID */
    announcementId: string;

    /** Timestamp when read */
    readAt: utcDateTime;
  };
  meta: ResponseMeta;
}

/**
 * Dismiss announcement response
 */
model DismissAnnouncementResponse {
  data: {
    /** Announcement ID */
    announcementId: string;

    /** Timestamp when dismissed */
    dismissedAt: utcDateTime;
  };
  meta: ResponseMeta;
}

/**
 * Acknowledge announcement response
 */
model AcknowledgeAnnouncementResponse {
  data: {
    /** Announcement ID */
    announcementId: string;

    /** Timestamp when acknowledged */
    acknowledgedAt: utcDateTime;
  };
  meta: ResponseMeta;
}

/**
 * Unread announcement count response
 */
model UnreadAnnouncementsResponse {
  data: {
    /** Number of unread announcements */
    unreadCount: int32;

    /** Number of critical announcements requiring acknowledgment */
    criticalCount: int32;
  };
  meta: ResponseMeta;
}

/**
 * Announcement statistics response
 */
model AnnouncementStatsResponse {
  data: {
    /** Total view count */
    viewCount: int32;

    /** Total read count */
    readCount: int32;

    /** Total acknowledgment count */
    acknowledgeCount: int32;

    /** Total dismissal count */
    dismissCount: int32;

    /** View rate percentage */
    viewRate: float32;

    /** Read rate percentage */
    readRate: float32;

    /** Acknowledgment rate percentage (for critical announcements) */
    acknowledgeRate: float32;
  };
  meta: ResponseMeta;
}
