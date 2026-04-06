/**
 * notification.thrift — Jamii Notification Service IDL
 *
 * Defines types and service interfaces for push notifications,
 * Who-To-Follow (WTF) alerts, and in-app recommendation notifications.
 *
 * Used by MagicRecs service to dispatch recommendations to clients.
 */

namespace java  com.blusce.jamii.notification
namespace scala com.blusce.jamii.notification
namespace py    jamii.notification
namespace rb    jamii.notification

include "models.thrift"

// ─── Notification Types ──────────────────────────────────────────────────────

enum NotificationType {
  MAGIC_RECS_TWEET       = 1   // "You might like this tweet"
  WHO_TO_FOLLOW          = 2   // "People you might know"
  NEW_FOLLOWER_PROMOTION = 3   // "3 people you follow also follow X"
  COMMUNITY_INVITE       = 4   // "Join this community"
  TRENDING_TOPIC         = 5   // "Trending in your area"
  DIGEST                 = 6   // Daily/weekly digest
}

enum DeliveryChannel {
  PUSH    = 1   // Mobile push notification
  IN_APP  = 2   // In-app notification bell
  EMAIL   = 3   // Email digest
  SMS     = 4   // SMS (used in low-connectivity African markets)
}

enum NotificationStatus {
  PENDING   = 1
  SENT      = 2
  DELIVERED = 3
  CLICKED   = 4
  DISMISSED = 5
  FAILED    = 6
}

// ─── Structs ─────────────────────────────────────────────────────────────────

struct WhoToFollowEntry {
  1: required string user_id
  2: required double score
  3: required i32    common_follower_count
  4: required list<string> reason_texts
  5: optional double topic_similarity
  6: optional double community_similarity
}

struct NotificationPayload {
  1: required string            notification_id
  2: required string            recipient_user_id
  3: required NotificationType  type
  4: required DeliveryChannel   channel
  5: required string            title
  6: required string            body
  7: optional string            post_id
  8: optional string            author_user_id
  9: optional list<WhoToFollowEntry> wtf_entries
  10: optional string           deep_link_url
  11: optional string           image_url
  12: optional double           relevance_score
  13: required i64              created_at_ms
  14: optional i64              expires_at_ms
  15: optional map<string, string> metadata
}

struct NotificationResult {
  1: required string            notification_id
  2: required NotificationStatus status
  3: optional string            error_message
  4: optional i64               delivered_at_ms
}

struct WTFRequest {
  1: required string user_id
  2: optional i32    max_results = 20
  3: optional string language
  4: optional string country
}

struct WTFResponse {
  1: required list<WhoToFollowEntry> entries
  2: required i64                    computed_at_ms
}

struct NotificationPreferences {
  1: required string              user_id
  2: required bool                magic_recs_enabled    = true
  3: required bool                wtf_enabled           = true
  4: required bool                community_enabled     = true
  5: required bool                push_enabled          = true
  6: required bool                email_enabled         = false
  7: required bool                sms_enabled           = false
  8: optional i32                 max_push_per_day      = 5
  9: optional string              quiet_hours_start     // e.g. "22:00"
  10: optional string             quiet_hours_end       // e.g. "07:00"
  11: optional list<string>       muted_notification_types
}

// ─── Service ─────────────────────────────────────────────────────────────────

service NotificationService {

  /**
   * Get Who-To-Follow recommendations for a user.
   * Called when user opens the "Connect" or "Discover" tab.
   */
  WTFResponse getWhoToFollow(1: WTFRequest request)
    throws (1: models.ServiceException ex)

  /**
   * Dispatch a push/in-app notification to a user.
   * Returns immediately; delivery happens asynchronously.
   */
  NotificationResult dispatchNotification(1: NotificationPayload payload)
    throws (1: models.ServiceException ex)

  /**
   * Record that a notification was clicked / dismissed.
   * Used for feedback and rate-limiting decisions.
   */
  void recordNotificationEvent(
    1: string notification_id,
    2: NotificationStatus status,
    3: i64 timestamp_ms
  ) throws (1: models.ServiceException ex)

  /**
   * Get or update a user's notification preferences.
   */
  NotificationPreferences getPreferences(1: string user_id)
    throws (1: models.ServiceException ex)

  void updatePreferences(1: NotificationPreferences prefs)
    throws (1: models.ServiceException ex)

  /**
   * Health check.
   */
  bool ping()
}
