package com.blusce.jamii.feature_switches

import scala.collection.concurrent.TrieMap
import scala.util.Random

/**
 * FeatureSwitches (Decider) — runtime feature gating and A/B experiment config.
 *
 * Mirrors Twitter's Decider system:
 * a centralized service that controls feature rollout, experiment assignments,
 * and configuration values without requiring code deployments.
 *
 * Reference: twitter/the-algorithm →
 *   decider/README.md
 *   home-mixer/src/main/scala/com/twitter/home_mixer/util/Decider.scala
 *
 * Features:
 *   - Boolean feature flags (on/off per user or globally)
 *   - Percentage rollouts (e.g. "enable for 10% of users")
 *   - A/B experiment buckets (deterministic per user_id)
 *   - Override values (for individual users, useful in testing)
 *   - Numeric config values (e.g. feed_size, diversity_weights)
 *
 * Decisions are deterministic based on hash(user_id + feature_name),
 * ensuring the same user always gets the same feature variant.
 *
 * Usage:
 *   val decider = new FeatureSwitches()
 *   decider.register("magic_recs_push",     Feature.Bool(enabled = true,   rollout = 0.5))
 *   decider.register("new_diversity_scorer", Feature.Bool(enabled = true,   rollout = 0.1))
 *   decider.register("feed_size",            Feature.Numeric(defaultValue = 50.0))
 *
 *   decider.isEnabled("magic_recs_push", userId = "user_123")  // → true/false
 *   decider.getDouble("feed_size",       userId = "user_123")  // → 50.0
 */
object FeatureSwitches {

  // ─── Feature Definitions ──────────────────────────────────────────────────

  sealed trait Feature

  case class BoolFeature(
    enabled:   Boolean,
    rollout:   Double  = 1.0,   // fraction of users [0,1]
    overrides: Map[String, Boolean] = Map.empty
  ) extends Feature

  case class NumericFeature(
    defaultValue: Double,
    overrides:    Map[String, Double] = Map.empty
  ) extends Feature

  case class StringFeature(
    defaultValue: String,
    overrides:    Map[String, String] = Map.empty
  ) extends Feature

  case class ABTestFeature(
    variants:  List[String],   // e.g. List("control", "treatment_a", "treatment_b")
    weights:   List[Double],   // must sum to 1.0
    overrides: Map[String, String] = Map.empty
  ) extends Feature

  // ─── Pre-defined features ─────────────────────────────────────────────────

  val DEFAULTS: Map[String, Feature] = Map(

    // Pipeline features
    "magic_recs_push_enabled"    -> BoolFeature(enabled = true,  rollout = 0.5),
    "who_to_follow_enabled"      -> BoolFeature(enabled = true,  rollout = 1.0),
    "simclusters_oon_enabled"    -> BoolFeature(enabled = true,  rollout = 0.8),
    "phoenix_retrieval_enabled"  -> BoolFeature(enabled = true,  rollout = 0.3),
    "real_graph_v2_enabled"      -> BoolFeature(enabled = false, rollout = 0.0),
    "topic_social_proof_enabled" -> BoolFeature(enabled = true,  rollout = 1.0),
    "online_learning_enabled"    -> BoolFeature(enabled = true,  rollout = 0.2),

    // Numeric config
    "feed_size"                  -> NumericFeature(defaultValue = 50.0),
    "candidate_pool_size"        -> NumericFeature(defaultValue = 500.0),
    "light_ranker_keep_fraction" -> NumericFeature(defaultValue = 0.4),
    "magic_recs_min_velocity"    -> NumericFeature(defaultValue = 5.0),
    "real_graph_min_score"       -> NumericFeature(defaultValue = 30.0),
    "social_proof_min_score"     -> NumericFeature(defaultValue = 0.1),

    // Diversity mix ratios
    "diversity_in_network_pct"   -> NumericFeature(defaultValue = 0.50),
    "diversity_community_pct"    -> NumericFeature(defaultValue = 0.30),
    "diversity_trending_pct"     -> NumericFeature(defaultValue = 0.10),
    "diversity_discovery_pct"    -> NumericFeature(defaultValue = 0.10),

    // A/B experiments
    "ranking_model_experiment"   -> ABTestFeature(
      variants = List("baseline", "simcluster_boost", "recency_boost"),
      weights  = List(0.5, 0.25, 0.25)
    ),
    "wtf_algorithm_experiment"   -> ABTestFeature(
      variants = List("network_only", "topic_sim", "full_magicrecs"),
      weights  = List(0.34, 0.33, 0.33)
    ),

    // String config
    "feed_ranker_version"        -> StringFeature(defaultValue = "heavy_ranker_v2"),
    "simclusters_model_version"  -> StringFeature(defaultValue = "simclusters_v3"),
  )
}

