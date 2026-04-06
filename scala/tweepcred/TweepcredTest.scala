package com.blusce.jamii.tweepcred

import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.should.Matchers

class TweepcredTest extends AnyFunSuite with Matchers {
  import Tweepcred._

  test("compute returns a score for every user") {
    val graph = Map(
      "u1" -> Set("u2", "u3"),
      "u2" -> Set("u1"),
      "u3" -> Set("u1", "u2"),
      "u4" -> Set.empty[String]
    )
    val scores = compute(graph)
    scores.keys should contain allOf ("u1", "u2", "u3", "u4")
  }

  test("all scores are in [0, 1]") {
    val graph = (1 to 20).map { i =>
      s"u$i" -> (1 to i).filter(_ != i).map(j => s"u$j").toSet
    }.toMap
    compute(graph).values.foreach { rs =>
      rs.score should be >= 0.0
      rs.score should be <= 1.0
    }
  }

  test("highly followed users get higher scores") {
    val graph = Map(
      "popular" -> Set.empty[String],
      "u1"  -> Set("popular"),
      "u2"  -> Set("popular"),
      "u3"  -> Set("popular"),
      "u4"  -> Set("popular"),
      "u5"  -> Set("popular"),
      "niche" -> Set.empty[String]
    )
    val scores = compute(graph)
    scores("popular").score should be > scores("niche").score
  }

  test("empty graph returns empty scores") {
    compute(Map.empty) should be(empty)
  }

  test("verified users receive a score bonus") {
    val graph = Map("v1" -> Set.empty[String], "u1" -> Set("v1"))
    val withBonus    = compute(graph, verifiedUsers = Set("v1"))
    val withoutBonus = compute(graph, verifiedUsers = Set.empty)
    withBonus("v1").score should be >= withoutBonus("v1").score
  }

  test("updateOnFollow increases followed user score") {
    val scores = Map("follower" -> 0.8, "followed" -> 0.3)
    val updated = updateOnFollow(scores, "follower", "followed")
    updated("followed") should be > 0.3
  }

  test("TweepcredJob exposes getScore and topUsers") {
    val job = new TweepcredJob()
    val graph = Map("a" -> Set("b", "c"), "b" -> Set("a"), "c" -> Set("a", "b"))
    job.run(graph)
    job.getScore("a") should (be >= 0.0 and be <= 1.0)
    job.topUsers(2).size should be <= 2
  }
}
