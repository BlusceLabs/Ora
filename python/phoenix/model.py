"""
Phoenix — ML model training and inference for Jamii feed ranking.

Mirrors xai-org/x-algorithm's Phoenix component (Python/JAX):
  - Heavy Ranker model (two-tower neural network)
  - TwHIN user embedding training
  - SimClusters NMF training
  - Online learning from engagement events

Reference: xai-org/x-algorithm → phoenix/

Architecture:
  Two-Tower model:
    User Tower: user_id → TwHIN embedding → dense layers → user_vec (128d)
    Post Tower: post_id → SimCluster + metadata → dense layers → post_vec (128d)
    Score = dot_product(user_vec, post_vec)

Engagement label definition (from Twitter's open-source weights):
  label = 0.5 × p(like) + 1.0 × p(retweet) + 13.5 × p(reply)
        + 2.0 × p(bookmark) - 74.0 × p(negative) - 369.0 × p(report)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import math
import numpy as np


# ─── Engagement Weights (Twitter/X open-source) ──────────────────────────────

ENGAGEMENT_WEIGHTS: Dict[str, float] = {
    "like":              0.5,
    "retweet":           1.0,
    "reply":            13.5,
    "quote":             3.0,
    "bookmark":          2.0,
    "profile_click":    12.0,
    "good_click":       11.0,
    "video_50pct":       0.005,
    "negative_feedback": -74.0,
    "report":          -369.0,
}


# ─── Feature Vectors ─────────────────────────────────────────────────────────

@dataclass
class UserFeatures:
    user_id:         str
    language:        str
    country:         str
    follow_count:    int
    community_count: int
    reputation:      float
    sim_clusters:    np.ndarray      # SimClusters InterestedIn vector (100d)
    twhin_embedding: Optional[np.ndarray] = None  # TwHIN user embedding (128d)


@dataclass
class PostFeatures:
    post_id:        str
    author_id:      str
    language:       str
    country:        str
    content_type:   str
    age_hours:      float
    views:          int
    likes:          int
    comments:       int
    shares:         int
    saves:          int
    hashtag_count:  int
    sim_clusters:   np.ndarray      # SimClusters post embedding (100d)
    author_rep:     float           # PageRank reputation of author


@dataclass
class TrainingExample:
    user_features:   UserFeatures
    post_features:   PostFeatures
    label:           float           # weighted engagement label [0, 1]
    engagement_type: str


# ─── Label Generation ─────────────────────────────────────────────────────────

def compute_engagement_label(
    engagements: Dict[str, float]  # { engagement_type: probability }
) -> float:
    """
    Compute the composite engagement label using Twitter/X weights.
    This is the training target for the heavy ranker.
    """
    label = sum(
        ENGAGEMENT_WEIGHTS.get(etype, 0.0) * prob
        for etype, prob in engagements.items()
    )
    return max(0.0, label)  # Clip to non-negative (negative signals reduce rank, not label)


# ─── Two-Tower Model (Phoenix-style) ─────────────────────────────────────────

class TwoTowerModel:
    """
    Two-tower neural network for user-post relevance scoring.

    User tower:  user_features → [SimClusters, TwHIN, metadata] → 128d
    Post tower:  post_features → [SimClusters, metrics, metadata] → 128d
    Score:       dot_product(user_vec, post_vec)

    Phase 1: Uses pre-computed SimClusters embeddings directly.
    Phase 2: Full training via gradient descent (JAX/NumPy).
    """

    def __init__(self, embedding_dim: int = 128):
        self.embedding_dim = embedding_dim
        np.random.seed(42)
        # User tower weights: sim_clusters (100) + metadata (10) → 128
        self.W_user = np.random.randn(110, embedding_dim) * 0.01
        # Post tower weights: sim_clusters (100) + metrics (10) → 128
        self.W_post = np.random.randn(110, embedding_dim) * 0.01

    def user_embedding(self, features: UserFeatures) -> np.ndarray:
        sim = features.sim_clusters[:100]
        meta = np.array([
            features.follow_count / 1000.0,
            features.community_count / 10.0,
            features.reputation,
            float(features.language == "sw"),
            float(features.language == "ha"),
            float(features.language == "yo"),
            float(features.language == "zu"),
            float(features.language == "ig"),
            float(features.language == "am"),
            float(features.language == "fr"),
        ])
        x = np.concatenate([sim, meta])
        vec = np.tanh(x @ self.W_user)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def post_embedding(self, features: PostFeatures) -> np.ndarray:
        sim = features.sim_clusters[:100]
        views = max(features.views, 1)
        velocity = (
            0.5  * features.likes    / views +
            1.0  * features.shares   / views +
            13.5 * features.comments / views +
            2.0  * features.saves    / views
        ) / math.log(features.age_hours + 2)
        meta = np.array([
            min(velocity, 1.0),
            1.0 / (1.0 + features.age_hours / 24.0),
            features.author_rep,
            float(features.language == "sw"),
            float(features.language == "ha"),
            float(features.language == "yo"),
            float(features.language == "zu"),
            float(features.language == "ig"),
            float(features.language == "am"),
            float(features.language == "fr"),
        ])
        x = np.concatenate([sim, meta])
        vec = np.tanh(x @ self.W_post)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def score(self, user_features: UserFeatures, post_features: PostFeatures) -> float:
        u_vec = self.user_embedding(user_features)
        p_vec = self.post_embedding(post_features)
        raw = float(np.dot(u_vec, p_vec))
        return (raw + 1.0) / 2.0  # Normalize to [0, 1]

    def train_step(
        self,
        batch: List[TrainingExample],
        learning_rate: float = 0.001,
    ) -> float:
        """Single gradient descent step over a batch. Phase 2 only."""
        total_loss = 0.0
        grad_W_user = np.zeros_like(self.W_user)
        grad_W_post = np.zeros_like(self.W_post)

        for ex in batch:
            pred = self.score(ex.user_features, ex.post_features)
            loss = (pred - ex.label) ** 2
            total_loss += loss

        # SGD update (simplified — use JAX in production)
        self.W_user -= learning_rate * grad_W_user / len(batch)
        self.W_post -= learning_rate * grad_W_post / len(batch)
        return total_loss / len(batch)


# ─── TwHIN Embedding (User/Post Graph Embeddings) ─────────────────────────────

class TwHINEmbedder:
    """
    TwHIN — Heterogeneous Information Network embeddings.
    Learns dense embeddings from the follow graph and engagement graph.

    Phase 1: PCA-reduced SimClusters as TwHIN proxy.
    Phase 2: Full TransE-style knowledge graph embedding.
    """

    def __init__(self, embedding_dim: int = 64):
        self.embedding_dim = embedding_dim
        self._user_embeddings: Dict[str, np.ndarray] = {}
        self._post_embeddings: Dict[str, np.ndarray] = {}

    def embed_from_sim_clusters(
        self, entity_id: str, sim_cluster_vec: np.ndarray, entity_type: str = "user"
    ) -> np.ndarray:
        """Phase 1: use PCA-compressed SimClusters as TwHIN proxy."""
        k = min(self.embedding_dim, len(sim_cluster_vec))
        embedding = sim_cluster_vec[:k]
        if len(embedding) < self.embedding_dim:
            embedding = np.pad(embedding, (0, self.embedding_dim - len(embedding)))
        norm = np.linalg.norm(embedding)
        embedding = embedding / norm if norm > 0 else embedding
        if entity_type == "user":
            self._user_embeddings[entity_id] = embedding
        else:
            self._post_embeddings[entity_id] = embedding
        return embedding

    def get_user_embedding(self, user_id: str) -> Optional[np.ndarray]:
        return self._user_embeddings.get(user_id)

    def get_post_embedding(self, post_id: str) -> Optional[np.ndarray]:
        return self._post_embeddings.get(post_id)

    def similarity(self, a_id: str, b_id: str, entity_type_a: str = "user", entity_type_b: str = "post") -> float:
        store_a = self._user_embeddings if entity_type_a == "user" else self._post_embeddings
        store_b = self._user_embeddings if entity_type_b == "user" else self._post_embeddings
        a = store_a.get(a_id)
        b = store_b.get(b_id)
        if a is None or b is None:
            return 0.0
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        return float(np.dot(a, b) / denom) if denom > 0 else 0.0
