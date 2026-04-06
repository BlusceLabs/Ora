"""
Real Graph — predicts the likelihood of engagement between two users.
Inspired by Twitter's Real Graph model.

The higher the Real Graph score between viewer and author,
the more of the author's posts are included as candidates and ranked higher.

Score is computed from historical interaction signals:
  - Likes given by viewer to author's posts
  - Replies made by viewer to author
  - Retweets of author's posts
  - Profile visits by viewer to author
  - Direct messages sent
Each interaction type has a decay factor based on recency.
"""

from typing import Dict, Tuple
from collections import defaultdict
from datetime import datetime
import math


class RealGraph:
    """
    In-memory Real Graph scoring.
    Stores weighted engagement history per (viewer, author) pair.
    At scale this would be backed by a distributed KV store.
    """

    INTERACTION_WEIGHTS = {
        "like": 0.5,
        "reply": 13.5,
        "retweet": 1.0,
        "quote": 3.0,
        "profile_visit": 0.1,
        "dm": 5.0,
        "follow": 10.0,
        "bookmark": 2.0,
    }

    DECAY_HALF_LIFE_DAYS = 30

    def __init__(self):
        self._scores: Dict[Tuple[str, str], float] = defaultdict(float)
        self._interaction_log: Dict[Tuple[str, str], list] = defaultdict(list)

    def record_interaction(
        self,
        viewer_id: str,
        author_id: str,
        interaction_type: str,
        timestamp: datetime = None,
    ) -> None:
        weight = self.INTERACTION_WEIGHTS.get(interaction_type, 0.0)
        if weight == 0.0:
            return
        ts = timestamp or datetime.utcnow()
        self._interaction_log[(viewer_id, author_id)].append((interaction_type, ts, weight))
        self._recompute(viewer_id, author_id)

    def score(self, viewer_id: str, author_id: str) -> float:
        return round(self._scores.get((viewer_id, author_id), 0.0), 6)

    def top_authors(self, viewer_id: str, top_k: int = 50) -> Dict[str, float]:
        relevant = {
            author_id: score
            for (vid, author_id), score in self._scores.items()
            if vid == viewer_id and score > 0
        }
        sorted_authors = sorted(relevant.items(), key=lambda x: x[1], reverse=True)
        return dict(sorted_authors[:top_k])

    def _recompute(self, viewer_id: str, author_id: str) -> None:
        interactions = self._interaction_log[(viewer_id, author_id)]
        now = datetime.utcnow()
        total = 0.0
        for _, ts, weight in interactions:
            age_days = (now - ts).total_seconds() / 86400
            decay = math.exp(-math.log(2) * age_days / self.DECAY_HALF_LIFE_DAYS)
            total += weight * decay
        self._scores[(viewer_id, author_id)] = min(total, 100.0)

    def normalized_score(self, viewer_id: str, author_id: str) -> float:
        raw = self.score(viewer_id, author_id)
        return min(raw / 20.0, 1.0)