class FeatureSwitches(
  initial: Map[String, FeatureSwitches.Feature] = FeatureSwitches.DEFAULTS
) {
  import FeatureSwitches._

  private val features = TrieMap[String, Feature](initial.toSeq: _*)

  // ─── Registration ─────────────────────────────────────────────────────────

  def register(name: String, feature: Feature): Unit = features(name) = feature

  def unregister(name: String): Unit = features.remove(name)

  // ─── Boolean ──────────────────────────────────────────────────────────────

  def isEnabled(name: String, userId: String = ""): Boolean = {
    features.get(name) match {
      case Some(BoolFeature(enabled, rollout, overrides)) =>
        overrides.get(userId) match {
          case Some(v) => v
          case None    => enabled && (rollout >= 1.0 || userBucket(userId, name) < rollout)
        }
      case _ => false
    }
  }

  def isDisabled(name: String, userId: String = ""): Boolean = !isEnabled(name, userId)

  // ─── Numeric ──────────────────────────────────────────────────────────────

  def getDouble(name: String, userId: String = ""): Double = {
    features.get(name) match {
      case Some(NumericFeature(default, overrides)) =>
        overrides.getOrElse(userId, default)
      case _ => 0.0
    }
  }

  def getInt(name: String, userId: String = ""): Int = getDouble(name, userId).toInt

  // ─── String ───────────────────────────────────────────────────────────────

  def getString(name: String, userId: String = ""): String = {
    features.get(name) match {
      case Some(StringFeature(default, overrides)) => overrides.getOrElse(userId, default)
      case _ => ""
    }
  }

  // ─── A/B Experiment ──────────────────────────────────────────────────────

  def getVariant(name: String, userId: String): String = {
    features.get(name) match {
      case Some(ABTestFeature(variants, weights, overrides)) =>
        overrides.get(userId) match {
          case Some(v) => v
          case None    =>
            val bucket = userBucket(userId, name)
            var cumulative = 0.0
            var result     = variants.lastOption.getOrElse("control")
            variants.zip(weights).foreach { case (variant, weight) =>
              cumulative += weight
              if (bucket < cumulative && result == variants.last)
                result = variant
            }
            result
        }
      case _ => "control"
    }
  }

  // ─── Override management ─────────────────────────────────────────────────

  def setOverride(name: String, userId: String, value: Boolean): Unit = {
    features.get(name) match {
      case Some(f: BoolFeature) => features(name) = f.copy(overrides = f.overrides + (userId -> value))
      case _ =>
    }
  }

  def setVariantOverride(name: String, userId: String, variant: String): Unit = {
    features.get(name) match {
      case Some(f: ABTestFeature) => features(name) = f.copy(overrides = f.overrides + (userId -> variant))
      case _ =>
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Deterministic [0,1) bucket for a user × feature pair.
   * Same user always gets the same bucket for the same feature.
   */
  private def userBucket(userId: String, featureName: String): Double = {
    val hash = (userId + ":" + featureName).hashCode.toLong & 0xFFFFFFFFL
    (hash % 10_000L) / 10_000.0
  }

  def allFeatures: Map[String, Feature] = features.toMap
  def featureCount: Int = features.size
}
