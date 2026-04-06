package com.blusce.jamii.user_signal_service

import scala.collection.mutable

/**
 * User Signal Service (USS) — centralized platform to retrieve
 * explicit and implicit user signals for the recommendation pipeline.
 *
 * Directly mirrors Twitter's user-signal-service:
 * a unified hub that aggregates all user engagement signals and makes
 * them available to candidate sourcing, ranking, and filtering stages.
 *
 * Reference: twitter/the-algorithm → user-signal-service/README.md
 *
 * Signal categories:
 *
 * Explicit (user-initiated):
 *   - Likes, retweets, replies, quotes
 *   - Bookmarks, shares
 *   - Profile visits
 *   - Follows, unfollows, mutes, blocks
 *   - Reports, negative feedback
 *
 * Implicit (derived from behavior):
 *   - Post detail page views (dwell time)
 *   - Video watch percentage
 *   - Tweet clicks (link, hashtag, media)
 *   - Scroll velocity (engagement proxy)
 *   - Session start/end events
 *
 * Aggregations provided:
 *   - Recent N interactions (last 7 days)
 *   - Top-K interacted-with authors
 *   - Topic engagement distribution
 *   - Content type affinity
 *   - Negative signal summary (avoid showing similar content)
 */
object UserSignalService {

  type UserId  = String
  type PostId  = String
  type AuthorId = String

  // ─── Signal Types ─────────────────────────────────────────────────────────

  sealed trait SignalType {
    val isPositive: Boolean
    val weight:     Double
  }

  // Explicit positive
  case object Like           extends SignalType { val isPositive = true;  val weight = 0.5  }
  case object Retweet        extends SignalType { val isPositive = true;  val weight = 1.0  }
  case object Reply          extends SignalType { val isPositive = true;  val weight = 13.5 }
  case object Quote          extends SignalType { val isPositive = true;  val weight = 3.0  }
  case object Bookmark       extends SignalType { val isPositive = true;  val weight = 2.0  }

  // Explicit negative
  case object Report         extends SignalType { val isPositive = false; val weight = -369.0 }
  case object NegativeFeedback extends SignalType { val isPositive = false; val weight = -74.0 }
  case object Mute           extends SignalType { val isPositive = false; val weight = -5.0   }
  case object Block          extends SignalType { val isPositive = false; val weight = -10.0  }

  // Implicit
  case object ProfileClick   extends SignalType { val isPositive = true;  val weight = 12.0  }
  case object VideoWatch50   extends SignalType { val isPositive = true;  val weight = 0.005 }
  case object DwellTime      extends SignalType { val isPositive = true;  val weight = 0.2   }
  case object LinkClick      extends SignalType { val isPositive = true;  val weight = 0.3   }

  // ─── Signal Record ─────────────────────────────────────────────────────────

  case class Signal(
    userId:      UserId,
    postId:      PostId,
    authorId:    AuthorId,
    signalType:  SignalType,
    timestampMs: Long,
    metadata:    Map[String, String] = Map.empty
  )

  // ─── Aggregated View ──────────────────────────────────────────────────────

  case class UserSignalSummary(
    userId:            UserId,
    recentLikedPosts:  List[PostId],
    recentLikedAuthors: List[(AuthorId, Int)],
    topicAffinities:   Map[String, Double],
    negativeAuthors:   Set[AuthorId],
    contentTypeWeights: Map[String, Double],
    totalSignals:      Int
  )
}

// ─── Service ──────────────────────────────────────────────────────────────────

class UserSignalService {
  import UserSignalService._

  private val signalStore = mutable.Map[UserId, mutable.Buffer[Signal]]()

  // ─── Write ────────────────────────────────────────────────────────────────

  def record(signal: Signal): Unit = {
    signalStore.getOrElseUpdate(signal.userId, mutable.Buffer()) += signal
  }

  def recordBatch(signals: Seq[Signal]): Unit =
    signals.foreach(record)

  // ─── Read — Raw ───────────────────────────────────────────────────────────

  def getRecentSignals(
    userId:   UserId,
    sinceMs:  Long = System.currentTimeMillis() - 7 * 86400_000L,
    limit:    Int  = 1000
  ): List[Signal] = {
    signalStore
      .getOrElse(userId, mutable.Buffer())
      .filter(_.timestampMs >= sinceMs)
      .sortBy(-_.timestampMs)
      .take(limit)
      .toList
  }

  def getSignalsForPost(userId: UserId, postId: PostId): List[Signal] =
    signalStore.getOrElse(userId, mutable.Buffer()).filter(_.postId == postId).toList

  // ─── Read — Aggregated ────────────────────────────────────────────────────

  def getSummary(userId: UserId, windowDays: Int = 7): UserSignalSummary = {
    val sinceMs = System.currentTimeMillis() - windowDays * 86400_000L
    val signals = getRecentSignals(userId, sinceMs)

    val positiveSignals = signals.filter(_.signalType.isPositive)
    val negativeSignals = signals.filterNot(_.signalType.isPositive)

    val recentLikedPosts = positiveSignals
      .filter(_.signalType == Like)
      .map(_.postId)
      .distinct
      .take(100)

    val recentLikedAuthors = positiveSignals
      .groupBy(_.authorId)
      .view.mapValues(_.size)
      .toList
      .sortBy(-_._2)
      .take(50)

    val negativeAuthors = negativeSignals
      .filter(s => s.signalType == Report || s.signalType == Block || s.signalType == Mute)
      .map(_.authorId)
      .toSet

    UserSignalSummary(
      userId            = userId,
      recentLikedPosts  = recentLikedPosts,
      recentLikedAuthors = recentLikedAuthors,
      topicAffinities   = Map.empty,  // populated by TopicEmbeddings service
      negativeAuthors   = negativeAuthors,
      contentTypeWeights = Map.empty,
      totalSignals      = signals.size
    )
  }

  def hasNegativeSignal(userId: UserId, authorId: AuthorId): Boolean = {
    signalStore.getOrElse(userId, mutable.Buffer()).exists { s =>
      s.authorId == authorId &&
      !s.signalType.isPositive &&
      (s.signalType == Report || s.signalType == Block || s.signalType == Mute)
    }
  }

  def getAuthorEngagementScore(userId: UserId, authorId: AuthorId): Double = {
    signalStore.getOrElse(userId, mutable.Buffer())
      .filter(_.authorId == authorId)
      .map(_.signalType.weight)
      .sum
      .max(0.0)
  }

  def totalUsers: Int  = signalStore.size
  def totalSignals: Int = signalStore.values.map(_.size).sum
}
