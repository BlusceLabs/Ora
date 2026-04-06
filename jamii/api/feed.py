from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/feed", tags=["feed"])


class FeedRequest(BaseModel):
    user_id: str
    seen_post_ids: Optional[List[str]] = []
    feed_size: Optional[int] = 50
    bypass_cache: Optional[bool] = False


class PostResponse(BaseModel):
    post_id: str
    author_id: str
    content_type: str
    language: str
    country: str
    score: Optional[float] = None


class FeedResponse(BaseModel):
    user_id: str
    posts: List[PostResponse]
    total: int
    from_cache: bool = False


_pipeline = None


def set_pipeline(pipeline):
    global _pipeline
    _pipeline = pipeline


@router.post("/", response_model=FeedResponse)
def get_feed(request: FeedRequest):
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Feed pipeline not initialized")

    from data.sample.seed import get_user
    user = get_user(request.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"User {request.user_id} not found")

    feed = _pipeline.build_feed(
        user=user,
        seen_post_ids=request.seen_post_ids,
        feed_size=request.feed_size,
        bypass_cache=request.bypass_cache,
    )

    return FeedResponse(
        user_id=request.user_id,
        posts=[
            PostResponse(
                post_id=p.post_id,
                author_id=p.author_id,
                content_type=p.content_type.value,
                language=p.language,
                country=p.country,
            )
            for p in feed
        ],
        total=len(feed),
    )


@router.get("/health")
def health():
    return {"status": "ok", "pipeline_ready": _pipeline is not None}
