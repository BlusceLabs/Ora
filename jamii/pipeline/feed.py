from typing import List, Dict, Optional
from jamii.models import User, Post
from jamii.pipeline.sourcer import CandidateSourcer
from jamii.pipeline.ranker import RankingEngine
from jamii.pipeline.filter import FeedFilter
from jamii.cache.feed_cache import FeedCache
from config.settings import FEED_SIZE, CANDIDATE_POOL_SIZE
import logging

logger = logging.getLogger(__name__)


class FeedPipeline:
    """
    Orchestrates the full three-stage feed pipeline:
      1. Candidate Sourcing
      2. Ranking
      3. Filtering & Diversity

    Returns a personalized, ordered list of posts for a given user.
    """

    def __init__(
        self,
        post_store: Dict[str, Post],
        cache: Optional[FeedCache] = None,
        sourcer: Optional[CandidateSourcer] = None,
        ranker: Optional[RankingEngine] = None,
        feed_filter: Optional[FeedFilter] = None,
    ):
        self.post_store = post_store
        self.cache = cache
        self.sourcer = sourcer or CandidateSourcer(post_store)
        self.ranker = ranker or RankingEngine()
        self.feed_filter = feed_filter or FeedFilter()

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
                return cached

        logger.info(f"[Feed] Building feed for user {user.user_id}")

        candidates = self.sourcer.source(user, seen_post_ids, limit=CANDIDATE_POOL_SIZE)
        logger.info(f"[Feed] Sourced {len(candidates)} candidates")

        ranked = self.ranker.rank(user, candidates)
        logger.info(f"[Feed] Ranked {len(ranked)} posts")

        top_ranked = ranked[:int(feed_size * 1.5)]
        discovery_candidates = [
            post for post, score in ranked[int(feed_size * 1.5):]
            if post.author_id not in set(user.following)
        ]

        feed = self.feed_filter.filter(
            user,
            top_ranked,
            discovery_candidates,
            limit=feed_size,
        )
        logger.info(f"[Feed] Final feed has {len(feed)} posts")

        if self.cache:
            self.cache.set(user.user_id, feed)

        return feed
