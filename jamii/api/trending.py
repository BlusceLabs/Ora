"""
Trending API — surfaces trending posts, topics, and hashtags.

Mirrors Twitter's Explore / Trending tab:
  - Trending posts: engagement velocity ranked, filtered by country/language
  - Trending topics: top hashtag clusters with post counts
  - Trending communities: most-active communities in the last 24h

Rate limited: 60 requests/minute per user.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import math

router = APIRouter(prefix="/trending", tags=["trending"])

_post_store  = None
_topic_emb   = None


def set_trending_deps(post_store, topic_embeddings):
    global _post_store, _topic_emb
    _post_store = post_store
    _topic_emb  = topic_embeddings


# ─── Response models ─────────────────────────────────────────────────────────

class TrendingPost(BaseModel):
    post_id:          str
    author_id:        str
    content_type:     str
    language:         str
    country:          str
    engagement_score: float
    hashtags:         List[str]

class TrendingTopic(BaseModel):
    topic:      str
    post_count: int
    score:      float

class TrendingHashtag(BaseModel):
    hashtag:    str
    post_count: int
    velocity:   float

class TrendingResponse(BaseModel):
    posts:    List[TrendingPost]
    topics:   List[TrendingTopic]
    hashtags: List[TrendingHashtag]
    country:  Optional[str]
    language: Optional[str]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _engagement_velocity(post) -> float:
    m = post.metrics
    views = max(getattr(m, "views", 1) or 1, 1)
    raw = (
        0.5  * getattr(m, "likes",    0) / views
      + 1.0  * getattr(m, "shares",   0) / views
      + 13.5 * getattr(m, "comments", 0) / views
      + 2.0  * getattr(m, "saves",    0) / views
    )
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    created = post.created_at
    if created.tzinfo is None:
        from datetime import timezone as tz
        created = created.replace(tzinfo=tz.utc)
    age_h = max((now - created).total_seconds() / 3600, 0.1)
    return raw / math.log(age_h + 2)


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/", response_model=TrendingResponse)
def get_trending(
    country:  Optional[str] = Query(None, description="ISO country code, e.g. KE"),
    language: Optional[str] = Query(None, description="Language code, e.g. sw"),
    limit:    int           = Query(20, ge=1, le=100),
):
    if _post_store is None:
        raise HTTPException(status_code=503, detail="Post store not initialized")

    posts = list(_post_store.values())

    # Filter by country / language if specified
    if country:
        posts = [p for p in posts if p.country == country]
    if language:
        posts = [p for p in posts if p.language == language]

    if not posts:
        return TrendingResponse(posts=[], topics=[], hashtags=[], country=country, language=language)

    # Score posts by engagement velocity
    scored = sorted(posts, key=_engagement_velocity, reverse=True)

    trending_posts = [
        TrendingPost(
            post_id          = p.post_id,
            author_id        = p.author_id,
            content_type     = p.content_type.value,
            language         = p.language,
            country          = p.country,
            engagement_score = round(_engagement_velocity(p), 4),
            hashtags         = p.hashtags,
        )
        for p in scored[:limit]
    ]

    # Trending hashtags
    hashtag_counts: Dict[str, int]   = {}
    hashtag_velocity: Dict[str, float] = {}
    for p in posts:
        v = _engagement_velocity(p)
        for h in p.hashtags:
            hashtag_counts[h]   = hashtag_counts.get(h, 0) + 1
            hashtag_velocity[h] = hashtag_velocity.get(h, 0) + v

    trending_hashtags = sorted(
        [TrendingHashtag(hashtag=h, post_count=hashtag_counts[h],
                         velocity=round(hashtag_velocity[h], 4))
         for h in hashtag_counts],
        key=lambda x: -x.velocity
    )[:20]

    # Trending topics from topic_embeddings
    topic_counts: Dict[str, int]  = {}
    topic_scores: Dict[str, float] = {}
    if _topic_emb:
        for p in posts:
            tags = _topic_emb.get_tags(p.post_id) if hasattr(_topic_emb, "get_tags") else []
            v    = _engagement_velocity(p)
            for t in tags:
                topic_counts[t] = topic_counts.get(t, 0) + 1
                topic_scores[t] = topic_scores.get(t, 0) + v

    trending_topics = sorted(
        [TrendingTopic(topic=t, post_count=topic_counts[t], score=round(topic_scores[t], 4))
         for t in topic_counts],
        key=lambda x: -x.score
    )[:20]

    return TrendingResponse(
        posts    = trending_posts,
        topics   = trending_topics,
        hashtags = trending_hashtags,
        country  = country,
        language = language,
    )


@router.get("/hashtag/{hashtag}", response_model=List[TrendingPost])
def posts_by_hashtag(
    hashtag: str,
    limit:   int = Query(20, ge=1, le=100),
):
    if _post_store is None:
        raise HTTPException(status_code=503, detail="Post store not initialized")

    tag    = hashtag.lower().lstrip("#")
    matched = [
        p for p in _post_store.values()
        if any(h.lower().lstrip("#") == tag for h in p.hashtags)
    ]
    matched.sort(key=_engagement_velocity, reverse=True)

    return [
        TrendingPost(
            post_id          = p.post_id,
            author_id        = p.author_id,
            content_type     = p.content_type.value,
            language         = p.language,
            country          = p.country,
            engagement_score = round(_engagement_velocity(p), 4),
            hashtags         = p.hashtags,
        )
        for p in matched[:limit]
    ]
