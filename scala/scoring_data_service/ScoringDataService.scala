package com.blusce.jamii.scoring_data_service

import scala.collection.concurrent.TrieMap
import scala.collection.mutable

/**
 * ScoringDataService — pre-computed feature server for ranking.
 *
 * Mirrors Twitter's Scoring Data Service:
 * a centralized store of pre-computed features that the heavy ranker
 * (HomeMixer) fetches in a single bulk request rather than recomputing
 * on every feed request.
 *
 * Features served:
 *   - Author engagement rates (per signal type, rolling 7-day window)
 *   - SimCluster scores (user → community vector)
 *   - Real Graph edge weights (user_a → user_b engagement probability)
 *   - Topic affinity scores (user → topic)
 *   - Content quality scores (post → spam/quality signal)
 *   - Audience overlap (post topics vs user interests)
 *
 * Storage:
 *   - Author features: user_id → AuthorFeatures
 *   - Edge features:   (user_a, user_b) → EdgeFeatures
 *   - Post features:   post_id → PostFeatures
 *
 * In production these are pre-computed by batch Spark jobs and served
 * from Manhattan / Memcached. This implementation uses ConcurrentTrieMap.
 *
 * Reference: twitter/the-algorithm →
 *   src/scala/com/twitter/home_mixer/product/scored_tweets/
 */
object ScoringDataService {

  // ─── Feature Records ─────────────────────────────────────────────────────

  /**
   * Pre-computed per-author engagement rates (7-day rolling).
   * Rates are P(engagement | impression) per signal type.
   */
  case class AuthorFeatures(
    authorId:            String,
    likeRate:            Double  = 0.0,
    replyRate:           Double  = 0.0,
    retweetRate:         Double  = 0.0,
    bookmarkRate:        Double  = 0.0,
    reportRate:          Double  = 0.0,
    negFeedbackRate:     Double  = 0.0,
    followerCount:       Long    = 0L,
    followingCount:      Long    = 0L,
    impressionsPerDay:   Double  = 0.0,
    qualityScore:        Double  = 0.5,   // 0..1, higher = better
    accountAgedays:      Int     = 0,
    verifiedAccount:     Boolean = false,
    updatedAtMs:         Long    = 0L,
  )

  /**
   * Pre-computed per-edge (user_a → user_b) Real Graph features.
   * Represents the probability user_a engages with user_b's content.
   */
  case class EdgeFeatures(
    userA:                   String,
    userB:                   String,
    engagementProbability:   Double  = 0.0,  // overall Real Graph score
    recentLikeCount:         Int     = 0,
    recentReplyCount:        Int     = 0,
    recentRetweetCount:      Int     = 0,
    mutualFollowScore:       Double  = 0.0,
    sharedCommunityScore:    Double  = 0.0,
    updatedAtMs:             Long    = 0L,
  )

  /**
   * Pre-computed per-post content and quality features.
   */
  case class PostFeatures(
    postId:              String,
    spamScore:           Double  = 0.0,   // 0..1, higher = more spam-like
    qualityScore:        Double  = 0.5,
    safetyScore:         Double  = 1.0,   // 0..1, lower = unsafe
    sensitiveContent:    Boolean = false,
    topicIds:            List[String] = List.empty,
    languageScore:       Double  = 1.0,   // match confidence
    viralityScore:       Double  = 0.0,   // engagement velocity
    updatedAtMs:         Long    = 0L,
  )

  /**
   * Per-user topic affinity vector.
   * topic_id → affinity score [0, 1]
   */
  case class UserTopicAffinity(
    userId:   String,
    affinities: Map[String, Double],
    updatedAtMs: Long = 0L,
  )
}

class ScoringDataService {
  import ScoringDataService._

  // ─── In-memory stores ─────────────────────────────────────────────────────

  private val authorFeatures    = TrieMap[String, AuthorFeatures]()
  private val edgeFeatures      = TrieMap[(String, String), EdgeFeatures]()
  private val postFeatures      = TrieMap[String, PostFeatures]()
  private val topicAffinities   = TrieMap[String, UserTopicAffinity]()

  // ─── Author Features ──────────────────────────────────────────────────────

  def putAuthorFeatures(f: AuthorFeatures): Unit = authorFeatures(f.authorId) = f
  def getAuthorFeatures(authorId: String): Option[AuthorFeatures] = authorFeatures.get(authorId)

  def bulkGetAuthorFeatures(authorIds: Seq[String]): Map[String, AuthorFeatures] =
    authorIds.flatMap(id => authorFeatures.get(id).map(id -> _)).toMap

