"""
Diversity Scorer — prevents feed from being dominated by one topic/cluster.
Inspired by X-algorithm's diversity scorer using HDBSCAN clustering.

Approach:
  1. Cluster posts by (content_type, language) as a proxy for topic cluster
  2. Apply max-posts-per-cluster quota to the final feed
  3. Reorder to interleave different clusters for variety

Also applies X/Twitter "following / out-of-network" mix ratio:
  - ~50% from people you follow (in-network)
  - ~30% from trending / community
  - ~10% trending
  - ~10% from discovery (out-of-network)
"""

from typing import List, Tuple, Dict
from collections import defaultdict
from jamii.models import User, Post


TARGET_MIX = {
    "following": 0.50,
    "community": 0.30,
    "trending": 0.10,
    "discovery": 0.10,
}

MAX_PER_CLUSTER = 10


class DiversityScorer:
    def __init__(
        self,
        max_per_cluster: int = MAX_PER_CLUSTER,
        target_mix: Dict[str, float] = None,
    ):
        self.max_per_cluster = max_per_cluster
        self.target_mix = target_mix or TARGET_MIX

    def apply(
        self,
        user: User,
        ranked: List[Tuple[Post, float]],
        limit: int = 50,
    ) -> List[Tuple[Post, float]]:
        """
        Reorders ranked list to inject variety.
        Groups posts into buckets (following/community/trending/discovery),
        then interleaves them to hit target mix ratios.
        Applies per-cluster caps to prevent any one topic dominating.
        """
        following_set = set(user.following) | set(user.close_friends)
        community_set = set(user.community_ids)

        buckets: Dict[str, List[Tuple[Post, float]]] = {
            "following": [],
            "community": [],
            "trending": [],
            "discovery": [],
        }

        for post, score in ranked:
            bucket = self._assign_bucket(post, following_set, community_set, user.country)
            buckets[bucket].append((post, score))

        quotas = {k: max(1, int(limit * v)) for k, v in self.target_mix.items()}
        result = self._interleave(buckets, quotas, limit)

        diversity_result = []
        cluster_counts: Dict[str, int] = defaultdict(int)
        for post, score in result:
            cluster_key = f"{post.content_type.value}_{post.language}"
            if cluster_counts[cluster_key] >= self.max_per_cluster:
                continue
            cluster_counts[cluster_key] += 1
            diversity_result.append((post, score))
            if len(diversity_result) >= limit:
                break

        return diversity_result

    def _assign_bucket(
        self,
        post: Post,
        following_set: set,
        community_set: set,
        user_country: str,
    ) -> str:
        if post.author_id in following_set:
            return "following"
        if post.is_community_post and set(post.author_community_ids) & community_set:
            return "community"
        if post.country == user_country:
            return "trending"
        return "discovery"

    def _interleave(
        self,
        buckets: Dict[str, List[Tuple[Post, float]]],
        quotas: Dict[str, int],
        limit: int,
    ) -> List[Tuple[Post, float]]:
        result = []
        pointers = {k: 0 for k in buckets}
        bucket_counts: Dict[str, int] = defaultdict(int)
        order = ["following", "community", "trending", "discovery"]

        while len(result) < limit:
            added_this_round = 0
            for bucket in order:
                bucket_list = buckets[bucket]
                ptr = pointers[bucket]
                quota = quotas[bucket]
                if ptr < len(bucket_list) and bucket_counts[bucket] < quota:
                    result.append(bucket_list[ptr])
                    pointers[bucket] += 1
                    bucket_counts[bucket] += 1
                    added_this_round += 1
                if len(result) >= limit:
                    break
            if added_this_round == 0:
                break

        return result
