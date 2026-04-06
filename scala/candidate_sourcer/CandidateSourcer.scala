package com.blusce.jamii.candidate_sourcer

import scala.concurrent.{ExecutionContext, Future}

/**
 * CandidateSourcer — Multi-source candidate retrieval (Stage 2).
 *
 * Mirrors Twitter's CR-Mixer (Candidate Retrieval Mixer):
 * a 1-stop-shop for fetching and mixing candidate sources,
 * including a light ranking layer, common filtering layer,
 * and version control system.
 *
 * Reference: twitter/the-algorithm → cr-mixer/
 *
 * Sources:
 *  1. InNetwork    — posts from accounts you follow (Thunder equivalent)
 *  2. Community    — posts from communities you belong to
 *  3. Trending     — top posts in your region
 *  4. GraphJet     — out-of-network via graph traversal (15% of feed)
 *  5. SimClusters  — embedding-space similarity (largest OON source)
 *  6. Discovery    — new creators matching your language
 */

case class CandidatePost(
  postId:       String,
  authorId:     String,
  language:     String,
  country:      String,
  score:        Double,
  source:       String,
  createdAtMs:  Long
)

case class CandidateQuery(
  userId:          String,
  language:        String,
  country:         String,
  following:       Set[String],
  closeFriends:    Set[String],
  communityIds:    Set[String],
  excludePostIds:  Set[String],
  maxCandidates:   Int = 500
)

// ─── Source Trait ─────────────────────────────────────────────────────────────

trait CandidateSource {
  def name: String
  def maxResults: Int
  def fetch(query: CandidateQuery)(implicit ec: ExecutionContext): Future[List[CandidatePost]]
}

// ─── Source Implementations ───────────────────────────────────────────────────

/**
 * InNetworkSource — retrieves posts from followed accounts.
 * This is the largest source (~50% of final feed).
 * Uses Real Graph score to prioritize authors.
 */
class InNetworkSource(
  postStore: Map[String, CandidatePost],
  realGraphScores: Map[(String, String), Double] = Map.empty
) extends CandidateSource {
  override val name       = "in_network"
  override val maxResults = 200

  override def fetch(query: CandidateQuery)
                    (implicit ec: ExecutionContext): Future[List[CandidatePost]] = Future {
    val authorSet = query.following ++ query.closeFriends
    postStore.values
      .filter(p => authorSet.contains(p.authorId) && !query.excludePostIds.contains(p.postId))
      .toList
      .sortBy { p =>
        val rgScore = realGraphScores.getOrElse((query.userId, p.authorId), 0.0)
        -(rgScore * 0.4 + p.score * 0.6)
      }
      .take(maxResults)
      .map(_.copy(source = name))
  }
}

/**
 * CommunitySource — retrieves posts from user's communities.
 */
class CommunitySource(postStore: Map[String, CandidatePost]) extends CandidateSource {
  override val name       = "community"
  override val maxResults = 150

  override def fetch(query: CandidateQuery)
                    (implicit ec: ExecutionContext): Future[List[CandidatePost]] = Future {
    // In production this would call a community membership service
    postStore.values
      .filter(p =>
        !query.excludePostIds.contains(p.postId) &&
        p.country == query.country
      )
      .toList
      .sortBy(-_.score)
      .take(maxResults)
      .map(_.copy(source = name))
  }
}

/**
 * GraphJetSource — out-of-network via interaction graph traversal.
 * Accounts for ~15% of Home Timeline tweets.
 * Traversal: viewer → follows → their liked posts → similar users → their posts
 */
class GraphJetSource(
  userPostEngagements: Map[String, Set[String]],
  postEngagers: Map[String, Set[String]],
  postStore: Map[String, CandidatePost]
) extends CandidateSource {
  override val name       = "graphjet"
  override val maxResults = 75

  override def fetch(query: CandidateQuery)
                    (implicit ec: ExecutionContext): Future[List[CandidatePost]] = Future {
    // Level 1: posts liked by users you follow
    val level1Posts = query.following.flatMap(uid =>
      userPostEngagements.getOrElse(uid, Set.empty)
    ) -- query.excludePostIds

    // Level 2: similar users who liked those posts
    val similarUsers = level1Posts.flatMap(pid =>
      postEngagers.getOrElse(pid, Set.empty)
    ) -- query.following - query.userId

    // Level 3: posts liked by similar users
    val discovered = similarUsers.flatMap(uid =>
      userPostEngagements.getOrElse(uid, Set.empty)
    ) -- query.excludePostIds -- level1Posts

    discovered.toList
      .flatMap(postStore.get)
      .sortBy(-_.score)
      .take(maxResults)
      .map(_.copy(source = name))
  }
}

/**
 * SimClustersSource — embedding-space similarity search.
 * Largest OON source, powered by SimClusters ANN.
 */
class SimClustersSource(
  annIndex: Map[String, List[(String, Double)]],
  postStore: Map[String, CandidatePost]
) extends CandidateSource {
  override val name       = "simclusters"
  override val maxResults = 100

  override def fetch(query: CandidateQuery)
                    (implicit ec: ExecutionContext): Future[List[CandidatePost]] = Future {
    val similar = annIndex.getOrElse(query.userId, Nil)
    similar
      .flatMap { case (postId, sim) => postStore.get(postId).map(p => p.copy(score = sim)) }
      .filterNot(p => query.excludePostIds.contains(p.postId))
      .take(maxResults)
      .map(_.copy(source = name))
  }
}

// ─── Mixer ────────────────────────────────────────────────────────────────────

class CandidateMixer(sources: List[CandidateSource]) {

  def mix(query: CandidateQuery)(implicit ec: ExecutionContext): Future[List[CandidatePost]] = {
    val futures = sources.map(_.fetch(query))
    Future.sequence(futures).map { lists =>
      val seen = scala.collection.mutable.Set[String]()
      lists.flatten
        .filter(p => seen.add(p.postId))
        .take(query.maxCandidates)
    }
  }
}
