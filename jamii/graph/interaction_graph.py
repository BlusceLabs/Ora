"""
Interaction Graph — in-memory User-to-Post interaction graph.
Inspired by Twitter's GraphJet / UTEG (User-Tweet Entity Graph).

Maintains bidirectional edges:
  user → posts they engaged with
  post → users who engaged with it

Used for out-of-network discovery via graph traversal:
"Find posts that users similar to me have engaged with."
"""

from typing import Dict, Set, List, Tuple
from collections import defaultdict
import random


class InteractionGraph:
    def __init__(self):
        self._user_to_posts: Dict[str, Set[str]] = defaultdict(set)
        self._post_to_users: Dict[str, Set[str]] = defaultdict(set)

    def add_edge(self, user_id: str, post_id: str) -> None:
        self._user_to_posts[user_id].add(post_id)
        self._post_to_users[post_id].add(user_id)

    def posts_for_user(self, user_id: str) -> Set[str]:
        return self._user_to_posts.get(user_id, set())

    def users_for_post(self, post_id: str) -> Set[str]:
        return self._post_to_users.get(post_id, set())

    def discover_via_traversal(
        self,
        viewer_id: str,
        viewer_following: List[str],
        exclude_post_ids: Set[str],
        depth: int = 2,
        max_results: int = 50,
    ) -> List[str]:
        """
        Traverse: viewer's follows → their liked posts → other users who liked those posts
        → other posts those users liked. Returns discovered post_ids.
        """
        visited_users: Set[str] = {viewer_id}
        discovered_posts: Set[str] = set()

        seed_users = set(viewer_following) & set(self._user_to_posts.keys())
        if not seed_users:
            return []

        level_1_posts: Set[str] = set()
        for uid in seed_users:
            level_1_posts.update(self._user_to_posts.get(uid, set()))
        level_1_posts -= exclude_post_ids

        if depth == 1:
            return list(level_1_posts)[:max_results]

        similar_users: Set[str] = set()
        for pid in level_1_posts:
            engagers = self._post_to_users.get(pid, set())
            similar_users.update(engagers - visited_users)
        visited_users.update(similar_users)

        for uid in similar_users:
            posts = self._user_to_posts.get(uid, set())
            discovered_posts.update(posts - exclude_post_ids - level_1_posts)

        result = list(discovered_posts)
        random.shuffle(result)
        return result[:max_results]

    def total_edges(self) -> int:
        return sum(len(posts) for posts in self._user_to_posts.values())
