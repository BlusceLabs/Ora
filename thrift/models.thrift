/**
 * Jamii Feed Algorithm — Core Data Models
 * Thrift IDL shared across all services.
 *
 * Inspired by Twitter's internal Thrift schemas for posts, users,
 * and engagement data used across their recommendation pipeline.
 */

namespace java  com.blusce.jamii.thrift
namespace scala com.blusce.jamii.thrift
namespace py    jamii.thrift

// ─── Enums ───────────────────────────────────────────────────────────────────

enum ContentType {
  TEXT   = 1
  IMAGE  = 2
  VIDEO  = 3
  AUDIO  = 4
  POLL   = 5
  LINK   = 6
}

enum Language {
  EN = 1   // English
  SW = 2   // Swahili
  HA = 3   // Hausa
  YO = 4   // Yoruba
  ZU = 5   // Zulu
  IG = 6   // Igbo
  AM = 7   // Amharic
  FR = 8   // French (West Africa)
}

enum EngagementType {
  LIKE              = 1
  RETWEET           = 2
  REPLY             = 3
  QUOTE             = 4
  BOOKMARK          = 5
  PROFILE_CLICK     = 6
  VIDEO_50_PCT      = 7
  NEGATIVE_FEEDBACK = 8
  REPORT            = 9
}

// ─── Structs ─────────────────────────────────────────────────────────────────

struct ContentMetrics {
  1: required i64   views
  2: required i32   likes
  3: required i32   comments
  4: required i32   shares
  5: required i32   saves
  6: optional double completion_rate
}

struct Post {
  1:  required string        post_id
  2:  required string        author_id
  3:  required ContentType   content_type
  4:  required Language      language
  5:  required string        country
  6:  optional string        city
  7:  required list<string>  hashtags
  8:  required i64           created_at_ms      // epoch millis
  9:  required ContentMetrics metrics
  10: optional bool          is_sponsored       = false
  11: optional bool          is_community_post  = false
  12: optional list<string>  community_ids
}

struct UserPreferences {
  1: optional list<Language>          preferred_languages
  2: optional map<ContentType, double> content_type_weights
}

struct User {
  1:  required string        user_id
  2:  required string        username
  3:  required Language      language
  4:  required string        country
  5:  optional string        city
  6:  required list<string>  following
  7:  required list<string>  close_friends
  8:  required list<string>  community_ids
  9:  optional UserPreferences preferences
  10: optional double        reputation_score
}

struct EngagementEvent {
  1: required string         event_id
  2: required string         user_id
  3: required string         post_id
  4: required EngagementType engagement_type
  5: required i64            timestamp_ms
  6: optional double         dwell_time_ms
}

struct RealGraphEdge {
  1: required string viewer_id
  2: required string author_id
  3: required double score        // [0, 100.0]
  4: required i64    computed_at_ms
}

struct SimClusterEmbedding {
  1: required string          entity_id
  2: required string          entity_type   // "user" | "post"
  3: required map<i32, double> cluster_weights  // sparse vector
  4: required i64             updated_at_ms
}
