"""
Feed Filter — Stage 9: Final deduplication, consecutive-author cap, discovery injection.
Inspired by Home Mixer's post-selection filters in both Twitter and X-algorithm.

Rules applied:
  - Strict deduplication (no post appears twice)
  - Max N consecutive posts from same author
  - Inject a discovery post every K positions
"""

from typing import List, Tuple, Set
from jamii.models import User, Post
from config.settings import MAX_CONSECUTIVE_SAME_AUTHOR, DIVERSITY_INJECT_INTERVAL


class FeedFilter:
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
        result: List[Post] = []
        seen_ids: Set[str] = set()
        last_author = None
        consecutive_streak = 0
        discovery_queue = [p for p in discovery_posts if p.post_id not in seen_ids]

        for i, (post, score) in enumerate(ranked):
            if len(result) >= limit:
                break

            if post.post_id in seen_ids:
                continue

            if post.is_sponsored:
                result.append(post)
                seen_ids.add(post.post_id)
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
                while discovery_queue:
                    discovery_post = discovery_queue.pop(0)
                    if discovery_post.post_id not in seen_ids:
                        result.append(discovery_post)
                        seen_ids.add(discovery_post.post_id)
                        break

            result.append(post)
            seen_ids.add(post.post_id)

        return result
