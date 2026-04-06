"""
SimClusters — Community detection and sparse embeddings.
Inspired by Twitter's SimClusters (145k communities).

Discovers communities via matrix factorization on the follow graph.
Maps both users and posts into the same community embedding space,
enabling similarity computation between any user-user or user-post pair.

Phase 1: Rule-based community assignment by language + country + interests.
Phase 2: Full matrix factorization using sklearn NMF.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from jamii.models import User, Post


class SimClusters:
    """
    Sparse community embeddings for users and posts.
    Each user/post is represented as a sparse vector over K communities.
    """

    def __init__(self, n_communities: int = 100):
        self.n_communities = n_communities
        self._user_embeddings: Dict[str, np.ndarray] = {}
        self._post_embeddings: Dict[str, np.ndarray] = {}
        self._community_labels: List[str] = []
        self._fitted = False

    def fit(self, users: Dict[str, User], posts: Dict[str, Post]) -> None:
        self._build_community_labels(users)
        for user in users.values():
            self._user_embeddings[user.user_id] = self._embed_user(user)
        for post in posts.values():
            self._post_embeddings[post.post_id] = self._embed_post(post, users)
        self._fitted = True

    def user_embedding(self, user_id: str) -> Optional[np.ndarray]:
        return self._user_embeddings.get(user_id)

    def post_embedding(self, post_id: str) -> Optional[np.ndarray]:
        return self._post_embeddings.get(post_id)

    def user_post_similarity(self, user_id: str, post_id: str) -> float:
        u_emb = self._user_embeddings.get(user_id)
        p_emb = self._post_embeddings.get(post_id)
        if u_emb is None or p_emb is None:
            return 0.0
        return float(self._cosine(u_emb, p_emb))

    def user_user_similarity(self, user_id_a: str, user_id_b: str) -> float:
        a = self._user_embeddings.get(user_id_a)
        b = self._user_embeddings.get(user_id_b)
        if a is None or b is None:
            return 0.0
        return float(self._cosine(a, b))

    def top_communities(self, user_id: str, top_k: int = 5) -> List[Tuple[str, float]]:
        emb = self._user_embeddings.get(user_id)
        if emb is None:
            return []
        top_indices = np.argsort(emb)[::-1][:top_k]
        return [(self._community_labels[i] if i < len(self._community_labels) else f"c_{i}", float(emb[i]))
                for i in top_indices if emb[i] > 0]

    def update_post_embedding(self, post_id: str, user_id: str) -> None:
        u_emb = self._user_embeddings.get(user_id)
        if u_emb is None:
            return
        existing = self._post_embeddings.get(post_id, np.zeros(self.n_communities))
        self._post_embeddings[post_id] = existing + u_emb * 0.1

    def _build_community_labels(self, users: Dict[str, User]) -> None:
        langs = sorted({u.language for u in users.values()})
        countries = sorted({u.country for u in users.values()})
        communities = []
        for lang in langs:
            for country in countries:
                communities.append(f"{lang}_{country}")
        padding = self.n_communities - len(communities)
        for i in range(padding):
            communities.append(f"topic_{i}")
        self._community_labels = communities[:self.n_communities]

    def _embed_user(self, user: User) -> np.ndarray:
        vec = np.zeros(self.n_communities)
        for i, label in enumerate(self._community_labels):
            parts = label.split("_")
            if len(parts) >= 2:
                lang, country = parts[0], parts[1]
                if user.language == lang and user.country == country:
                    vec[i] = 1.0
                elif user.language == lang:
                    vec[i] = 0.5
                elif user.country == country:
                    vec[i] = 0.3
        for cid in user.community_ids:
            idx = hash(cid) % self.n_communities
            vec[idx] = max(vec[idx], 0.7)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def _embed_post(self, post: Post, users: Dict[str, User]) -> np.ndarray:
        author = users.get(post.author_id)
        if author:
            base = self._embed_user(author) * 0.8
        else:
            base = np.zeros(self.n_communities)
        for tag in post.hashtags:
            idx = hash(tag) % self.n_communities
            base[idx] = max(base[idx], 0.4)
        norm = np.linalg.norm(base)
        return base / norm if norm > 0 else base

    @staticmethod
    def _cosine(a: np.ndarray, b: np.ndarray) -> float:
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        if denom == 0:
            return 0.0
        return float(np.dot(a, b) / denom)
