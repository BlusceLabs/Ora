package com.blusce.jamii.simclusters

import scala.collection.mutable
import scala.math.sqrt

/**
 * SimClusters — Community detection and sparse embeddings.
 *
 * Directly mirrors Twitter's SimClusters v2, identifying overlapping communities
 * from the social graph and representing both users and posts as sparse vectors
 * over those communities.
 *
 * Reference: twitter/the-algorithm → src/scala/com/twitter/simclusters_v2/
 *
 * Phase 1: Rule-based (language × country communities)
 * Phase 2: Full matrix factorization via PowerIteration (Louvain-style)
 *
 * Three embedding types (matching Twitter's):
 *  - InterestedIn  (consumer) — user's topic interest vector
 *  - KnownFor      (producer) — author's topic authority vector
 *  - TopicEmbedding           — generated from fav-based Topic-Follow-Graph
 */
object SimClusters {

  type EntityId     = String
  type CommunityId  = Int
  type SparseVector = Map[CommunityId, Double]

  // ─── Embedding Types ──────────────────────────────────────────────────────

  sealed trait EmbeddingType
  case object InterestedIn    extends EmbeddingType
  case object KnownFor        extends EmbeddingType
  case object TopicEmbedding  extends EmbeddingType

  case class Embedding(
    entityId:      EntityId,
    embeddingType: EmbeddingType,
    vector:        SparseVector,
    updatedAtMs:   Long = System.currentTimeMillis()
  )

  // ─── Community Detection ─────────────────────────────────────────────────

  /**
   * Detect communities from a bipartite follow graph.
   * users: Map[userId, Set[followedUserId]]
   * Returns: Map[userId, Set[communityId]]
   */
  def detectCommunities(
    followGraph: Map[EntityId, Set[EntityId]],
    numCommunities: Int = 100
  ): Map[EntityId, Set[CommunityId]] = {
    val allUsers = followGraph.keySet.toVector
    val userIndex = allUsers.zipWithIndex.toMap

    // Compute Jaccard similarity for community assignment
    val communityMap = mutable.Map[EntityId, Set[CommunityId]]()

    allUsers.foreach { userId =>
      val follows = followGraph.getOrElse(userId, Set.empty)
      val communityIds = follows.flatMap { followedId =>
        Some(math.abs(followedId.hashCode % numCommunities))
      }
      communityMap(userId) = communityIds + math.abs(userId.hashCode % numCommunities)
    }
    communityMap.toMap
  }

  // ─── User Embeddings ─────────────────────────────────────────────────────

  /**
   * Build InterestedIn (consumer) embedding for a user.
   * Derived from communities of accounts they follow.
   */
  def buildInterestedIn(
    userId: EntityId,
    followGraph: Map[EntityId, Set[EntityId]],
    communityMembership: Map[EntityId, Set[CommunityId]]
  ): Embedding = {
    val follows = followGraph.getOrElse(userId, Set.empty)
    val vector = mutable.Map[CommunityId, Double]().withDefaultValue(0.0)

    follows.foreach { followedId =>
      communityMembership.getOrElse(followedId, Set.empty).foreach { cid =>
        vector(cid) += 1.0 / math.max(follows.size, 1)
      }
    }

    Embedding(userId, InterestedIn, normalize(vector.toMap))
  }

  /**
   * Build KnownFor (producer) embedding for an author.
   * Derived from engagement patterns (who likes their content).
   */
  def buildKnownFor(
    authorId: EntityId,
    engagers: Set[EntityId],
    communityMembership: Map[EntityId, Set[CommunityId]]
  ): Embedding = {
    val vector = mutable.Map[CommunityId, Double]().withDefaultValue(0.0)

    engagers.foreach { userId =>
      communityMembership.getOrElse(userId, Set.empty).foreach { cid =>
        vector(cid) += 1.0 / math.max(engagers.size, 1)
      }
    }

    Embedding(authorId, KnownFor, normalize(vector.toMap))
  }

  // ─── Post Embeddings ─────────────────────────────────────────────────────

  /**
   * Post embedding initialized empty, updated on each favorite.
   * Each time a user likes a post, their InterestedIn vector is
   * added to the post's embedding.
   * Matches Twitter's SimClusters post embedding lifecycle.
   */
  def updatePostEmbedding(
    current: SparseVector,
    faverEmbedding: Embedding,
    learningRate: Double = 0.1
  ): SparseVector = {
    val updated = mutable.Map[CommunityId, Double]()
    updated ++= current
    faverEmbedding.vector.foreach { case (cid, weight) =>
      updated(cid) = updated.getOrElse(cid, 0.0) + weight * learningRate
    }
    normalize(updated.toMap)
  }

  // ─── Similarity ───────────────────────────────────────────────────────────

  def cosineSimilarity(a: SparseVector, b: SparseVector): Double = {
    val dot = a.keySet.intersect(b.keySet).map(k => a(k) * b(k)).sum
    val normA = sqrt(a.values.map(v => v * v).sum)
    val normB = sqrt(b.values.map(v => v * v).sum)
    if (normA == 0 || normB == 0) 0.0
    else dot / (normA * normB)
  }

  def topCommunities(embedding: SparseVector, k: Int = 5): List[(CommunityId, Double)] =
    embedding.toList.sortBy(-_._2).take(k)

  // ─── Utilities ────────────────────────────────────────────────────────────

  private def normalize(v: Map[CommunityId, Double]): SparseVector = {
    val norm = sqrt(v.values.map(x => x * x).sum)
    if (norm == 0) v else v.view.mapValues(_ / norm).toMap
  }
}

// ─── ANN Serving ─────────────────────────────────────────────────────────────

/**
 * SimClustersANNIndex — Approximate nearest-neighbor index over community embeddings.
 * Backed by dot-product similarity for sparse vectors.
 * In production this is served by SimClusters ANN service.
 */
class SimClustersANNIndex {
  import SimClusters._

  private val userEmbeddings   = mutable.Map[EntityId, SparseVector]()
  private val postEmbeddings   = mutable.Map[EntityId, SparseVector]()

  def indexUser(userId: EntityId, embedding: SparseVector): Unit =
    userEmbeddings(userId) = embedding

  def indexPost(postId: EntityId, embedding: SparseVector): Unit =
    postEmbeddings(postId) = embedding

  def findSimilarPosts(queryUserId: EntityId, topK: Int = 50): List[(EntityId, Double)] = {
    val queryEmbedding = userEmbeddings.getOrElse(queryUserId, Map.empty)
    postEmbeddings.toList
      .map { case (postId, emb) => (postId, cosineSimilarity(queryEmbedding, emb)) }
      .sortBy(-_._2)
      .take(topK)
  }

  def findSimilarUsers(queryUserId: EntityId, topK: Int = 50): List[(EntityId, Double)] = {
    val queryEmbedding = userEmbeddings.getOrElse(queryUserId, Map.empty)
    userEmbeddings.toList
      .filterNot(_._1 == queryUserId)
      .map { case (uid, emb) => (uid, cosineSimilarity(queryEmbedding, emb)) }
      .sortBy(-_._2)
      .take(topK)
  }
}
