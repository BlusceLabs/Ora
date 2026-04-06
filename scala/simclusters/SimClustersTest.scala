package com.blusce.jamii.simclusters

import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers

class SimClustersTest extends AnyFunSuite with Matchers {
  import SimClusters._

  // ─── detectCommunities ─────────────────────────────────────────────────────

  test("detectCommunities returns entry for each user") {
    val graph = Map(
      "u1" -> Set("u2", "u3"),
      "u2" -> Set("u1"),
      "u3" -> Set("u1", "u2")
    )
    val communities = detectCommunities(graph, numCommunities = 10)
    communities.keys should contain allOf ("u1", "u2", "u3")
    communities.values.foreach(_ should not be empty)
  }

  test("detectCommunities handles empty graph") {
    detectCommunities(Map.empty) should be(empty)
  }

  // ─── buildInterestedIn ────────────────────────────────────────────────────

  test("buildInterestedIn produces non-zero embedding for user with follows") {
    val graph = Map("u1" -> Set("u2", "u3"), "u2" -> Set.empty[String], "u3" -> Set.empty[String])
    val membership = Map("u2" -> Set(1, 5), "u3" -> Set(3, 7))
    val emb = buildInterestedIn("u1", graph, membership)
    emb.embeddingType should be(InterestedIn)
    emb.entityId should be("u1")
    emb.vector should not be empty
    val norm = math.sqrt(emb.vector.values.map(v => v * v).sum)
    norm should be(1.0 +- 0.001)
  }

  test("buildInterestedIn returns empty vector for user with no follows") {
    val graph = Map("u1" -> Set.empty[String])
    val emb = buildInterestedIn("u1", graph, Map.empty)
    emb.vector should be(empty)
  }

  // ─── cosine similarity ────────────────────────────────────────────────────

  test("cosineSimilarity is 1 for identical vectors") {
    val v = Map(1 -> 0.5, 2 -> 0.5)
    cosineSimilarity(v, v) should be(1.0 +- 0.001)
  }

  test("cosineSimilarity is 0 for orthogonal vectors") {
    val a = Map(1 -> 1.0)
    val b = Map(2 -> 1.0)
    cosineSimilarity(a, b) should be(0.0 +- 0.001)
  }

  test("cosineSimilarity is 0 for empty vectors") {
    cosineSimilarity(Map.empty, Map.empty) should be(0.0)
  }

  // ─── Post embedding update ────────────────────────────────────────────────

  test("updatePostEmbedding increases weight in relevant clusters") {
    val initial = Map(1 -> 0.5, 2 -> 0.3)
    val faverEmb = Embedding("u1", InterestedIn, Map(1 -> 0.8, 3 -> 0.6), 0L)
    val updated = updatePostEmbedding(initial, faverEmb, learningRate = 0.1)
    updated(1) should be > initial(1)
    updated.contains(3) should be(true)
  }

  // ─── ANN Index ────────────────────────────────────────────────────────────

  test("SimClustersANNIndex returns top-K results") {
    val index = new SimClustersANNIndex()
    index.indexUser("u1", Map(1 -> 1.0, 2 -> 0.5))
    index.indexPost("p1", Map(1 -> 0.9, 2 -> 0.4))
    index.indexPost("p2", Map(5 -> 1.0))

    val results = index.findSimilarPosts("u1", topK = 2)
    results should not be empty
    results.head._1 should be("p1")
  }

  test("findSimilarUsers excludes the query user") {
    val index = new SimClustersANNIndex()
    index.indexUser("u1", Map(1 -> 1.0))
    index.indexUser("u2", Map(1 -> 0.9))
    val results = index.findSimilarUsers("u1", topK = 5)
    results.map(_._1) should not contain "u1"
  }

  // ─── topCommunities ──────────────────────────────────────────────────────

  test("topCommunities returns sorted by weight descending") {
    val v = Map(1 -> 0.1, 2 -> 0.9, 3 -> 0.5)
    val top = topCommunities(v, k = 2)
    top.head._1 should be(2)
    top(1)._1   should be(3)
  }
}
