"""
Feed Pipeline — Full orchestrator for the Jamii personalized feed.

Implements the complete recommendation pipeline inspired by:
  - Twitter/the-algorithm (SimClusters, Real Graph, Light/Heavy Ranker, Trust & Safety)
  - xai-org/x-algorithm (Query Hydration, Candidate Hydration, Diversity Scorer, Social Proof)

Pipeline stages:
  1.  Query Hydration         — assemble user context
  2.  Candidate Sourcing      — collect 500 posts from all sources
  3.  Candidate Hydration     — enrich posts with metadata
  4.  Trust & Safety Filter   — remove unsafe content
  5.  Social Proof Filter     — require proof for out-of-network posts
  6.  Light Ranking           — fast pre-rank, cut to top 40%
  7.  Heavy Ranking           — full neural-style scoring
  8.  Diversity Scoring       — enforce mix ratios and topic variety
  9.  Feed Filter             — max consecutive same author, discovery injection
  10. Cache                   — store result for fast re-serve
"""

import logging
from typing import List, Dict, Optional

from jamii.models import User, Post
from jamii.pipeline.sourcer import CandidateSourcer
from jamii.pipeline.light_ranker import LightRanker
from jamii.pipeline.heavy_ranker import HeavyRanker
from jamii.pipeline.filter import FeedFilter
from jamii.pipeline.hydrator import QueryHydrator, CandidateHydrator
from jamii.pipeline.diversity import DiversityScorer
from jamii.graph.real_graph import RealGraph
from jamii.graph.page_rank import UserReputation
from jamii.graph.social_proof import SocialProofIndex
from jamii.graph.interaction_graph import InteractionGraph
from jamii.safety.trust_safety import TrustAndSafetyFilter
from jamii.embeddings.sim_clusters import SimClusters
from jamii.embeddings.topic_embeddings import TopicEmbeddings
from jamii.cache.feed_cache import FeedCache
from config.settings import FEED_SIZE, CANDIDATE_POOL_SIZE

logger = logging.getLogger(__name__)


class FeedPipeline:
    def __init__(
        self,
        post_store: Dict[str, Post],
        cache: Optional[FeedCache] = None,
        real_graph: Optional[RealGraph] = None,
        reputation: Optional[UserReputation] = None,
        social_proof: Optional[SocialProofIndex] = None,
        interaction_graph: Optional[InteractionGraph] = None,
        trust_safety: Optional[TrustAndSafetyFilter] = None,
        sim_clusters: Optional[SimClusters] = None,
        topic_embeddings: Optional[TopicEmbeddings] = None,
    ):
        self.post_store = post_store
        self.cache = cache

        self.real_graph = real_graph or RealGraph()
        self.reputation = reputation or UserReputation()
        self.social_proof = social_proof or SocialProofIndex()
        self.interaction_graph = interaction_graph or InteractionGraph()
        self.trust_safety = trust_safety or TrustAndSafetyFilter()
        self.sim_clusters = sim_clusters
        self.topic_embeddings = topic_embeddings

        self.sourcer = CandidateSourcer(post_store, self.interaction_graph)
        self.query_hydrator = QueryHydrator(self.real_graph, self.reputation, self.topic_embeddings)
        self.candidate_hydrator = CandidateHydrator(self.reputation, self.social_proof, self.topic_embeddings)
        self.light_ranker = LightRanker(keep_fraction=0.4)
        self.heavy_ranker = HeavyRanker(
            real_graph=self.real_graph,
            social_proof=self.social_proof,
            reputation=self.reputation,
            sim_clusters=self.sim_clusters,
            topic_embeddings=self.topic_embeddings,
        )
        self.diversity_scorer = DiversityScorer()
        self.feed_filter = FeedFilter()

    def build_feed(
        self,
        user: User,
        seen_post_ids: List[str] = None,
        feed_size: int = FEED_SIZE,
        bypass_cache: bool = False,
    ) -> List[Post]:
        seen_post_ids = seen_post_ids or []

        if self.cache and not bypass_cache:
            cached = self.cache.get(user.user_id)
            if cached:
                logger.info(f"[Feed] Cache hit for user {user.user_id}")
                return [self.post_store[pid] for pid in cached if pid in self.post_store]

        logger.info(f"[Feed] Building feed for user {user.user_id}")

        # Stage 1: Query Hydration
        user_context = self.query_hydrator.hydrate(user)
        logger.info(f"[Feed] User context hydrated — top authors: {len(user_context.top_authors)}")

        # Stage 2: Candidate Sourcing
        candidates = self.sourcer.source(user, seen_post_ids, limit=CANDIDATE_POOL_SIZE)
        logger.info(f"[Feed] Sourced {len(candidates)} candidates")

        # Stage 3: Candidate Hydration
        hydrated = self.candidate_hydrator.hydrate(user, candidates)

        # Stage 4: Trust & Safety Filter
        reputation_index = {uid: self.reputation.get(uid) for uid in set(p.author_id for p in candidates)}
        safe_posts = self.trust_safety.filter_posts(candidates, reputation_index)
        logger.info(f"[Feed] After T&S filter: {len(safe_posts)} posts")

        # Stage 5: Social Proof Filter (out-of-network must have social proof)
        social_filtered = self._apply_social_proof_filter(user, safe_posts)
        logger.info(f"[Feed] After social proof filter: {len(social_filtered)} posts")

        # Stage 6: Light Ranking (fast pre-rank)
        light_ranked = self.light_ranker.rank(user, social_filtered)
        logger.info(f"[Feed] After light ranking: {len(light_ranked)} posts")

        # Stage 7: Heavy Ranking (full scoring)
        heavy_ranked = self.heavy_ranker.rank(user, light_ranked)
        logger.info(f"[Feed] After heavy ranking: {len(heavy_ranked)} posts")

        # Stage 8: Diversity Scoring
        diverse_feed = self.diversity_scorer.apply(user, heavy_ranked, limit=int(feed_size * 1.5))
        logger.info(f"[Feed] After diversity: {len(diverse_feed)} posts")

        # Stage 9: Feed Filter (max consecutive + discovery injection)
        discovery_pool = [
            post for post in social_filtered
            if post.author_id not in set(user.following)
        ]
        final_feed = self.feed_filter.filter(user, diverse_feed, discovery_pool, limit=feed_size)
        logger.info(f"[Feed] Final feed: {len(final_feed)} posts")

        # Stage 10: Cache
        if self.cache:
            self.cache.set(user.user_id, final_feed)

        return final_feed

    def _apply_social_proof_filter(self, user: User, posts: List[Post]) -> List[Post]:
        result = []
        for post in posts:
            is_in_network = post.author_id in user.following or post.author_id in user.close_friends
            if is_in_network:
                result.append(post)
                continue
            if self.social_proof.has_social_proof(post.post_id, user.following, min_connections=1):
                result.append(post)
                continue
            if post.is_community_post and user.shares_community(post.author_community_ids):
                result.append(post)
                continue
            if len(result) < 10:
                result.append(post)
        return result
