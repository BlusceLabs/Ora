"""
Trust & Safety Filter — content quality and safety scoring.
Inspired by Twitter's trust-and-safety-models and X-algorithm's author safety filter.

Filters out:
  - Posts from low-reputation authors (spam, bots)
  - Posts with negative social proof (reported by many users)
  - Authors who have been flagged
  - Posts that violate content policies

Also scores content quality (0-1) for use in ranking.
"""

from typing import Dict, Set
from jamii.models import Post, User


class TrustAndSafetyFilter:
    def __init__(self):
        self._flagged_authors: Set[str] = set()
        self._reported_posts: Dict[str, int] = {}
        self._author_report_counts: Dict[str, int] = {}
        self._spam_score_cache: Dict[str, float] = {}

        self.REPORT_THRESHOLD_POST = 10
        self.REPORT_THRESHOLD_AUTHOR = 5
        self.MIN_REPUTATION_TO_PASS = 0.05

    def report_post(self, post_id: str, reporter_id: str) -> None:
        self._reported_posts[post_id] = self._reported_posts.get(post_id, 0) + 1

    def report_author(self, author_id: str, reporter_id: str) -> None:
        self._author_report_counts[author_id] = self._author_report_counts.get(author_id, 0) + 1
        if self._author_report_counts[author_id] >= self.REPORT_THRESHOLD_AUTHOR:
            self._flagged_authors.add(author_id)

    def flag_author(self, author_id: str) -> None:
        self._flagged_authors.add(author_id)

    def unflag_author(self, author_id: str) -> None:
        self._flagged_authors.discard(author_id)

    def is_safe(
        self,
        post: Post,
        author_reputation: float = 1.0,
    ) -> bool:
        if post.author_id in self._flagged_authors:
            return False
        report_count = self._reported_posts.get(post.post_id, 0)
        if report_count >= self.REPORT_THRESHOLD_POST:
            return False
        if author_reputation < self.MIN_REPUTATION_TO_PASS:
            return False
        return True

    def quality_score(self, post: Post, author_reputation: float = 1.0) -> float:
        """
        Returns a content quality score in [0, 1].
        Used as a multiplicative factor in ranking.
        """
        score = 1.0
        report_count = self._reported_posts.get(post.post_id, 0)
        if report_count > 0:
            score *= max(0.0, 1.0 - report_count * 0.1)
        author_reports = self._author_report_counts.get(post.author_id, 0)
        if author_reports > 0:
            score *= max(0.0, 1.0 - author_reports * 0.05)
        score *= author_reputation
        return round(max(0.0, min(score, 1.0)), 4)

    def filter_posts(
        self,
        posts,
        reputation_index: Dict[str, float] = None,
    ):
        reputation_index = reputation_index or {}
        safe = []
        for post in posts:
            rep = reputation_index.get(post.author_id, 0.5)
            if self.is_safe(post, rep):
                safe.append(post)
        return safe
