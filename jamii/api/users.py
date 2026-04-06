"""
Users API — user profiles, follow graph, signal recording, Who-To-Follow.

Endpoints:
  GET  /users/{user_id}                 — user profile
  GET  /users/{user_id}/following       — list of accounts this user follows
  GET  /users/{user_id}/followers       — list of accounts following this user
  POST /users/{user_id}/follow          — follow an account
  POST /users/{user_id}/unfollow        — unfollow an account
  POST /users/{user_id}/signal          — record an engagement signal
  GET  /users/{user_id}/who-to-follow   — WTF recommendations (MagicRecs)
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict

router = APIRouter(prefix="/users", tags=["users"])

_user_store  = None
_social_graph = None
_uss          = None


def set_user_deps(user_store, social_graph=None, uss=None):
    global _user_store, _social_graph, _uss
    _user_store   = user_store
    _social_graph = social_graph
    _uss          = uss


# ─── Response models ─────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    user_id:       str
    username:      str
    language:      str
    country:       str
    city:          Optional[str]
    following_count: int
    follower_count:  int = 0
    community_ids: List[str]

class FollowRequest(BaseModel):
    target_user_id: str

class SignalRequest(BaseModel):
    post_id:     str
    author_id:   str
    signal_type: str   # like | retweet | reply | bookmark | report | negative_feedback

class SignalResponse(BaseModel):
    recorded: bool
    signal_type: str
    weight: float

class WTFEntry(BaseModel):
    user_id:         str
    username:        str
    common_followers: int
    score:           float
    reasons:         List[str]

class WTFResponse(BaseModel):
    recommendations: List[WTFEntry]
    count:           int


# Engagement weights
SIGNAL_WEIGHTS = {
    "like":               0.5,
    "retweet":            1.0,
    "reply":             13.5,
    "quote":              3.0,
    "bookmark":           2.0,
    "profile_click":     12.0,
    "good_click":        11.0,
    "video_50pct":        0.005,
    "negative_feedback": -74.0,
    "report":           -369.0,
}


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=UserProfile)
def get_user(user_id: str):
    if _user_store is None:
        raise HTTPException(status_code=503, detail="User store not initialized")
    user = _user_store.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    follower_count = sum(
        1 for u in _user_store.values() if user_id in u.following
    ) if _user_store else 0

    return UserProfile(
        user_id         = user.user_id,
        username        = getattr(user, "username", user.user_id),
        language        = user.language,
        country         = user.country,
        city            = getattr(user, "city", None),
        following_count = len(user.following),
        follower_count  = follower_count,
        community_ids   = user.community_ids,
    )


@router.get("/{user_id}/following", response_model=List[str])
def get_following(user_id: str, limit: int = 100):
    if _user_store is None:
        raise HTTPException(status_code=503, detail="User store not initialized")
    user = _user_store.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return user.following[:limit]


@router.get("/{user_id}/followers", response_model=List[str])
def get_followers(user_id: str, limit: int = 100):
    if _user_store is None:
        raise HTTPException(status_code=503, detail="User store not initialized")
    followers = [
        uid for uid, u in _user_store.items()
        if user_id in u.following
    ]
    return followers[:limit]


@router.post("/{user_id}/follow", status_code=200)
def follow_user(user_id: str, req: FollowRequest):
    if _user_store is None:
        raise HTTPException(status_code=503, detail="User store not initialized")
    if user_id not in _user_store:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    if req.target_user_id not in _user_store:
        raise HTTPException(status_code=404, detail=f"Target user {req.target_user_id} not found")
    if user_id == req.target_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    user = _user_store[user_id]
    if req.target_user_id not in user.following:
        user.following.append(req.target_user_id)

    return {"followed": True, "target": req.target_user_id}


@router.post("/{user_id}/unfollow", status_code=200)
def unfollow_user(user_id: str, req: FollowRequest):
    if _user_store is None:
        raise HTTPException(status_code=503, detail="User store not initialized")
    user = _user_store.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    if req.target_user_id in user.following:
        user.following.remove(req.target_user_id)

    return {"unfollowed": True, "target": req.target_user_id}


@router.post("/{user_id}/signal", response_model=SignalResponse)
def record_signal(user_id: str, req: SignalRequest):
    if _user_store is None:
        raise HTTPException(status_code=503, detail="User store not initialized")
    if user_id not in _user_store:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    if req.signal_type not in SIGNAL_WEIGHTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown signal type '{req.signal_type}'. Valid: {list(SIGNAL_WEIGHTS)}"
        )

    weight = SIGNAL_WEIGHTS[req.signal_type]

    # If USS is available, record there for online learning
    if _uss:
        try:
            _uss.record(user_id, req.post_id, req.author_id, req.signal_type)
        except Exception:
            pass

    return SignalResponse(recorded=True, signal_type=req.signal_type, weight=weight)


@router.get("/{user_id}/who-to-follow", response_model=WTFResponse)
def who_to_follow(user_id: str, limit: int = 10):
    if _user_store is None:
        raise HTTPException(status_code=503, detail="User store not initialized")
    user = _user_store.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    following_set = set(user.following)

    # Candidates: second-degree network (people followed by those I follow)
    # but not people I already follow or myself
    candidates: Dict[str, int] = {}  # candidate_id → common follower count
    for fid in user.following:
        followed_user = _user_store.get(fid)
        if not followed_user:
            continue
        for candidate_id in followed_user.following:
            if candidate_id == user_id or candidate_id in following_set:
                continue
            candidates[candidate_id] = candidates.get(candidate_id, 0) + 1

    # Simple scoring: common followers (higher = better)
    ranked = sorted(candidates.items(), key=lambda x: -x[1])[:limit * 2]

    results = []
    for candidate_id, common_count in ranked[:limit]:
        c = _user_store.get(candidate_id)
        if not c:
            continue

        topic_sim = len(set(user.community_ids) & set(c.community_ids)) / max(
            len(set(user.community_ids) | set(c.community_ids)), 1
        )
        geo_score = 1.0 if user.country == c.country else 0.0

        reasons = []
        if common_count >= 2:
            reasons.append(f"{common_count} people you follow also follow them")
        if topic_sim > 0.3:
            reasons.append("Active in communities you're in")
        if geo_score > 0:
            reasons.append(f"Based in {c.country}")

        score = 0.5 * min(common_count / 5.0, 1.0) + 0.3 * topic_sim + 0.2 * geo_score

        results.append(WTFEntry(
            user_id          = candidate_id,
            username         = getattr(c, "username", candidate_id),
            common_followers = common_count,
            score            = round(score, 4),
            reasons          = reasons or ["Recommended for you"],
        ))

    results.sort(key=lambda x: -x.score)

    return WTFResponse(recommendations=results, count=len(results))
