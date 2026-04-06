from typing import List, Dict
from jamii.models import User, Post


class CandidateSourcer:
    """
    Stage 1 — Candidate Sourcing.
    Gathers everything a user could potentially see in their feed.
    Sources: following graph, communities, trending, discovery.
    """

    def __init__(self, post_store: Dict[str, Post]):
        self.post_store = post_store

    def source(self, user: User, seen_post_ids: List[str], limit: int = 500) -> List[Post]:
        candidates = []
        seen = set(seen_post_ids)

        following_posts = self._from_following(user, seen)
        community_posts = self._from_communities(user, seen)
        trending_posts = self._from_trending(user, seen)
        discovery_posts = self._from_discovery(user, seen)

        added_ids = set()
        for pool in [following_posts, community_posts, trending_posts, discovery_posts]:
            for post in pool:
                if post.post_id not in added_ids:
                    candidates.append(post)
                    added_ids.add(post.post_id)

        return candidates[:limit]

    def _from_following(self, user: User, seen: set) -> List[Post]:
        posts = []
        following_set = set(user.following)
        for post in self.post_store.values():
            if post.post_id in seen:
                continue
            if post.author_id in following_set:
                posts.append(post)
        posts.sort(key=lambda p: p.created_at, reverse=True)
        return posts[:200]

    def _from_communities(self, user: User, seen: set) -> List[Post]:
        posts = []
        user_communities = set(user.community_ids)
        for post in self.post_store.values():
            if post.post_id in seen:
                continue
            if post.is_community_post and set(post.author_community_ids) & user_communities:
                posts.append(post)
        posts.sort(key=lambda p: p.created_at, reverse=True)
        return posts[:150]

    def _from_trending(self, user: User, seen: set) -> List[Post]:
        posts = []
        for post in self.post_store.values():
            if post.post_id in seen:
                continue
            if post.country == user.country and post.language == user.language:
                posts.append(post)
        posts.sort(key=lambda p: p.metrics.engagement_score, reverse=True)
        return posts[:100]

    def _from_discovery(self, user: User, seen: set) -> List[Post]:
        posts = []
        already_following = set(user.following) | {user.user_id}
        for post in self.post_store.values():
            if post.post_id in seen:
                continue
            if post.author_id not in already_following and post.language == user.language:
                posts.append(post)
        posts.sort(key=lambda p: p.metrics.engagement_score, reverse=True)
        return posts[:50]
