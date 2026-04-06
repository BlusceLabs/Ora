package com.blusce.jamii.real_graph

import scala.collection.mutable

/**
 * Real Graph — predicts the likelihood of engagement between two users.
 *
 * Twitter's most important component for ranking in-network tweets.
 * The higher the Real Graph score between viewer and author, the more of
 * the author's tweets are included as candidates and ranked higher.
 *
 * Reference: twitter/the-algorithm →
 *   src/scala/com/twitter/interaction_graph/README.md
 *
 * Features used to predict engagement probability:
 *   - Reciprocal follow (both follow each other)
 *   - Reply frequency (viewer → author)
 *   - Like frequency
 *   - Retweet frequency
 *   - Profile visits
 *   - DM frequency
 *   - Follow recency (newer follows have higher initial score)
 *
 * Score is a weighted sum with time decay (half-life: 30 days).
 * Score range: [0, 100.0], used as percentage of confidence.
 *
 * Deployment:
 *   - Scores stored in Manhattan (distributed KV store)
 *   - Queried at feed-build time by CR-Mixer
 *   - Updated daily by a Scalding batch job + real-time incremental updates
 */
object RealGraph {

  type UserId = String

  // ─── Interaction Types & Weights ──────────────────────────────────────────

  sealed trait InteractionType {
    val weight: Double
  }

  case object Like            extends InteractionType { val weight = 0.5  }
  case object Reply           extends InteractionType { val weight = 13.5 }
  case object Retweet         extends InteractionType { val weight = 1.0  }
  case object Quote           extends InteractionType { val weight = 3.0  }
  case object ProfileVisit    extends InteractionType { val weight = 0.1  }
  case object DirectMessage   extends InteractionType { val weight = 5.0  }
  case object Follow          extends InteractionType { val weight = 10.0 }
  case object Bookmark        extends InteractionType { val weight = 2.0  }

  val DECAY_HALF_LIFE_DAYS = 30.0
  val MAX_SCORE            = 100.0

  // ─── Interaction Record ────────────────────────────────────────────────────

  case class Interaction(
    interactionType: InteractionType,
    timestampMs:     Long,
    weight:          Double = 1.0
  )

  case class EdgeScore(
    viewerId:     UserId,
    authorId:     UserId,
    score:        Double,    // [0, 100]
    interactions: Int,
    computedAtMs: Long = System.currentTimeMillis()
  ) {
    def normalized: Double = (score / MAX_SCORE).min(1.0)
  }

  // ─── Score Computation ────────────────────────────────────────────────────

  /**
   * Compute Real Graph score for a (viewer, author) pair.
   * Uses exponential time decay on each interaction.
   */
  def computeScore(interactions: Seq[Interaction]): Double = {
    val nowMs    = System.currentTimeMillis()
    val halfLife = DECAY_HALF_LIFE_DAYS * 86400_000.0  // ms

    val raw = interactions.map { interaction =>
      val ageMs  = (nowMs - interaction.timestampMs).toDouble.max(0)
      val decay  = math.exp(-math.log(2) * ageMs / halfLife)
      interaction.interactionType.weight * interaction.weight * decay
    }.sum

    raw.min(MAX_SCORE)
  }

  // ─── Graph ────────────────────────────────────────────────────────────────

  /**
   * RealGraphStore — in-memory store of all (viewer, author) edge scores.
   * In production backed by Manhattan KV store.
   */
  class RealGraphStore {
    private val interactions = mutable.Map[(UserId, UserId), mutable.Buffer[Interaction]]()
    private val scoreCache   = mutable.Map[(UserId, UserId), EdgeScore]()

    def record(
      viewerId:     UserId,
      authorId:     UserId,
      interaction:  Interaction
    ): Unit = {
      val key = (viewerId, authorId)
      interactions.getOrElseUpdate(key, mutable.Buffer()) += interaction
      val score = computeScore(interactions(key).toSeq)
      scoreCache(key) = EdgeScore(viewerId, authorId, score, interactions(key).size)
    }

    def score(viewerId: UserId, authorId: UserId): Double =
      scoreCache.get((viewerId, authorId)).map(_.score).getOrElse(0.0)

    def normalizedScore(viewerId: UserId, authorId: UserId): Double =
      score(viewerId, authorId) / MAX_SCORE

    def topAuthors(viewerId: UserId, topK: Int = 50): List[(UserId, Double)] =
      scoreCache
        .collect { case ((vid, aid), edge) if vid == viewerId => (aid, edge.score) }
        .toList
        .sortBy(-_._2)
        .take(topK)

    def topViewers(authorId: UserId, topK: Int = 50): List[(UserId, Double)] =
      scoreCache
        .collect { case ((vid, aid), edge) if aid == authorId => (vid, edge.score) }
        .toList
        .sortBy(-_._2)
        .take(topK)

    def totalEdges: Int = scoreCache.size

    def mostEngagedPairs(n: Int = 10): List[EdgeScore] =
      scoreCache.values.toList.sortBy(-_.score).take(n)
  }
}

// ─── Batch Training ───────────────────────────────────────────────────────────

/**
 * RealGraphBatchJob — periodic batch recomputation of all edge scores.
 * In production this is a Scalding MapReduce job running daily.
 */
class RealGraphBatchJob(store: RealGraph.RealGraphStore) {
  import RealGraph._

  def run(events: Seq[(UserId, UserId, InteractionType, Long)]): Unit = {
    val start = System.currentTimeMillis()
    events.foreach { case (viewerId, authorId, itype, ts) =>
      store.record(viewerId, authorId, Interaction(itype, ts))
    }
    println(s"[RealGraph] Processed ${events.size} events in ${System.currentTimeMillis() - start}ms")
    println(s"[RealGraph] Total edges: ${store.totalEdges}")
  }
}
