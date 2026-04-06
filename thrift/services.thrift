/**
 * Jamii Feed Algorithm — Service Definitions
 * RPC interfaces for all pipeline microservices.
 *
 * Mirrors Twitter's internal Thrift service definitions across
 * CR-Mixer, GraphJet, SimClusters ANN, and Home Mixer.
 */

include "models.thrift"

namespace java  com.blusce.jamii.thrift
namespace scala com.blusce.jamii.thrift
namespace py    jamii.thrift

// ─── Requests / Responses ────────────────────────────────────────────────────

struct FeedRequest {
  1: required string          user_id
  2: optional i32             max_results     = 50
  3: optional list<string>    seen_post_ids
  4: optional bool            bypass_cache    = false
}

struct ScoredPost {
  1: required models.Post     post
  2: required double          score
  3: optional string          score_reason
}

struct FeedResponse {
  1: required list<ScoredPost> feed
  2: required i64              served_at_ms
  3: optional string           pipeline_version
}

struct CandidateRequest {
  1: required string          user_id
  2: required i32             max_candidates  = 500
  3: optional list<string>    exclude_post_ids
}

struct CandidateResponse {
  1: required list<models.Post> candidates
  2: required string            source          // "following"|"community"|"trending"|"graph"|"discovery"
}

struct RankRequest {
  1: required models.User     user
  2: required list<models.Post> candidates
}

struct RankResponse {
  1: required list<ScoredPost> ranked
}

struct SimClusterANNRequest {
  1: required string          query_entity_id
  2: required string          entity_type
  3: required i32             top_k           = 50
}

struct SimClusterANNResponse {
  1: required list<string>    entity_ids
  2: required list<double>    scores
}

// ─── Services ────────────────────────────────────────────────────────────────

/**
 * HomeMixerService — Orchestrates the full 10-stage feed pipeline.
 * Equivalent to Twitter's Home Mixer / X-algorithm's ScoredPostsService.
 */
service HomeMixerService {
  FeedResponse getFeed(1: FeedRequest request)
    throws (1: Exception e)
}

/**
 * CandidateSourcerService — Stage 2: Multi-source candidate retrieval.
 * Equivalent to Twitter's CR-Mixer.
 */
service CandidateSourcerService {
  CandidateResponse getCandidates(1: CandidateRequest request)
    throws (1: Exception e)
}

/**
 * RankingService — Stages 6-7: Light + Heavy ranking.
 */
service RankingService {
  RankResponse rank(1: RankRequest request)
    throws (1: Exception e)
}

/**
 * SimClustersANNService — Approximate nearest-neighbor in community space.
 * Equivalent to Twitter's SimClusters ANN serving service.
 */
service SimClustersANNService {
  SimClusterANNResponse findSimilar(1: SimClusterANNRequest request)
    throws (1: Exception e)
}
