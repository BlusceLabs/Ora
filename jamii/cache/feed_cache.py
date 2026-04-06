from typing import List, Optional
from jamii.models import Post
from config.settings import FEED_CACHE_TTL
import json
import logging

logger = logging.getLogger(__name__)


class FeedCache:
    """
    Redis-based feed cache.
    Falls back to in-memory dict if Redis is unavailable.
    """

    def __init__(self, redis_client=None, ttl: int = FEED_CACHE_TTL):
        self.redis = redis_client
        self.ttl = ttl
        self._memory: dict = {}

    def _key(self, user_id: str) -> str:
        return f"jamii:feed:{user_id}"

    def get(self, user_id: str) -> Optional[List[str]]:
        key = self._key(user_id)
        try:
            if self.redis:
                raw = self.redis.get(key)
                if raw:
                    return json.loads(raw)
            else:
                return self._memory.get(key)
        except Exception as e:
            logger.warning(f"[Cache] get failed for {user_id}: {e}")
        return None

    def set(self, user_id: str, posts: List[Post]) -> None:
        key = self._key(user_id)
        post_ids = [p.post_id for p in posts]
        try:
            if self.redis:
                self.redis.setex(key, self.ttl, json.dumps(post_ids))
            else:
                self._memory[key] = post_ids
        except Exception as e:
            logger.warning(f"[Cache] set failed for {user_id}: {e}")

    def invalidate(self, user_id: str) -> None:
        key = self._key(user_id)
        try:
            if self.redis:
                self.redis.delete(key)
            else:
                self._memory.pop(key, None)
        except Exception as e:
            logger.warning(f"[Cache] invalidate failed for {user_id}: {e}")
