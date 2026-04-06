"""
API endpoint tests — trending, search, users, who-to-follow, metrics, signals.

Uses FastAPI TestClient without spinning up uvicorn.
All tests use the seeded in-memory data store.
"""

import pytest
from fastapi.testclient import TestClient

# ─── Bootstrap app with seeded data ──────────────────────────────────────────

from data.sample.seed import seed
from jamii.pipeline import FeedPipeline
from jamii.graph import RealGraph, UserReputation, SocialProofIndex, InteractionGraph
from jamii.safety import TrustAndSafetyFilter
from jamii.embeddings import SimClusters, TopicEmbeddings

from jamii.api.feed     import set_pipeline
from jamii.api.trending import set_trending_deps
from jamii.api.search   import set_search_deps
from jamii.api.users    import set_user_deps

import main as app_module

@pytest.fixture(scope="module")
def client():
    """Shared test client — seeds data once for the whole module."""
    users, posts = seed()

    real_graph        = RealGraph()
    reputation        = UserReputation()
    social_proof      = SocialProofIndex()
    interaction_graph = InteractionGraph()

    follow_graph = {uid: u.following for uid, u in users.items()}
    reputation.compute(follow_graph)

    sim_clusters = SimClusters(n_communities=50)
    sim_clusters.fit(users, posts)

    topic_embeddings = TopicEmbeddings()
    for post in posts.values():
        topic_embeddings.tag_post(post)

    pipeline = FeedPipeline(
        post_store        = posts,
        real_graph        = real_graph,
        reputation        = reputation,
        social_proof      = social_proof,
        interaction_graph = interaction_graph,
        trust_safety      = TrustAndSafetyFilter(),
        sim_clusters      = sim_clusters,
        topic_embeddings  = topic_embeddings,
    )

    set_pipeline(pipeline)
    set_trending_deps(post_store=posts, topic_embeddings=topic_embeddings)
    set_search_deps(post_store=posts, user_store=users)
    set_user_deps(user_store=users)

    with TestClient(app_module.app) as c:
        yield c, users, posts


# ─── Root / Info ─────────────────────────────────────────────────────────────

class TestRoot:
    def test_root_returns_200(self, client):
        c, _, _ = client
        r = c.get("/")
        assert r.status_code == 200

    def test_root_has_endpoints_map(self, client):
        c, _, _ = client
        body = r.json() if (r := c.get("/")) else {}
        assert "endpoints" in body
        assert "trending" in body["endpoints"]
        assert "search"   in body["endpoints"]


# ─── Feed ────────────────────────────────────────────────────────────────────

class TestFeedEndpoint:
    def test_feed_returns_posts(self, client):
        c, users, _ = client
        uid = next(iter(users))
        r = c.post("/feed/", json={"user_id": uid, "feed_size": 20})
        assert r.status_code == 200
        body = r.json()
        assert body["user_id"] == uid
        assert len(body["posts"]) > 0

    def test_feed_unknown_user_is_404(self, client):
        c, _, _ = client
        r = c.post("/feed/", json={"user_id": "ghost_user_xyz"})
        assert r.status_code == 404

    def test_feed_no_duplicate_posts(self, client):
        c, users, _ = client
        uid = next(iter(users))
        r = c.post("/feed/", json={"user_id": uid, "feed_size": 50})
        assert r.status_code == 200
        post_ids = [p["post_id"] for p in r.json()["posts"]]
        assert len(post_ids) == len(set(post_ids)), "Duplicate posts in feed"

    def test_feed_health(self, client):
        c, _, _ = client
        r = c.get("/feed/health")
        assert r.status_code == 200
        assert r.json()["pipeline_ready"] is True


# ─── Trending ────────────────────────────────────────────────────────────────

