from typing import List, Tuple
from jamii.models import User, Post
from config.settings import MAX_CONSECUTIVE_SAME_AUTHOR, DIVERSITY_INJECT_INTERVAL


class FeedFilter:
    """
    Stage 3 — Filtering & Diversity.
    Enforces diversity rules, deduplication, and discovery injection.
    """

    def __init__(
        self,
        max_consecutive_same_author: int = MAX_CONSECUTIVE_SAME_AUTHOR,
        diversity_inject_interval: int = DIVERSITY_INJECT_INTERVAL,
    ):
        self.max_consecutive = max_consecutive_same_author
        self.inject_interval = diversity_inject_interval

    def filter(
        self,
        user: User,
        ranked: List[Tuple[Post, float]],
        discovery_posts: List[Post],
        limit: int = 50,
    ) -> List[Post]:
        result = []
        consecutive_author_count: dict = {}
        last_author = None
        consecutive_streak = 0
        discovery_queue = list(discovery_posts)

        for i, (post, score) in enumerate(ranked):
            if len(result) >= limit:
                break

            if post.is_sponsored:
                result.append(post)
                continue

            author = post.author_id

            if author == last_author:
                consecutive_streak += 1
            else:
                consecutive_streak = 1
                last_author = author

            if consecutive_streak > self.max_consecutive:
                continue

            if (len(result) + 1) % self.inject_interval == 0 and discovery_queue:
                discovery_post = discovery_queue.pop(0)
                result.append(discovery_post)

            result.append(post)

        return result
