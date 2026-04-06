"""
Candidate Sourcer — Stage 1 of the feed pipeline.
Gathers everything a user could potentially see.

Sources (inspired by Twitter/the-algorithm and X-algorithm):
  - In-Network:    Posts from accounts the user follows (Thunder equivalent)
  - Community:     Posts from communities the user belongs to
  - Trending:      Top posts in user's region and language
  - GraphJet:      Discover posts via interaction graph traversal
  - Discovery:     Posts from new creators matching user's language
"""

from typing import List, Dict, Optional
from jamii.models import User, Post
from jamii.graph.interaction_graph import InteractionGraph


class CandidateSourcer:
    def __init__(
        self,
        post_store: Dict[str, Post],
        interaction_graph: Optional[InteractionGraph] = None,
    ):
        self.post_store = post_store
        self.interaction_graph = interaction_graph or InteractionGraph()

    def source(self, user: User, seen_post_ids: List[str], limit: int = 500) -> List[Post]:
        seen = set(seen_post_ids)
        added_ids: set = set()
        candidates: List[Post] = []

        def add_pool(pool: List[Post]) -> None:
            for post in pool:
                if post.post_id not in added_ids:
                    candidates.append(post)
                    added_ids.add(post.post_id)

        add_pool(self._from_following(user, seen))
        add_pool(self._from_communities(user, seen))
        add_pool(self._from_trending(user, seen))
        add_pool(self._from_interaction_graph(user, seen, added_ids))
        add_pool(self._from_discovery(user, seen, added_ids))

        return candidates[:limit]

    def _from_following(self, user: User, seen: set) -> List[Post]:
        following_set = set(user.following) | set(user.close_friends)
        posts = [
            p for p in self.post_store.values()
            if p.post_id not in seen and p.author_id in following_set
        ]
        posts.sort(key=lambda p: p.created_at, reverse=True)
        return posts[:200]

    def _from_communities(self, user: User, seen: set) -> List[Post]:
        user_communities = set(user.community_ids)
        posts = [
            p for p in self.post_store.values()
            if p.post_id not in seen
            and p.is_community_post
            and set(p.author_community_ids) & user_communities
        ]
        posts.sort(key=lambda p: p.created_at, reverse=True)
        return posts[:150]

    def _from_trending(self, user: User, seen: set) -> List[Post]:
        posts = [
            p for p in self.post_store.values()
            if p.post_id not in seen
            and p.country == user.country
            and p.language == user.language
        ]
        posts.sort(key=lambda p: p.metrics.engagement_score, reverse=True)
        return posts[:100]

    def _from_interaction_graph(
        self, user: User, seen: set, added_ids: set
    ) -> List[Post]:
        exclude = seen | added_ids
        discovered_ids = self.interaction_graph.discover_via_traversal(
            viewer_id=user.user_id,
            viewer_following=user.following,
            exclude_post_ids=exclude,
            depth=2,
            max_results=50,
        )
        posts = [self.post_store[pid] for pid in discovered_ids if pid in self.post_store]
        return posts

    def _from_discovery(
        self, user: User, seen: set, added_ids: set
    ) -> List[Post]:
        exclude = seen | added_ids
        already_following = set(user.following) | {user.user_id}
        posts = [
            p for p in self.post_store.values()
            if p.post_id not in exclude
            and p.author_id not in already_following
            and p.language == user.language
        ]
        posts.sort(key=lambda p: p.metrics.engagement_score, reverse=True)
        return posts[:50]