class TestTrendingEndpoint:
    def test_trending_returns_posts(self, client):
        c, _, _ = client
        r = c.get("/trending/")
        assert r.status_code == 200
        body = r.json()
        assert "posts"    in body
        assert "hashtags" in body
        assert "topics"   in body
        assert isinstance(body["posts"], list)

    def test_trending_posts_have_scores(self, client):
        c, _, _ = client
        body = c.get("/trending/").json()
        for post in body["posts"]:
            assert "engagement_score" in post
            assert post["engagement_score"] >= 0

    def test_trending_filter_by_language(self, client):
        c, _, posts = client
        r = c.get("/trending/?language=sw")
        assert r.status_code == 200
        for post in r.json()["posts"]:
            assert post["language"] == "sw"

    def test_trending_hashtag_endpoint(self, client):
        c, _, posts = client
        # Find a hashtag that exists in the dataset
        hashtag = None
        for p in posts.values():
            if p.hashtags:
                hashtag = p.hashtags[0].lstrip("#")
                break
        if hashtag is None:
            pytest.skip("No posts with hashtags in seed data")
        r = c.get(f"/trending/hashtag/{hashtag}")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)
        for post in body:
            assert any(h.lower().lstrip("#") == hashtag.lower() for h in post["hashtags"])

    def test_trending_limit_respected(self, client):
        c, _, _ = client
        r = c.get("/trending/?limit=5")
        assert r.status_code == 200
        assert len(r.json()["posts"]) <= 5


# ─── Search ──────────────────────────────────────────────────────────────────

class TestSearchEndpoint:
    def test_search_returns_response(self, client):
        c, _, _ = client
        r = c.get("/search/?q=sw")
        assert r.status_code == 200
        body = r.json()
        assert "posts" in body
        assert "users" in body
        assert body["query"] == "sw"

    def test_search_by_hashtag_token(self, client):
        c, _, posts = client
        hashtag = None
        for p in posts.values():
            if p.hashtags:
                hashtag = p.hashtags[0].lstrip("#")
                break
        if not hashtag:
            pytest.skip("No hashtags in seed data")
        r = c.get(f"/search/?q={hashtag}")
        assert r.status_code == 200
        assert r.json()["total_posts"] >= 0

    def test_search_post_by_id(self, client):
        c, _, posts = client
        pid = next(iter(posts))
        r = c.get(f"/search/posts/{pid}")
        assert r.status_code == 200
        assert r.json()["post_id"] == pid

    def test_search_unknown_post_is_404(self, client):
        c, _, _ = client
        r = c.get("/search/posts/post_does_not_exist_xyz")
        assert r.status_code == 404

    def test_search_language_filter(self, client):
        c, _, _ = client
        r = c.get("/search/?q=user&language=sw")
        assert r.status_code == 200
        for post in r.json()["posts"]:
            assert post["language"] == "sw"

    def test_search_pagination_cursor(self, client):
        c, _, _ = client
        r1 = c.get("/search/?q=user&limit=5")
        assert r1.status_code == 200
        body1 = r1.json()
        if not body1["next_cursor"]:
            pytest.skip("Not enough results for pagination test")
        cursor = body1["next_cursor"]
        r2 = c.get(f"/search/?q=user&limit=5&cursor={cursor}")
        assert r2.status_code == 200
        ids1 = {p["post_id"] for p in body1["posts"]}
        ids2 = {p["post_id"] for p in r2.json()["posts"]}
        assert ids1.isdisjoint(ids2), "Pagination returned overlapping results"


# ─── Users ───────────────────────────────────────────────────────────────────

