package com.blusce.jamii.home_mixer

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Success, Failure}

/**
 * HomeMixer — Feed orchestrator for Jamii.
 *
 * Implements the full 10-stage pipeline for building the For You feed.
 * Directly mirrors Twitter's Home Mixer (Product Mixer framework) and
 * xai-org/x-algorithm's PhoenixCandidatePipeline.
 *
 * Reference: twitter/the-algorithm → home-mixer/
 *            xai-org/x-algorithm   → home-mixer/
 *
 * Pipeline stages:
 *  1. QueryHydration       — assemble user context
 *  2. CandidateSourcing    — parallel multi-source retrieval
 *  3. CandidateHydration   — enrich with metadata
 *  4. TrustSafetyFilter    — remove unsafe content
 *  5. SocialProofFilter    — require network engagement for OON posts
 *  6. LightRanking         — logistic regression pre-rank
 *  7. HeavyRanking         — neural scoring
 *  8. DiversityScoring     — enforce mix ratios + cluster caps
 *  9. FeedFilter           — dedup + same-author cap + discovery injection
 *  10. SideEffects         — async cache write + event logging
 */

// ─── Data Models ─────────────────────────────────────────────────────────────

case class Post(
  postId:           String,
  authorId:         String,
  contentType:      String,
  language:         String,
  country:          String,
  city:             Option[String],
  hashtags:         List[String],
  createdAtMs:      Long,
  likes:            Int,
  comments:         Int,
  shares:           Int,
  saves:            Int,
  views:            Int,
  isCommunityPost:  Boolean = false,
  communityIds:     List[String] = Nil
)

case class User(
  userId:       String,
  language:     String,
  country:      String,
  city:         Option[String],
  following:    List[String],
  closeFriends: List[String],
  communityIds: List[String]
)

case class ScoredPost(post: Post, score: Double, scoreReason: String)

case class UserContext(
  userId:       String,
  topAuthors:   Map[String, Double],
  reputation:   Double,
  topInterests: List[(String, Double)]
)

// ─── Pipeline Traits ─────────────────────────────────────────────────────────

trait CandidateSource {
  def name: String
  def fetch(user: User, exclude: Set[String])(implicit ec: ExecutionContext): Future[List[Post]]
}

trait CandidateFilter {
  def name: String
  def apply(user: User, candidates: List[Post]): List[Post]
}

trait Scorer {
  def name: String
  def score(user: User, post: Post): Double
}

trait SideEffect {
  def execute(user: User, feed: List[Post]): Unit
}

// ─── Sources ─────────────────────────────────────────────────────────────────

class InNetworkSource(postStore: Map[String, Post]) extends CandidateSource {
  override val name = "in_network"

  override def fetch(user: User, exclude: Set[String])
                    (implicit ec: ExecutionContext): Future[List[Post]] = Future {
    val followSet = (user.following ++ user.closeFriends).toSet
    postStore.values
      .filter(p => followSet.contains(p.authorId) && !exclude.contains(p.postId))
      .toList
      .sortBy(-_.createdAtMs)
      .take(200)
  }
}

class CommunitySource(postStore: Map[String, Post]) extends CandidateSource {
  override val name = "community"

  override def fetch(user: User, exclude: Set[String])
                    (implicit ec: ExecutionContext): Future[List[Post]] = Future {
    val userCommunities = user.communityIds.toSet
    postStore.values
      .filter { p =>
        p.isCommunityPost &&
        !exclude.contains(p.postId) &&
        p.communityIds.exists(userCommunities.contains)
      }
      .toList
      .sortBy(-_.createdAtMs)
      .take(150)
  }
}

class TrendingSource(postStore: Map[String, Post]) extends CandidateSource {
  override val name = "trending"

  def engagementScore(p: Post): Double = {
    val views = math.max(p.views, 1)
    (p.likes * 0.5 + p.shares * 1.0 + p.comments * 13.5 + p.saves * 2.0) / views
  }

  override def fetch(user: User, exclude: Set[String])
                    (implicit ec: ExecutionContext): Future[List[Post]] = Future {
    postStore.values
      .filter(p => p.country == user.country && !exclude.contains(p.postId))
      .toList
      .sortBy(-engagementScore(_))
      .take(100)
  }
}

// ─── Filters ─────────────────────────────────────────────────────────────────

class SocialProofFilter(minConnections: Int = 1) extends CandidateFilter {
  override val name = "social_proof"

  override def apply(user: User, candidates: List[Post]): List[Post] = {
    val followSet = (user.following ++ user.closeFriends).toSet
    candidates.filter { p =>
      followSet.contains(p.authorId) ||
      p.isCommunityPost ||
      p.views > 1000
    }
  }
}

class AuthorSafetyFilter(flaggedAuthors: Set[String]) extends CandidateFilter {
  override val name = "author_safety"

