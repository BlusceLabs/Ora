/**
 * scoring.thrift — IDL for ScoringDataService
 *
 * Pre-computed feature serving between the batch pipeline (Spark jobs)
 * and the online ranking layer (HomeMixer / heavy ranker).
 *
 * Reference: twitter/the-algorithm →
 *   home-mixer/src/main/scala/com/twitter/home_mixer/product/scored_tweets/
 */

namespace scala  com.blusce.jamii.scoring
namespace java   com.blusce.jamii.scoring
namespace py     jamii.scoring

// ─── Author Features ─────────────────────────────────────────────────────────

struct AuthorFeatures {
  1: required string author_id,

  // 7-day rolling engagement rates (per impression)
  2: optional double like_rate         = 0.0,
  3: optional double reply_rate        = 0.0,
  4: optional double retweet_rate      = 0.0,
  5: optional double bookmark_rate     = 0.0,
  6: optional double report_rate       = 0.0,
  7: optional double neg_feedback_rate = 0.0,

  // Profile stats
  8: optional i64    follower_count        = 0,
  9: optional i64    following_count       = 0,
 10: optional double impressions_per_day  = 0.0,

  // Quality signals
 11: optional double quality_score    = 0.5,   // 0..1
 12: optional i32    account_age_days = 0,
 13: optional bool   verified         = false,
 14: optional i64    updated_at_ms    = 0,
}

// ─── Edge Features ───────────────────────────────────────────────────────────

struct EdgeFeatures {
  1: required string user_a,
  2: required string user_b,

  3: optional double engagement_probability  = 0.0,
  4: optional i32    recent_like_count       = 0,
  5: optional i32    recent_reply_count      = 0,
  6: optional i32    recent_retweet_count    = 0,
  7: optional double mutual_follow_score     = 0.0,
  8: optional double shared_community_score  = 0.0,
  9: optional i64    updated_at_ms           = 0,
}

// ─── Post Features ───────────────────────────────────────────────────────────

struct PostFeatures {
  1: required string post_id,

  2: optional double spam_score        = 0.0,
  3: optional double quality_score     = 0.5,
  4: optional double safety_score      = 1.0,
  5: optional bool   sensitive_content = false,
  6: optional list<string> topic_ids   = [],
  7: optional double language_score    = 1.0,
  8: optional double virality_score    = 0.0,
  9: optional i64    updated_at_ms     = 0,
}

// ─── Topic Affinity ──────────────────────────────────────────────────────────

struct UserTopicAffinity {
  1: required string user_id,
  2: required map<string, double> affinities,  // topic_id → score [0,1]
  3: optional i64 updated_at_ms = 0,
}

// ─── Request / Response ──────────────────────────────────────────────────────

struct GetAuthorFeaturesRequest {
  1: required list<string> author_ids,
}

struct GetAuthorFeaturesResponse {
  1: required map<string, AuthorFeatures> features,
  2: optional i64 latency_us = 0,
}

struct GetEdgeFeaturesRequest {
  1: required string requesting_user_id,
  2: required list<string> target_user_ids,
}

struct GetEdgeFeaturesResponse {
  1: required map<string, EdgeFeatures> features,  // target_user_id → EdgeFeatures
  2: optional i64 latency_us = 0,
}

struct GetPostFeaturesRequest {
  1: required list<string> post_ids,
}

struct GetPostFeaturesResponse {
  1: required map<string, PostFeatures> features,
  2: optional i64 latency_us = 0,
}

struct ScorePostsRequest {
  1: required string user_id,
  2: required map<string, string> post_author_map,  // post_id → author_id
}

struct ScorePostsResponse {
  1: required map<string, double> scores,  // post_id → composite score [0,1]
  2: optional i64 latency_us = 0,
}

struct IngestBatchRequest {
  1: optional list<AuthorFeatures> author_features = [],
  2: optional list<EdgeFeatures>   edge_features   = [],
  3: optional list<PostFeatures>   post_features   = [],
  4: optional list<UserTopicAffinity> topic_affinities = [],
}

struct IngestBatchResponse {
  1: required i32 author_count,
  2: required i32 edge_count,
  3: required i32 post_count,
  4: required i32 topic_count,
}

struct ServiceStats {
  1: required i64 author_features,
  2: required i64 edge_features,
  3: required i64 post_features,
  4: required i64 topic_affinities,
}

// ─── Service ─────────────────────────────────────────────────────────────────

service ScoringDataService {
  GetAuthorFeaturesResponse getAuthorFeatures(1: GetAuthorFeaturesRequest request),
  GetEdgeFeaturesResponse   getEdgeFeatures(1: GetEdgeFeaturesRequest request),
  GetPostFeaturesResponse   getPostFeatures(1: GetPostFeaturesRequest request),
  ScorePostsResponse        scorePosts(1: ScorePostsRequest request),
  IngestBatchResponse       ingestBatch(1: IngestBatchRequest request),
  ServiceStats              getStats(),
}
