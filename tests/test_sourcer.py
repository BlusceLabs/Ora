import pytest
from data.sample.seed import seed
from jamii.pipeline.sourcer import CandidateSourcer


@pytest.fixture
def data():
    users, posts = seed()
    return users, posts


def test_sourcer_returns_candidates(data):
    users, posts = data
    user = list(users.values())[0]
    sourcer = CandidateSourcer(posts)
    candidates = sourcer.source(user, seen_post_ids=[], limit=500)
    assert isinstance(candidates, list)
    assert len(candidates) > 0


def test_sourcer_excludes_seen_posts(data):
    users, posts = data
    user = list(users.values())[0]
    sourcer = CandidateSourcer(posts)
    all_candidates = sourcer.source(user, seen_post_ids=[], limit=500)
    first_post_id = all_candidates[0].post_id if all_candidates else None
    if first_post_id:
        filtered = sourcer.source(user, seen_post_ids=[first_post_id], limit=500)
        post_ids = [p.post_id for p in filtered]
        assert first_post_id not in post_ids


def test_sourcer_respects_limit(data):
    users, posts = data
    user = list(users.values())[0]
    sourcer = CandidateSourcer(posts)
    candidates = sourcer.source(user, seen_post_ids=[], limit=10)
    assert len(candidates) <= 10
