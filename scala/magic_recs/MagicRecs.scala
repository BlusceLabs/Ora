package com.blusce.jamii.magic_recs

/**
 * MagicRecs — real-time notification and Who-To-Follow recommendations.
 *
 * Mirrors Twitter's MagicRecs component:
 * generates personalized recommendations for:
 *   1. Who To Follow (WTF) — user account recommendations
 *   2. Push Notifications  — "you might like this tweet" real-time alerts
 *   3. New follower promotion — "new people are following X you follow"
 *
 * Reference: twitter/the-algorithm →
 *   follow-recommendations-service/README.md
 *   magic_recs/README.md
 *
 * Signals used for WTF:
 *   - Second-degree network (SONA — Social Network Affinity)
 *   - Address Book import matches (phone/email)
 *   - SimClusters community overlap
 *   - Topic interest alignment
 *   - Engagement history with candidate's content
 *   - Real Graph scores with common followers
 *
 * Scoring formula (weighted linear combination):
 *   score = w1*network_overlap + w2*topic_sim + w3*engagement_hist
 *           + w4*community_sim + w5*geo_proximity
 */
object MagicRecs {
  type UserId = String

  // ─── Signals ─────────────────────────────────────────────────────────────

  case class UserProfile(
    userId:       UserId,
    language:     String,
    country:      String,
    city:         Option[String],
    topTopics:    List[String],
    communityIds: List[String],
    isVerified:   Boolean    = false,
    accountAgeDays: Int      = 0
  )

  case class WTFCandidate(
    userId:          UserId,
    score:           Double,
    networkOverlap:  Int,      // common followers count
    topicSimilarity: Double,
    communitySim:    Double,
    geoScore:        Double,
    reasons:         List[String]
  )

  // ─── Score Weights ────────────────────────────────────────────────────────

  val W_NETWORK_OVERLAP  = 0.40
  val W_TOPIC_SIM        = 0.25
  val W_COMMUNITY_SIM    = 0.20
  val W_GEO_PROXIMITY    = 0.10
  val W_VERIFIED_BONUS   = 0.05

  val MIN_COMMON_FOLLOWERS_FOR_REASON = 2
  val MAX_WTF_RESULTS = 30

  // ─── Who To Follow ───────────────────────────────────────────────────────

  /**
   * Generate Who-To-Follow recommendations for a viewer.
   *
   * @param viewer         requesting user's profile
   * @param candidates     second-degree network accounts (pre-filtered by SocialGraph)
   * @param commonCounts   candidate → count of common followers with viewer
   * @param profiles       all user profiles (for topic/community scoring)
   */
  def whoToFollow(
    viewer:       UserProfile,
    candidates:   Set[UserId],
    commonCounts: Map[UserId, Int],
    profiles:     Map[UserId, UserProfile],
    limit:        Int = MAX_WTF_RESULTS
  ): List[WTFCandidate] = {

    candidates.toList.flatMap { candidateId =>
      profiles.get(candidateId).map { profile =>
        val common   = commonCounts.getOrElse(candidateId, 0)
        val topicSim = jaccardSimilarity(viewer.topTopics.toSet, profile.topTopics.toSet)
        val commSim  = jaccardSimilarity(viewer.communityIds.toSet, profile.communityIds.toSet)
        val geoScore = geoProximity(viewer, profile)
        val verBonus = if (profile.isVerified) W_VERIFIED_BONUS else 0.0

        val networkScore = math.log1p(common) / math.log1p(50.0)  // saturates at ~50 common followers

        val score = W_NETWORK_OVERLAP * networkScore
                  + W_TOPIC_SIM       * topicSim
                  + W_COMMUNITY_SIM   * commSim
                  + W_GEO_PROXIMITY   * geoScore
                  + verBonus

        val reasons = buildReasons(common, topicSim, commSim, geoScore, viewer, profile)

        WTFCandidate(candidateId, score, common, topicSim, commSim, geoScore, reasons)
      }
    }
    .sortBy(-_.score)
    .take(limit)
  }

  // ─── Push Notification Eligibility ───────────────────────────────────────

  /**
   * Should we send a push notification to viewer about this post?
   *
   * Based on Twitter's MagicRecs signal thresholds:
   *   - Author must be in top-K real graph contacts
   *   - Post engagement velocity must be above threshold
   *   - User must not have seen the post already
   *   - Rate limiting: max 1 notif per 30 min per user
   */
  def shouldNotify(
    viewerRealGraphScores: Map[UserId, Double],
    postAuthorId:          UserId,
    postEngagementVelocity: Double,
    alreadySeen:           Boolean,
    lastNotifAgeMinutes:   Double,
    minRealGraphScore:     Double = 30.0,
    minVelocity:           Double = 5.0,
    cooldownMinutes:       Double = 30.0
  ): Boolean = {
    if (alreadySeen)                                         return false
    if (lastNotifAgeMinutes < cooldownMinutes)               return false
    if (postEngagementVelocity < minVelocity)               return false
    viewerRealGraphScores.getOrElse(postAuthorId, 0.0) >= minRealGraphScore
  }

  // ─── New Follower Promotion ───────────────────────────────────────────────

  /**
   * When user B gains a new follower C, should we notify user A
   * (who follows B) about C?
   * "People you might know are now following X you follow."
   */
  def shouldPromoteNewFollower(
    newFollowerId:      UserId,
    targetAuthorId:     UserId,
    viewerFollowing:    Set[UserId],
    viewerProfile:      UserProfile,
    newFollowerProfile: UserProfile,
    minNetworkScore:    Double = 0.3
  ): Boolean = {
    val topicSim = jaccardSimilarity(viewerProfile.topTopics.toSet, newFollowerProfile.topTopics.toSet)
    val commSim  = jaccardSimilarity(viewerProfile.communityIds.toSet, newFollowerProfile.communityIds.toSet)
    val score    = W_TOPIC_SIM * topicSim + W_COMMUNITY_SIM * commSim
    score >= minNetworkScore && !viewerFollowing.contains(newFollowerId)
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private def jaccardSimilarity(a: Set[String], b: Set[String]): Double = {
    if (a.isEmpty && b.isEmpty) return 0.0
    val intersection = a.intersect(b).size.toDouble
    val union        = a.union(b).size.toDouble
    if (union == 0) 0.0 else intersection / union
  }

  private def geoProximity(a: UserProfile, b: UserProfile): Double = {
    if (a.country == b.country && a.city == b.city && a.city.isDefined) 1.0
    else if (a.country == b.country) 0.5
    else 0.0
  }

  private def buildReasons(
    common:   Int,
    topicSim: Double,
    commSim:  Double,
    geoScore: Double,
    viewer:   UserProfile,
    profile:  UserProfile
  ): List[String] = {
    val r = scala.collection.mutable.Buffer[String]()
    if (common >= MIN_COMMON_FOLLOWERS_FOR_REASON)
      r += s"$common people you follow also follow them"
    if (topicSim > 0.3)
      r += s"Interested in ${viewer.topTopics.intersect(profile.topTopics).headOption.getOrElse("similar topics")}"
    if (commSim > 0.3)
      r += "In communities you're active in"
    if (geoScore >= 0.5)
      r += s"Based in ${profile.country}"
    r.toList
  }
}
