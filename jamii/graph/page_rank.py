"""
User Reputation — PageRank-based user credibility score.
Inspired by Twitter's Tweepcred.

Users who are followed by many reputable users get a higher reputation score.
This is used to boost content from credible authors and suppress spam/low-quality accounts.
"""

from typing import Dict, List
import numpy as np


class UserReputation:
    """
    Computes PageRank-style reputation scores over the follow graph.
    Scores are in [0, 1] — higher means more reputable.
    """

    def __init__(self, damping: float = 0.85, iterations: int = 20):
        self.damping = damping
        self.iterations = iterations
        self._scores: Dict[str, float] = {}

    def compute(self, follow_graph: Dict[str, List[str]]) -> Dict[str, float]:
        """
        follow_graph: { user_id: [list of user_ids they follow] }
        """
        all_users = list(follow_graph.keys())
        n = len(all_users)
        if n == 0:
            return {}

        user_index = {uid: i for i, uid in enumerate(all_users)}
        scores = np.ones(n) / n

        incoming: Dict[int, List[int]] = {i: [] for i in range(n)}
        out_degree: Dict[int, int] = {}

        for user, followees in follow_graph.items():
            i = user_index[user]
            out_degree[i] = len(followees)
            for followee in followees:
                if followee in user_index:
                    j = user_index[followee]
                    incoming[j].append(i)

        for _ in range(self.iterations):
            new_scores = np.ones(n) * (1 - self.damping) / n
            for j in range(n):
                for i in incoming[j]:
                    od = out_degree.get(i, 1)
                    new_scores[j] += self.damping * scores[i] / max(od, 1)
            scores = new_scores

        max_score = scores.max() if scores.max() > 0 else 1.0
        normalized = scores / max_score

        self._scores = {uid: round(float(normalized[user_index[uid]]), 6) for uid in all_users}
        return self._scores

    def get(self, user_id: str, default: float = 0.5) -> float:
        return self._scores.get(user_id, default)

    def is_computed(self) -> bool:
        return len(self._scores) > 0