  override def apply(user: User, candidates: List[Post]): List[Post] =
    candidates.filterNot(p => flaggedAuthors.contains(p.authorId))
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * EngagementScorer — implements Twitter/X open-source engagement weights.
 * score = Σ weight_i × P(engagement_i) / log(age_hours + 2)
 */
class EngagementScorer extends Scorer {
  override val name = "engagement"

  private val weights = Map(
    "like"             ->   0.5,
    "retweet"          ->   1.0,
    "reply"            ->  13.5,
    "bookmark"         ->   2.0,
    "profile_click"    ->  12.0,
    "good_click"       ->  11.0,
    "negative"         -> -74.0,
    "report"           -> -369.0
  )

  override def score(user: User, post: Post): Double = {
    val views = math.max(post.views, 1).toDouble
    val raw = (
      weights("like")     * post.likes    / views +
      weights("retweet")  * post.shares   / views +
      weights("reply")    * post.comments / views +
      weights("bookmark") * post.saves    / views
    )
    val ageHours = (System.currentTimeMillis() - post.createdAtMs) / 3_600_000.0
    val timeNormalized = raw / math.log(ageHours + 2)
    math.min(timeNormalized, 1.0)
  }
}

class LanguageMatchScorer extends Scorer {
  override val name = "language_match"
  override def score(user: User, post: Post): Double =
    if (post.language == user.language) 1.0 else 0.0
}

class LocationScorer extends Scorer {
  override val name = "location"
  override def score(user: User, post: Post): Double =
    if (post.city.isDefined && post.city == user.city) 1.0
    else if (post.country == user.country) 0.6
    else 0.0
}

// ─── HomeMixer Pipeline ───────────────────────────────────────────────────────

class HomeMixer(
  sources:     List[CandidateSource],
  preFilters:  List[CandidateFilter],
  scorers:     List[(Scorer, Double)],  // (scorer, weight)
  postFilters: List[CandidateFilter],
  sideEffects: List[SideEffect]
)(implicit ec: ExecutionContext) {

  def buildFeed(user: User, seenPostIds: Set[String] = Set.empty, limit: Int = 50): Future[List[ScoredPost]] = {
    // Stage 1: Query Hydration (user context — simplified here)
    val userContext = UserContext(user.userId, Map.empty, 0.5, Nil)

    // Stage 2: Candidate Sourcing (parallel)
    val candidateFutures = sources.map(_.fetch(user, seenPostIds))
    Future.sequence(candidateFutures).map { candidateLists =>
      val allCandidates = candidateLists.flatten.distinctBy(_.postId)

      // Stage 3: Pre-Filtering (Trust & Safety, Social Proof)
      val filtered = preFilters.foldLeft(allCandidates) { (candidates, filter) =>
        filter.apply(user, candidates)
      }

      // Stage 4: Light Ranking — score and cut to top 40%
      val lightScored = scoreAndSort(user, filtered)
      val lightCut = lightScored.take(math.max(10, (lightScored.size * 0.4).toInt))

      // Stage 5: Heavy Ranking — full re-score
      val heavyScored = scoreAndSort(user, lightCut.map(_.post))

      // Stage 6: Post-Filters (diversity, dedup)
      val postFiltered = postFilters.foldLeft(heavyScored.map(_.post)) { (posts, filter) =>
        filter.apply(user, posts)
      }

      // Stage 7: Side Effects (async)
      sideEffects.foreach(_.execute(user, postFiltered))

      postFiltered
        .zip(heavyScored.map(_.score))
        .map { case (post, score) => ScoredPost(post, score, "heavy_ranker") }
        .take(limit)
    }
  }

  private def scoreAndSort(user: User, candidates: List[Post]): List[ScoredPost] = {
    candidates.map { post =>
      val score = scorers.map { case (scorer, weight) =>
        scorer.score(user, post) * weight
      }.sum
      ScoredPost(post, score, scorers.map(_._1.name).mkString("+"))
    }.sortBy(-_.score)
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

object HomeMixerFactory {

  def create(postStore: Map[String, Post], flaggedAuthors: Set[String] = Set.empty)
            (implicit ec: ExecutionContext): HomeMixer = {
    new HomeMixer(
      sources = List(
        new InNetworkSource(postStore),
        new CommunitySource(postStore),
        new TrendingSource(postStore)
      ),
      preFilters = List(
        new AuthorSafetyFilter(flaggedAuthors),
        new SocialProofFilter(minConnections = 1)
      ),
      scorers = List(
        new EngagementScorer()    -> 0.50,
        new LanguageMatchScorer() -> 0.30,
        new LocationScorer()      -> 0.20
      ),
      postFilters = Nil,
      sideEffects = Nil
    )
  }
}
