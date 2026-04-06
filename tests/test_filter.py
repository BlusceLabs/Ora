import pytest
from data.sample.seed import seed
from jamii.pipeline.sourcer import CandidateSourcer
from jamii.pipeline.ranker import RankingEngine
from jamii.pipeline.filter import FeedFilter


@pytest.fixture
def data():
    users, posts = seed()
    return users, posts


def test_filter_respects_feed_size(data):
    users, posts = data
    user = list(users.values())[0]
    sourcer = CandidateSourcer(posts)
    candidates = sourcer.source(user, seen_post_ids=[], limit=200)
    ranker = RankingEngine()
    ranked = ranker.rank(user, candidates)
    feed_filter = FeedFilter()
    feed = feed_filter.filter(user, ranked, [], limit=20)
    assert len(feed) <= 20


def test_filter_no_consecutive_author_overflow(data):
    users, posts = data
    user = list(users.values())[0]
    sourcer = CandidateSourcer(posts)
    candidates = sourcer.source(user, seen_post_ids=[], limit=200)
    ranker = RankingEngine()
    ranked = ranker.rank(user, candidates)
    feed_filter = FeedFilter(max_consecutive_same_author=2)
    feed = feed_filter.filter(user, ranked, [], limit=30)
    consecutive = 1
    for i in range(1, len(feed)):
        if feed[i].author_id == feed[i - 1].author_id:
            consecutive += 1
            assert consecutive <= 2, "More than 2 consecutive posts from same author"
        else:
            consecutive = 1


def test_filter_returns_list(data):
    users, posts = data
    user = list(users.values())[0]
    feed_filter = FeedFilter()
    result = feed_filter.filter(user, [], [], limit=10)
    assert isinstance(result, list)
