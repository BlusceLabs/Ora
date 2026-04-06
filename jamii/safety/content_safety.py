"""
ContentSafetyScorer — ML-based post content safety scoring.

Extends the rule-based TrustAndSafetyFilter with learned safety signals.

Scores each post across five safety dimensions:
  1. Spam probability       — engagement-bait, repeated posts, hashtag stuffing
  2. Hate speech risk       — elevated risk based on report rate + language patterns
  3. Misinformation risk    — engagement spike without source authority
  4. Graphic content risk   — image/video posts from low-quality authors with high reports
  5. Harassment risk        — directed reply storms, negative feedback clusters

Overall safety score = 1.0 - max(individual risk scores)
A post is removed from the feed if safety_score < threshold (default 0.3).

Design mirrors Twitter's Perspective API integration and internal Safety models:
  - Features are derived from post metadata + author history (no raw text needed)
  - Model weights are initialized from heuristics, updateable via online learning
  - Deterministic inference: given same inputs, always same output

Reference: twitter/the-algorithm →
  home-mixer/src/main/scala/com/twitter/home_mixer/functional_component/filter/
"""

import math
from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class SafetyFeatures:
    """Raw features used by the content safety scorer."""
    post_id:          str
    author_id:        str

    # Author history signals
    author_report_rate:        float = 0.0   # reports / impressions (7d)
    author_neg_feedback_rate:  float = 0.0
    author_quality_score:      float = 0.5   # 0..1 from ScoringDataService
    author_account_age_days:   int   = 365
    author_follower_count:     int   = 100

    # Post-level signals
    hashtag_count:             int   = 0
    has_external_link:         bool  = False
    content_type:              str   = "text"  # text | image | video | audio | link
    report_count:              int   = 0
    neg_feedback_count:        int   = 0

    # Engagement pattern signals
    like_count:                int   = 0
    reply_count:               int   = 0
    share_count:               int   = 0
    engagement_velocity:       float = 0.0   # score / log(age_h + 2)
    reply_to_like_ratio:       float = 0.0   # high = controversial

    # Community signals
    community_report_rate:     float = 0.0   # community-specific report rate


@dataclass
class SafetyScores:
    """Per-dimension safety risk scores and final verdict."""
    post_id:             str
    spam_risk:           float = 0.0   # 0..1, higher = more spam-like
    hate_speech_risk:    float = 0.0
    misinfo_risk:        float = 0.0
    graphic_risk:        float = 0.0
    harassment_risk:     float = 0.0
    safety_score:        float = 1.0   # 1.0 - max(risks); 0 = totally unsafe
    is_safe:             bool  = True
    removal_reason:      Optional[str] = None


# Logistic sigmoid
def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


