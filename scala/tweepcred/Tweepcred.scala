package com.blusce.jamii.tweepcred

/**
 * Tweepcred — PageRank-based user reputation scoring.
 *
 * Directly mirrors Twitter's Tweepcred batch job:
 * computes PageRank over the follow graph to assign each user a reputation
 * score in [0, 1]. Higher-reputation authors get their content boosted in ranking.
 *
 * Reference: twitter/the-algorithm →
 *   src/scala/com/twitter/graph/batch/job/tweepcred/README
 *
 * Key differences from vanilla PageRank:
 *  - Damping factor 0.85 (standard)
 *  - Scores capped at 100 then normalized to [0, 1]
 *  - Low-degree nodes (< 5 followers) get a floor score
 *  - Verified accounts get a +0.1 score bonus (Africa verified creators)
 *  - Updated in batch every 24 hours
 *
 * Usage in the feed pipeline:
 *  - Reputation score is an input feature to the Heavy Ranker (5% weight)
 *  - Reputation < 0.05 triggers author safety filter (spam/bot heuristic)
 *  - Used by Trust & Safety as a pre-filter threshold
 */
object Tweepcred {

  type UserId     = String
  type FollowGraph = Map[UserId, Set[UserId]]  // user → Set(accounts they follow)

  case class ReputationScore(
    userId:       UserId,
    score:        Double,   // normalized [0, 1]
    rawScore:     Double,   // pre-normalization
    followerCount: Int,
    computedAtMs: Long = System.currentTimeMillis()
  )

  // ─── Constants ─────────────────────────────────────────────────────────────

  val DAMPING_FACTOR      = 0.85
  val MAX_ITERATIONS      = 30
  val CONVERGENCE_THRESH  = 1e-6
  val MIN_SCORE_FLOOR     = 0.05   // low-follower accounts get at least this
  val VERIFIED_BONUS      = 0.10
  val MIN_DEGREE_FOR_FULL = 5      // < 5 followers → floor score only

  // ─── PageRank ──────────────────────────────────────────────────────────────

  /**
   * Compute PageRank over the follow graph.
   *
   * followGraph: Map[userId, Set[followedUserId]]
   * → for each user u, followGraph(u) = users that u follows
   *
   * Returns: Map[userId, normalizedScore]
   */
  def compute(
    followGraph:    FollowGraph,
    verifiedUsers:  Set[UserId] = Set.empty
  ): Map[UserId, ReputationScore] = {

    val allUsers = followGraph.keySet.toVector
    val n        = allUsers.size
    if (n == 0) return Map.empty

    val userIndex = allUsers.zipWithIndex.toMap

    // Build in-link list: who links TO each node
    val inLinks: Map[Int, List[Int]] = {
      val m = scala.collection.mutable.Map[Int, List[Int]]().withDefaultValue(Nil)
      followGraph.foreach { case (uid, followees) =>
        val i = userIndex(uid)
        followees.foreach { fid =>
          userIndex.get(fid).foreach { j =>
            m(j) = i :: m(j)
          }
        }
      }
      m.toMap
    }

    // Out-degree
    val outDegree: Map[Int, Int] = allUsers.zipWithIndex.map { case (uid, i) =>
      i -> followGraph.getOrElse(uid, Set.empty).count(userIndex.contains)
    }.toMap

    // Power iteration
    var scores = Array.fill(n)(1.0 / n)

    var iter = 0
    var converged = false

    while (iter < MAX_ITERATIONS && !converged) {
      val newScores = Array.fill(n)((1.0 - DAMPING_FACTOR) / n)

      for (j <- 0 until n) {
        inLinks.getOrElse(j, Nil).foreach { i =>
          val od = outDegree.getOrElse(i, 1).max(1)
          newScores(j) += DAMPING_FACTOR * scores(i) / od
        }
      }

      // Check convergence
      val delta = (scores zip newScores).map { case (a, b) => math.abs(a - b) }.sum
      converged = delta < CONVERGENCE_THRESH

      scores = newScores
      iter  += 1
    }

    // Normalize to [0, 1]
    val maxScore = scores.max.max(1e-10)

    allUsers.zipWithIndex.map { case (uid, i) =>
      val raw        = scores(i)
      val normalized = (raw / maxScore).min(1.0)
      val followerCount = followGraph.count { case (_, follows) => follows.contains(uid) }

      val adjusted = if (followerCount < MIN_DEGREE_FOR_FULL) {
        MIN_SCORE_FLOOR
      } else {
        val bonus = if (verifiedUsers.contains(uid)) VERIFIED_BONUS else 0.0
        (normalized + bonus).min(1.0)
      }

      uid -> ReputationScore(uid, adjusted, raw, followerCount)
    }.toMap
  }

  // ─── Incremental Update ────────────────────────────────────────────────────

  /**
   * Incremental score update when a new follow edge is added.
   * Used to avoid full recomputation when possible.
   * Full batch recomputation runs every 24h.
   */
  def updateOnFollow(
    scores:      Map[UserId, Double],
    followerId:  UserId,
    followedId:  UserId,
    alpha:       Double = 0.01
  ): Map[UserId, Double] = {
    val followerScore = scores.getOrElse(followerId, 0.5)
    val currentScore  = scores.getOrElse(followedId, 0.5)
    val boost = alpha * followerScore * DAMPING_FACTOR
    scores.updated(followedId, (currentScore + boost).min(1.0))
  }
}

// ─── Batch Job ────────────────────────────────────────────────────────────────

/**
 * TweepcredJob — scheduled batch job that runs Tweepcred every 24 hours.
 * In production this would run as a Scalding/Spark job on Hadoop.
 */
class TweepcredJob {
  import Tweepcred._

  private var latestScores: Map[UserId, ReputationScore] = Map.empty
  private var lastRunMs: Long = 0L

  def run(
    followGraph:   FollowGraph,
    verifiedUsers: Set[UserId] = Set.empty
  ): Map[UserId, ReputationScore] = {
    val start = System.currentTimeMillis()
    latestScores = compute(followGraph, verifiedUsers)
    lastRunMs = System.currentTimeMillis()
    println(s"[Tweepcred] Computed ${latestScores.size} scores in ${lastRunMs - start}ms")
    latestScores
  }

  def getScore(userId: UserId): Double =
    latestScores.get(userId).map(_.score).getOrElse(0.5)

  def topUsers(n: Int = 20): List[ReputationScore] =
    latestScores.values.toList.sortBy(-_.score).take(n)

  def lastRunAge: Long =
    if (lastRunMs == 0) Long.MaxValue
    else System.currentTimeMillis() - lastRunMs
}
