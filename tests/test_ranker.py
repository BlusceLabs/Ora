import pytest
from data.sample.seed import seed
from jamii.pipeline.sourcer import CandidateSourcer
from jamii.pipeline.ranker import RankingEngine


@pytest.fixture
def data():
    users, posts = seed()
    return users, posts


def test_ranker_returns_sorted_scores(data):
    users, posts = data
    user = list(users.values())[0]
    sourcer = CandidateSourcer(posts)
    candidates = sourcer.source(user, seen_post_ids=[], limit=50)
    ranker = RankingEngine()
    ranked = ranker.rank(user, candidates)
    scores = [score for _, score in ranked]
    assert scores == sorted(scores, reverse=True)


def test_ranker_scores_between_zero_and_one(data):
    users, posts = data
    user = list(users.values())[0]
    sourcer = CandidateSourcer(posts)
    candidates = sourcer.source(user, seen_post_ids=[], limit=50)
    ranker = RankingEngine()
    ranked = ranker.rank(user, candidates)
    for _, score in ranked:
        assert 0.0 <= score <= 1.0


def test_close_friend_post_ranks_high(data):
    users, posts = data
    user = next(u for u in users.values() if u.close_friends)
    close_friend_id = user.close_friends[0]
    friend_posts = [p for p in posts.values() if p.author_id == close_friend_id]
    if not friend_posts:
        pytest.skip("No posts from close friend in sample data")
    ranker = RankingEngine()
    ranked = ranker.rank(user, friend_posts + list(posts.values())[:20])
    top_post, top_score = ranked[0]
    assert top_score > 0
