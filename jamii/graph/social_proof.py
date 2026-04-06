"""
Social Proof Index — tracks which posts have been engaged with by a user's network.
Inspired by X algorithm's social proof filter.

For out-of-network posts (from people the user doesn't follow),
we require at least 1 connection to have engaged before showing the post.
This prevents cold/spam content from entering the feed.
"""

from typing import Dict, Set, List
from collections import defaultdict


class SocialProofIndex:
    """
    Maintains a mapping of post_id → set of user_ids who engaged.
    Used to determine social proof for out-of-network content.
    """

    def __init__(self):
        self._engagements: Dict[str, Set[str]] = defaultdict(set)

    def record_engagement(self, post_id: str, user_id: str) -> None:
        self._engagements[post_id].add(user_id)

    def get_engagers(self, post_id: str) -> Set[str]:
        return self._engagements.get(post_id, set())

    def social_proof_score(
        self,
        post_id: str,
        viewer_following: List[str],
        viewer_close_friends: List[str],
    ) -> float:
        """
        Returns a score in [0, 1] based on how many of the viewer's
        connections have engaged with this post.
        Close friend engagements count more than regular follows.
        """
        engagers = self.get_engagers(post_id)
        if not engagers:
            return 0.0

        following_set = set(viewer_following)
        close_friends_set = set(viewer_close_friends)

        friend_engagements = len(engagers & close_friends_set)
        follow_engagements = len(engagers & following_set) - friend_engagements

        raw_score = (friend_engagements * 2.0 + follow_engagements * 1.0)
        return round(min(raw_score / 5.0, 1.0), 4)

    def has_social_proof(
        self,
        post_id: str,
        viewer_following: List[str],
        min_connections: int = 1,
    ) -> bool:
        engagers = self.get_engagers(post_id)
        following_set = set(viewer_following)
        return len(engagers & following_set) >= min_connections