  // ─── Edge Features ────────────────────────────────────────────────────────

  def putEdgeFeatures(f: EdgeFeatures): Unit = edgeFeatures((f.userA, f.userB)) = f
  def getEdgeFeatures(userA: String, userB: String): Option[EdgeFeatures] =
    edgeFeatures.get((userA, userB))

  def bulkGetEdgeFeatures(pairs: Seq[(String, String)]): Map[(String, String), EdgeFeatures] =
    pairs.flatMap(p => edgeFeatures.get(p).map(p -> _)).toMap

  // ─── Post Features ────────────────────────────────────────────────────────

  def putPostFeatures(f: PostFeatures): Unit = postFeatures(f.postId) = f
  def getPostFeatures(postId: String): Option[PostFeatures] = postFeatures.get(postId)

  def bulkGetPostFeatures(postIds: Seq[String]): Map[String, PostFeatures] =
    postIds.flatMap(id => postFeatures.get(id).map(id -> _)).toMap

  // ─── Topic Affinity ───────────────────────────────────────────────────────

  def putTopicAffinity(f: UserTopicAffinity): Unit = topicAffinities(f.userId) = f
  def getTopicAffinity(userId: String): Option[UserTopicAffinity] = topicAffinities.get(userId)

  /**
   * Score a post for a user given their topic affinity.
   * Returns a value in [0, 1].
   */
  def topicScore(userId: String, postId: String): Double = {
    val userAffinity = topicAffinities.get(userId).map(_.affinities).getOrElse(Map.empty)
    val postTopics   = postFeatures.get(postId).map(_.topicIds).getOrElse(List.empty)

    if (userAffinity.isEmpty || postTopics.isEmpty) return 0.0

    val scores = postTopics.flatMap(t => userAffinity.get(t))
    if (scores.isEmpty) 0.0 else scores.sum / scores.length
  }

  // ─── Bulk Scoring ─────────────────────────────────────────────────────────

  /**
   * Score a set of candidate posts for a requesting user.
   * Returns a map of post_id → composite quality score.
   *
   * Composite score:
   *   0.40 × author_quality
   *   0.30 × topic_affinity
   *   0.20 × edge_engagement_probability (if edge exists)
   *   0.10 × post_quality
   */
  def scorePostsForUser(
    userId:     String,
    postIds:    Seq[String],
    postAuthors: Map[String, String],  // post_id → author_id
  ): Map[String, Double] = {

    val postFeat   = bulkGetPostFeatures(postIds)
    val authorIds  = postAuthors.values.toSeq.distinct
    val authorFeat = bulkGetAuthorFeatures(authorIds)

    postIds.map { postId =>
      val authorId    = postAuthors.getOrElse(postId, "")
      val authorScore = authorFeat.get(authorId).map(_.qualityScore).getOrElse(0.5)
      val topicAff    = topicScore(userId, postId)
      val edgeScore   = edgeFeatures.get((userId, authorId)).map(_.engagementProbability).getOrElse(0.0)
      val postQuality = postFeat.get(postId).map(_.qualityScore).getOrElse(0.5)

      val composite = 0.40 * authorScore + 0.30 * topicAff + 0.20 * edgeScore + 0.10 * postQuality
      postId -> composite
    }.toMap
  }

  // ─── Batch Ingestion ─────────────────────────────────────────────────────

  /**
   * Ingest pre-computed features from a batch job result.
   * Called by Spark jobs that run every 15 minutes.
   */
  def ingestAuthorBatch(features: Seq[AuthorFeatures]): Int = {
    features.foreach(f => authorFeatures(f.authorId) = f)
    features.length
  }

  def ingestEdgeBatch(features: Seq[EdgeFeatures]): Int = {
    features.foreach(f => edgeFeatures((f.userA, f.userB)) = f)
    features.length
  }

  def ingestPostBatch(features: Seq[PostFeatures]): Int = {
    features.foreach(f => postFeatures(f.postId) = f)
    features.length
  }

  // ─── Stats ───────────────────────────────────────────────────────────────

  def stats: Map[String, Long] = Map(
    "author_features" -> authorFeatures.size.toLong,
    "edge_features"   -> edgeFeatures.size.toLong,
    "post_features"   -> postFeatures.size.toLong,
    "topic_affinities" -> topicAffinities.size.toLong,
  )

  override def toString: String =
    s"ScoringDataService(${authorFeatures.size} authors, ${edgeFeatures.size} edges, " +
    s"${postFeatures.size} posts, ${topicAffinities.size} topic affinities)"
}
