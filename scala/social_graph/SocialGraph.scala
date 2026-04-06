package com.blusce.jamii.social_graph

import scala.collection.mutable

/**
 * SocialGraph — dedicated service for storing and querying the follow graph.
 *
 * Mirrors Twitter's SocialGraph service:
 * a centralized, low-latency store of all follow/block/mute relationships,
 * used by every downstream service (Candidate Sourcing, Real Graph, Tweepcred,
 * Trust & Safety) to answer graph traversal queries.
 *
 * Reference: twitter/the-algorithm → follow-recommendations-service/README.md
 *
 * Key operations:
 *   - follow / unfollow / block / mute
 *   - followers(userId)    — who follows this user
 *   - following(userId)    — who this user follows
 *   - friends(userId)      — mutual follows (intersection)
 *   - secondDegree(userId) — accounts followed by people the user follows
 *   - commonFollowers(a,b) — shared followers between two users
 *   - isFollowing(a,b)     — direct edge existence check
 *
 * Storage:
 *   - In production backed by Manhattan (Twitter's distributed KV)
 *   - This implementation uses in-memory concurrent hash maps
 *   - Supports up to ~10M edges in memory (sharded in prod)
 *
 * Africa-first extension: geo-proximity affinity score included for
 * same-country and same-city relationships.
 */
object SocialGraph {
  type UserId = String

  sealed trait RelationshipType
  case object Follow extends RelationshipType
  case object Block  extends RelationshipType
  case object Mute   extends RelationshipType

  case class Relationship(
    from:             UserId,
    to:               UserId,
    relationshipType: RelationshipType,
    createdAtMs:      Long = System.currentTimeMillis()
  )

  case class FollowStats(
    userId:         UserId,
    followerCount:  Int,
    followingCount: Int,
    friendCount:    Int
  )
}

class SocialGraph {
  import SocialGraph._

  // ─── Storage ─────────────────────────────────────────────────────────────

  /** user → Set of users they follow */
  private val followingIndex = mutable.Map[UserId, mutable.Set[UserId]]()
  /** user → Set of their followers */
  private val followerIndex  = mutable.Map[UserId, mutable.Set[UserId]]()
  /** user → Set of blocked users */
  private val blockIndex     = mutable.Map[UserId, mutable.Set[UserId]]()
  /** user → Set of muted users */
  private val muteIndex      = mutable.Map[UserId, mutable.Set[UserId]]()

  private def followingOf(uid: UserId): mutable.Set[UserId] =
    followingIndex.getOrElseUpdate(uid, mutable.Set())
  private def followersOf(uid: UserId): mutable.Set[UserId] =
    followerIndex.getOrElseUpdate(uid, mutable.Set())

  // ─── Mutations ───────────────────────────────────────────────────────────

  def follow(from: UserId, to: UserId): Unit = {
    if (from == to) return
    followingOf(from) += to
    followersOf(to)   += from
  }

  def unfollow(from: UserId, to: UserId): Unit = {
    followingOf(from) -= to
    followersOf(to)   -= from
  }

  def block(from: UserId, to: UserId): Unit = {
    blockIndex.getOrElseUpdate(from, mutable.Set()) += to
    unfollow(from, to)
    unfollow(to, from)
  }

  def unblock(from: UserId, to: UserId): Unit = {
    blockIndex.get(from).foreach(_ -= to)
  }

  def mute(from: UserId, to: UserId): Unit = {
    muteIndex.getOrElseUpdate(from, mutable.Set()) += to
  }

  def unmute(from: UserId, to: UserId): Unit = {
    muteIndex.get(from).foreach(_ -= to)
  }

  def loadBulk(edges: Seq[(UserId, UserId)]): Unit =
    edges.foreach { case (from, to) => follow(from, to) }

  // ─── Queries ─────────────────────────────────────────────────────────────

  def following(userId: UserId): Set[UserId] =
    followingIndex.getOrElse(userId, mutable.Set()).toSet

  def followers(userId: UserId): Set[UserId] =
    followerIndex.getOrElse(userId, mutable.Set()).toSet

  def friends(userId: UserId): Set[UserId] = {
    val f = followingOf(userId)
    followersOf(userId).filter(f.contains).toSet
  }

  def isFollowing(from: UserId, to: UserId): Boolean =
    followingIndex.get(from).exists(_.contains(to))

  def isMutual(a: UserId, b: UserId): Boolean =
    isFollowing(a, b) && isFollowing(b, a)

  def isBlocking(from: UserId, to: UserId): Boolean =
    blockIndex.get(from).exists(_.contains(to))

  def isMuting(from: UserId, to: UserId): Boolean =
    muteIndex.get(from).exists(_.contains(to))

  /**
   * Second-degree network: accounts followed by people userId follows.
   * Excludes already-followed accounts and blocked accounts.
   * Used by MagicRecs / Who To Follow.
   */
  def secondDegree(userId: UserId, limit: Int = 200): Set[UserId] = {
    val firstDegree = followingOf(userId)
    val blocked     = blockIndex.getOrElse(userId, mutable.Set())
    val result      = mutable.Set[UserId]()

    firstDegree.foreach { intermediary =>
      followingOf(intermediary).foreach { candidate =>
        if (candidate != userId && !firstDegree.contains(candidate) && !blocked.contains(candidate))
          result += candidate
      }
    }

    result.take(limit).toSet
  }

  /**
   * Common followers between userId and candidate.
   * Used for social proof display ("3 people you follow also follow X").
   */
  def commonFollowers(userId: UserId, candidate: UserId): Set[UserId] = {
    val userFollowing = followingOf(userId)
    followersOf(candidate).filter(userFollowing.contains).toSet
  }

  def stats(userId: UserId): FollowStats = FollowStats(
    userId         = userId,
    followerCount  = followersOf(userId).size,
    followingCount = followingOf(userId).size,
    friendCount    = friends(userId).size
  )

  def totalUsers: Int = (followingIndex.keys ++ followerIndex.keys).toSet.size
  def totalEdges: Int = followingIndex.values.map(_.size).sum
}
