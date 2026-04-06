from typing import List, Tuple
from jamii.models import User, Post
from config.settings import RANKING_WEIGHTS


class RankingEngine:
    """
    Stage 2 — Ranking Engine.
    Scores each candidate post using weighted signals.
    Returns posts sorted by descending score.
    """

    def __init__(self, weights: dict = None):
        self.weights = weights or RANKING_WEIGHTS

    def rank(self, user: User, candidates: List[Post]) -> List[Tuple[Post, float]]:
        scored = []
        for post in candidates:
            score = self._score(user, post)
            scored.append((post, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    def _score(self, user: User, post: Post) -> float:
        score = 0.0
        score += self.weights["relationship_strength"] * self._relationship_strength(user, post)
        score += self.weights["recency"] * self._recency(post)
        score += self.weights["engagement_velocity"] * self._engagement_velocity(post)
        score += self.weights["content_type_affinity"] * self._content_type_affinity(user, post)
        score += self.weights["language_match"] * self._language_match(user, post)
        score += self.weights["location_proximity"] * self._location_proximity(user, post)
        return round(score, 6)

    def _relationship_strength(self, user: User, post: Post) -> float:
        strength = user.relationship_strength(post.author_id)
        if strength == 0 and user.shares_community(post.author_community_ids):
            strength = 0.3
        return strength

    def _recency(self, post: Post) -> float:
        return post.recency_score()

    def _engagement_velocity(self, post: Post) -> float:
        raw = post.metrics.engagement_score
        return min(raw, 1.0)

    def _content_type_affinity(self, user: User, post: Post) -> float:
        affinity = user.preferences.preferred_content_types
        return affinity.get(post.content_type.value, 0.5)

    def _language_match(self, user: User, post: Post) -> float:
        if post.language == user.language:
            return 1.0
        if post.language in user.preferences.preferred_languages:
            return 0.7
        return 0.0

    def _location_proximity(self, user: User, post: Post) -> float:
        if post.city and post.city == user.city:
            return 1.0
        if post.country == user.country:
            return 0.6
        return 0.0