class TestUsersEndpoint:
    def test_user_profile(self, client):
        c, users, _ = client
        uid = next(iter(users))
        r = c.get(f"/users/{uid}")
        assert r.status_code == 200
        body = r.json()
        assert body["user_id"] == uid
        assert "following_count" in body
        assert "community_ids"   in body

    def test_unknown_user_is_404(self, client):
        c, _, _ = client
        r = c.get("/users/ghost_xyz")
        assert r.status_code == 404

    def test_following_list(self, client):
        c, users, _ = client
        # Find a user who follows someone
        uid = next((uid for uid, u in users.items() if u.following), None)
        if not uid:
            pytest.skip("No user with following in seed data")
        r = c.get(f"/users/{uid}/following")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_followers_list(self, client):
        c, users, _ = client
        uid = next(iter(users))
        r = c.get(f"/users/{uid}/followers")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_follow_and_unfollow(self, client):
        c, users, _ = client
        uids = list(users.keys())
        assert len(uids) >= 2
        user_a, user_b = uids[0], uids[1]

        # Unfollow first to ensure clean state
        c.post(f"/users/{user_a}/unfollow", json={"target_user_id": user_b})

        r = c.post(f"/users/{user_a}/follow", json={"target_user_id": user_b})
        assert r.status_code == 200
        assert r.json()["followed"] is True

        following = c.get(f"/users/{user_a}/following").json()
        assert user_b in following

        r = c.post(f"/users/{user_a}/unfollow", json={"target_user_id": user_b})
        assert r.status_code == 200
        assert r.json()["unfollowed"] is True

    def test_follow_self_is_400(self, client):
        c, users, _ = client
        uid = next(iter(users))
        r = c.post(f"/users/{uid}/follow", json={"target_user_id": uid})
        assert r.status_code == 400

    def test_signal_record(self, client):
        c, users, posts = client
        uid = next(iter(users))
        pid = next(iter(posts))
        post = posts[pid]
        r = c.post(f"/users/{uid}/signal", json={
            "post_id":     pid,
            "author_id":   post.author_id,
            "signal_type": "like",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["recorded"]    is True
        assert body["signal_type"] == "like"
        assert body["weight"]      == 0.5

    def test_signal_negative_weight(self, client):
        c, users, posts = client
        uid = next(iter(users))
        pid = next(iter(posts))
        post = posts[pid]
        r = c.post(f"/users/{uid}/signal", json={
            "post_id":     pid,
            "author_id":   post.author_id,
            "signal_type": "report",
        })
        assert r.status_code == 200
        assert r.json()["weight"] < 0

    def test_signal_unknown_type_is_400(self, client):
        c, users, posts = client
        uid = next(iter(users))
        pid = next(iter(posts))
        r = c.post(f"/users/{uid}/signal", json={
            "post_id": pid, "author_id": "user_000", "signal_type": "teleport"
        })
        assert r.status_code == 400

    def test_who_to_follow(self, client):
        c, users, _ = client
        uid = next(iter(users))
        r = c.get(f"/users/{uid}/who-to-follow")
        assert r.status_code == 200
        body = r.json()
        assert "recommendations" in body
        assert "count"           in body
        assert isinstance(body["recommendations"], list)
        for rec in body["recommendations"]:
            assert rec["user_id"] != uid, "WTF returned the requesting user"

    def test_who_to_follow_no_duplicates(self, client):
        c, users, _ = client
        uid = next(iter(users))
        r = c.get(f"/users/{uid}/who-to-follow?limit=20")
        recs = r.json()["recommendations"]
        ids  = [rec["user_id"] for rec in recs]
        assert len(ids) == len(set(ids)), "Duplicate recommendations in WTF"


# ─── Metrics ─────────────────────────────────────────────────────────────────

class TestMetricsEndpoint:
    def test_metrics_returns_snapshot(self, client):
        c, _, _ = client
        r = c.get("/metrics")
        assert r.status_code == 200
        body = r.json()
        assert "counters"   in body
        assert "histograms" in body
        assert "gauges"     in body

    def test_metrics_gauges_populated(self, client):
        c, _, _ = client
        gauges = c.get("/metrics").json()["gauges"]
        assert gauges["pipeline_ready"] == 1.0
        assert gauges["user_count"]     > 0
        assert gauges["post_count"]     > 0
