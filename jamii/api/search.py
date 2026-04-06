"""
Search API — full-text and structured search over posts and users.

Mirrors Twitter's Earlybird search service:
  - Post search: by hashtag, language, country, content type
  - Author search: by username prefix
  - Returns results ranked by relevance × recency

Pagination: cursor-based (post_id of last result).
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import math

router = APIRouter(prefix="/search", tags=["search"])

_post_store = None
_user_store = None


def set_search_deps(post_store, user_store):
    global _post_store, _user_store
    _post_store = post_store
    _user_store = user_store


# ─── Response models ─────────────────────────────────────────────────────────

class SearchPostResult(BaseModel):
    post_id:      str
    author_id:    str
    content_type: str
    language:     str
    country:      str
    hashtags:     List[str]
    score:        float

class SearchUserResult(BaseModel):
    user_id:       str
    username:      str
    language:      str
    country:       str
    follower_hint: int = 0

class SearchResponse(BaseModel):
    query:       str
    posts:       List[SearchPostResult]
    users:       List[SearchUserResult]
    total_posts: int
    next_cursor: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _relevance_score(post, query_tokens: List[str]) -> float:
    m      = post.metrics
    views  = max(getattr(m, "views", 1) or 1, 1)
    eng    = (getattr(m, "likes", 0) + getattr(m, "comments", 0) * 13.5) / views

    # Hashtag match bonus
    hashtag_tokens = [h.lower().lstrip("#") for h in post.hashtags]
    match_bonus = sum(1.5 for qt in query_tokens if qt in hashtag_tokens)

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    created = post.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_h   = max((now - created).total_seconds() / 3600, 0.1)
    recency = 1.0 / math.log(age_h + 2)

    return (eng + match_bonus) * recency


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/", response_model=SearchResponse)
def search(
    q:            str            = Query(..., min_length=1, description="Search query"),
    language:     Optional[str]  = Query(None, description="Filter by language code"),
    country:      Optional[str]  = Query(None, description="Filter by country code"),
    content_type: Optional[str]  = Query(None, description="Filter by content type"),
    limit:        int            = Query(20, ge=1, le=100),
    cursor:       Optional[str]  = Query(None, description="Pagination cursor (last post_id)"),
):
    if _post_store is None:
        raise HTTPException(status_code=503, detail="Search service not initialized")

    query_tokens = [t.lower().lstrip("#") for t in q.split()]

    # Filter posts
    candidate_posts = list(_post_store.values())
    if language:
        candidate_posts = [p for p in candidate_posts if p.language == language]
    if country:
        candidate_posts = [p for p in candidate_posts if p.country == country]
    if content_type:
        candidate_posts = [p for p in candidate_posts if p.content_type.value == content_type]

    # Match by hashtag or token
    def matches(post) -> bool:
        hashtag_tokens = [h.lower().lstrip("#") for h in post.hashtags]
        return any(qt in hashtag_tokens or qt in post.author_id.lower()
                   for qt in query_tokens)

    matched = [p for p in candidate_posts if matches(p)]
    matched.sort(key=lambda p: _relevance_score(p, query_tokens), reverse=True)

    # Cursor pagination
    if cursor:
        ids = [p.post_id for p in matched]
        if cursor in ids:
            matched = matched[ids.index(cursor) + 1:]

    page       = matched[:limit]
    next_cursor = page[-1].post_id if len(matched) > limit else None

    post_results = [
        SearchPostResult(
            post_id      = p.post_id,
            author_id    = p.author_id,
            content_type = p.content_type.value,
            language     = p.language,
            country      = p.country,
            hashtags     = p.hashtags,
            score        = round(_relevance_score(p, query_tokens), 4),
        )
        for p in page
    ]

    # User search by username prefix
    user_results = []
    if _user_store:
        for uid, u in _user_store.items():
            uname = getattr(u, "username", uid)
            if any(qt in uname.lower() for qt in query_tokens):
                user_results.append(SearchUserResult(
                    user_id  = uid,
                    username = uname,
                    language = u.language,
                    country  = u.country,
                ))
        user_results = user_results[:10]

    return SearchResponse(
        query       = q,
        posts       = post_results,
        users       = user_results,
        total_posts = len(matched),
        next_cursor = next_cursor,
    )


@router.get("/posts/{post_id}", response_model=SearchPostResult)
def get_post(post_id: str):
    if _post_store is None:
        raise HTTPException(status_code=503, detail="Post store not initialized")
    post = _post_store.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail=f"Post {post_id} not found")
    return SearchPostResult(
        post_id      = post.post_id,
        author_id    = post.author_id,
        content_type = post.content_type.value,
        language     = post.language,
        country      = post.country,
        hashtags     = post.hashtags,
        score        = 1.0,
    )
