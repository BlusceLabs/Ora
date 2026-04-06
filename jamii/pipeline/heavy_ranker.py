"""
Heavy Ranker — Stage 2b (final neural ranking).
Inspired by Twitter's Heavy Ranker (ReCap / MaskNet) and X-algorithm's Phoenix scorer.

Scores pre-filtered candidates using all available signals:
  - Real Graph engagement probability
  - SimClusters user-post similarity
  - Topic affinity
  - Social proof
  - User reputation (PageRank)
  - Engagement velocity (time-normalized)
  - Content type affinity
  - Language & location match

Returns final ranked feed.
"""

import math
from typing import List, Tuple, Optional, Dict
from jamii.models import User, Post
from jamii.graph.real_graph import RealGraph
from jamii.graph.social_proof import SocialProofIndex
from jamii.graph.page_rank import UserReputation
from jamii.embeddings.sim_clusters import SimClusters
from jamii.embeddings.topic_embeddings import TopicEmbeddings


class HeavyRanker:
    def __init__(
        self,
        real_graph: Optional[RealGraph] = None,
        social_proof: Optional[SocialProofIndex] = None,
        reputation: Optional[UserReputation] = None,
        sim_clusters: Optional[SimClusters] = None,
        topic_embeddings: Optional[TopicEmbeddings] = None,
    ):
        self.real_graph = real_graph or RealGraph()
        self.social_proof = social_proof or SocialProofIndex()
        self.reputation = reputation or UserReputation()
        self.sim_clusters = sim_clusters
        self.topic_embeddings = topic_embeddings

        self.WEIGHTS = {
            "real_graph": 0.25,
            "sim_cluster_sim": 0.15,
            "topic_affinity": 0.10,
            "social_proof": 0.10,
            "reputation": 0.05,
            "engagement_velocity": 0.15,
            "recency": 0.10,
            "language_match": 0.05,
            "location_match": 0.03,
            "content_type_affinity": 0.02,
        }

    def rank(self, user: User, candidates: List[Tuple[Post, float]]) -> List[Tuple[Post, float]]:
        scored = []
        for post, light_score in candidates:
            heavy_score = self._score(user, post)
            blended = 0.3 * light_score + 0.7 * heavy_score
            scored.append((post, round(blended, 6)))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    def _score(self, user: User, post: Post) -> float:
        signals = {
            "real_graph": self._real_graph_signal(user, post),
            "sim_cluster_sim": self._sim_cluster_signal(user, post),
            "topic_affinity": self._topic_affinity_signal(user, post),
            "social_proof": self._social_proof_signal(user, post),
            "reputation": self._reputation_signal(post),
            "engagement_velocity": self._engagement_velocity(post),
            "recency": post.recency_score(),
            "language_match": 1.0 if post.language == user.language else 0.0,
            "location_match": self._location_signal(user, post),
            "content_type_affinity": user.preferences.preferred_content_types.get(
                post.content_type.value, 0.5
            ),
        }
        score = sum(self.WEIGHTS[k] * v for k, v in signals.items())
        return round(min(score, 1.0), 6)

    def _real_graph_signal(self, user: User, post: Post) -> float:
        rg_score = self.real_graph.normalized_score(user.user_id, post.author_id)
        if rg_score > 0:
            return rg_score
        rel = user.relationship_strength(post.author_id)
        return rel

    def _sim_cluster_signal(self, user: User, post: Post) -> float:
        if self.sim_clusters and self.sim_clusters._fitted:
            return self.sim_clusters.user_post_similarity(user.user_id, post.post_id)
        return 0.0

    def _topic_affinity_signal(self, user: User, post: Post) -> float:
        if self.topic_embeddings:
            return self.topic_embeddings.user_topic_affinity(user.user_id, post.post_id)
        return 0.0

    def _social_proof_signal(self, user: User, post: Post) -> float:
        if post.author_id in user.following:
            return 1.0
        return self.social_proof.social_proof_score(
            post.post_id,
            user.following,
            user.close_friends,
        )

    def _reputation_signal(self, post: Post) -> float:
        if self.reputation.is_computed():
            return self.reputation.get(post.author_id, 0.5)
        return 0.5

    def _engagement_velocity(self, post: Post) -> float:
        m = post.metrics
        views = max(m.views, 1)
        age_hours = post.age_in_hours()
        raw = (
            0.5 * (m.likes / views) +
            1.0 * (m.shares / views) +
            13.5 * (m.comments / views) +
            2.0 * (m.saves / views)
        )
        time_normalized = raw / math.log(age_hours + 2)
        return round(min(time_normalized, 1.0), 6)

    def _location_signal(self, user: User, post: Post) -> float:
        if post.city and post.city == user.city:
            return 1.0
        if post.country == user.country:
            return 0.6
        return 0.0
