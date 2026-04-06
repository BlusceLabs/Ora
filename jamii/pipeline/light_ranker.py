"""
Light Ranker — Stage 2a (pre-selection before heavy ranking).
Inspired by Twitter's Light Ranker (logistic regression pre-ranker).

Quickly scores a large candidate pool (~500 posts) down to ~150
using fast, interpretable signals. No neural networks — pure weighted math.

Purpose: reduce compute cost before the expensive Heavy Ranker runs.

Engagement scoring formula (from Twitter/X-algorithm):
  score = Σ weight_i × P(engagement_i)

Weights match Twitter's open-sourced heavy ranker weights.
"""

import math
from typing import List, Tuple
from jamii.models import User, Post


ENGAGEMENT_WEIGHTS = {
    "like": 0.5,
    "retweet": 1.0,
    "quote": 3.0,
    "reply": 13.5,
    "bookmark": 2.0,
    "good_click": 11.0,
    "profile_click": 12.0,
    "video_50pct": 0.005,
    "negative_feedback": -74.0,
    "report": -369.0,
}


class LightRanker:
    """
    Fast pre-ranker. Reduces candidate pool from N → top_k.
    Uses engagement-weighted scoring with time decay.
    """

    def __init__(self, keep_fraction: float = 0.4):
        self.keep_fraction = keep_fraction

    def rank(self, user: User, candidates: List[Post]) -> List[Tuple[Post, float]]:
        scored = []
        for post in candidates:
            score = self._score(user, post)
            scored.append((post, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        keep_n = max(10, int(len(scored) * self.keep_fraction))
        return scored[:keep_n]

    def _score(self, user: User, post: Post) -> float:
        engagement = self._engagement_score(post)
        time_decay = self._time_decay(post)
        relationship = user.relationship_strength(post.author_id)
        language_match = 1.0 if post.language == user.language else 0.0
        score = (
            engagement * 0.4 +
            time_decay * 0.3 +
            relationship * 0.2 +
            language_match * 0.1
        )
        return round(score, 6)

    def _engagement_score(self, post: Post) -> float:
        """
        Computes engagement score using Twitter's weighted formula.
        engagement_score / log(age_hours + 2) — X-algorithm's time-normalized score.
        """
        m = post.metrics
        views = max(m.views, 1)

        p_like = m.likes / views
        p_retweet = m.shares / views
        p_reply = m.comments / views
        p_bookmark = m.saves / views
        p_video = m.completion_rate

        raw_score = (
            ENGAGEMENT_WEIGHTS["like"] * p_like +
            ENGAGEMENT_WEIGHTS["retweet"] * p_retweet +
            ENGAGEMENT_WEIGHTS["reply"] * p_reply +
            ENGAGEMENT_WEIGHTS["bookmark"] * p_bookmark +
            ENGAGEMENT_WEIGHTS["video_50pct"] * p_video
        )

        age_hours = post.age_in_hours()
        time_normalized = raw_score / math.log(age_hours + 2)
        return round(min(time_normalized, 1.0), 6)

    def _time_decay(self, post: Post) -> float:
        return post.recency_score()