class ContentSafetyScorer:
    """
    Logistic regression safety scorer with feature engineering.

    Weights are interpretable (hand-tuned to match empirical thresholds)
    and can be fine-tuned via gradient descent on labeled safety data.
    """

    SAFETY_THRESHOLD = 0.30   # posts with safety_score < this are removed

    # Spam weights
    SPAM_WEIGHTS: Dict[str, float] = {
        "author_report_rate":       8.0,
        "hashtag_stuffing":         3.0,   # hashtag_count > 5
        "new_account_link":         2.5,   # age < 30 days AND has_link
        "low_followers_high_vel":   2.0,   # followers < 100 AND velocity > 10
        "repeated_neg_feedback":    5.0,   # neg_feedback_count > 3
        "bias":                    -3.0,
    }

    # Hate speech weights
    HATE_WEIGHTS: Dict[str, float] = {
        "report_rate":              10.0,
        "high_reply_to_like":       2.0,   # ratio > 3.0
        "community_report_rate":    6.0,
        "author_neg_feedback_rate": 4.0,
        "bias":                    -4.0,
    }

    # Misinfo weights
    MISINFO_WEIGHTS: Dict[str, float] = {
        "viral_without_authority":  3.0,   # velocity > 20, followers < 1000
        "link_from_new_account":    2.0,
        "report_rate":              5.0,
        "bias":                    -3.5,
    }

    # Graphic content weights
    GRAPHIC_WEIGHTS: Dict[str, float] = {
        "media_report_rate":        8.0,   # report_rate for image/video
        "author_quality_inverse":   3.0,   # 1 - quality_score
        "bias":                    -5.0,
    }

    # Harassment weights
    HARASSMENT_WEIGHTS: Dict[str, float] = {
        "reply_to_like_ratio":      4.0,
        "report_count":             6.0,
        "neg_feedback_count":       5.0,
        "bias":                    -4.0,
    }

    def score(self, features: SafetyFeatures) -> SafetyScores:
        spam_risk      = self._spam_score(features)
        hate_risk      = self._hate_score(features)
        misinfo_risk   = self._misinfo_score(features)
        graphic_risk   = self._graphic_score(features)
        harassment_risk = self._harassment_score(features)

        max_risk     = max(spam_risk, hate_risk, misinfo_risk, graphic_risk, harassment_risk)
        safety_score = round(1.0 - max_risk, 4)
        is_safe      = safety_score >= self.SAFETY_THRESHOLD

        removal_reason = None
        if not is_safe:
            risks = {
                "spam":        spam_risk,
                "hate_speech": hate_risk,
                "misinfo":     misinfo_risk,
                "graphic":     graphic_risk,
                "harassment":  harassment_risk,
            }
            removal_reason = max(risks, key=risks.get)

        return SafetyScores(
            post_id          = features.post_id,
            spam_risk        = round(spam_risk,       4),
            hate_speech_risk = round(hate_risk,       4),
            misinfo_risk     = round(misinfo_risk,    4),
            graphic_risk     = round(graphic_risk,    4),
            harassment_risk  = round(harassment_risk, 4),
            safety_score     = safety_score,
            is_safe          = is_safe,
            removal_reason   = removal_reason,
        )

    # ─── Per-dimension scoring ─────────────────────────────────────────────

    def _spam_score(self, f: SafetyFeatures) -> float:
        logit = self.SPAM_WEIGHTS["bias"]
        logit += self.SPAM_WEIGHTS["author_report_rate"]   * f.author_report_rate
        logit += self.SPAM_WEIGHTS["hashtag_stuffing"]     * (1.0 if f.hashtag_count > 5 else 0.0)
        logit += self.SPAM_WEIGHTS["new_account_link"]     * (1.0 if f.author_account_age_days < 30 and f.has_external_link else 0.0)
        logit += self.SPAM_WEIGHTS["low_followers_high_vel"] * (1.0 if f.author_follower_count < 100 and f.engagement_velocity > 10 else 0.0)
        logit += self.SPAM_WEIGHTS["repeated_neg_feedback"] * (1.0 if f.neg_feedback_count > 3 else 0.0)
        return _sigmoid(logit)

    def _hate_score(self, f: SafetyFeatures) -> float:
        logit = self.HATE_WEIGHTS["bias"]
        logit += self.HATE_WEIGHTS["report_rate"]              * f.author_report_rate
        logit += self.HATE_WEIGHTS["high_reply_to_like"]       * (1.0 if f.reply_to_like_ratio > 3.0 else 0.0)
        logit += self.HATE_WEIGHTS["community_report_rate"]    * f.community_report_rate
        logit += self.HATE_WEIGHTS["author_neg_feedback_rate"] * f.author_neg_feedback_rate
        return _sigmoid(logit)

    def _misinfo_score(self, f: SafetyFeatures) -> float:
        logit = self.MISINFO_WEIGHTS["bias"]
        viral_no_auth = 1.0 if f.engagement_velocity > 20 and f.author_follower_count < 1000 else 0.0
        logit += self.MISINFO_WEIGHTS["viral_without_authority"] * viral_no_auth
        logit += self.MISINFO_WEIGHTS["link_from_new_account"]   * (1.0 if f.author_account_age_days < 30 and f.has_external_link else 0.0)
        logit += self.MISINFO_WEIGHTS["report_rate"]             * f.author_report_rate
        return _sigmoid(logit)

    def _graphic_score(self, f: SafetyFeatures) -> float:
        if f.content_type not in ("image", "video"):
            return 0.0
        logit = self.GRAPHIC_WEIGHTS["bias"]
        logit += self.GRAPHIC_WEIGHTS["media_report_rate"]     * f.author_report_rate
        logit += self.GRAPHIC_WEIGHTS["author_quality_inverse"] * (1.0 - f.author_quality_score)
        return _sigmoid(logit)

    def _harassment_score(self, f: SafetyFeatures) -> float:
        logit = self.HARASSMENT_WEIGHTS["bias"]
        logit += self.HARASSMENT_WEIGHTS["reply_to_like_ratio"] * min(f.reply_to_like_ratio / 5.0, 1.0)
        logit += self.HARASSMENT_WEIGHTS["report_count"]        * min(f.report_count / 10.0,        1.0)
        logit += self.HARASSMENT_WEIGHTS["neg_feedback_count"]  * min(f.neg_feedback_count / 5.0,   1.0)
        return _sigmoid(logit)

    def batch_score(self, features_list: list) -> list:
        """Score a batch of posts. Returns SafetyScores in the same order."""
        return [self.score(f) for f in features_list]

    def filter_posts(self, posts_with_features: list) -> tuple:
        """
        Filter posts by safety score.

        Args:
            posts_with_features: list of (post, SafetyFeatures) tuples

        Returns:
            (safe_posts, removed_posts, removal_reasons)
        """
        safe, removed, reasons = [], [], {}
        for post, features in posts_with_features:
            scores = self.score(features)
            if scores.is_safe:
                safe.append(post)
            else:
                removed.append(post)
                reasons[post.post_id] = scores.removal_reason
        return safe, removed, reasons
