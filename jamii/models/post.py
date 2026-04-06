from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class PostType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    POLL = "poll"
    LINK = "link"


@dataclass
class ContentMetrics:
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    completion_rate: float = 0.0

    @property
    def engagement_score(self) -> float:
        if self.views == 0:
            return 0.0
        weighted = (
            self.likes * 1.0 +
            self.comments * 2.0 +
            self.shares * 3.0 +
            self.saves * 2.5
        )
        return weighted / max(self.views, 1)


@dataclass
class Post:
    post_id: str
    author_id: str
    author_community_ids: List[str]
    content_type: PostType
    language: str
    country: str
    city: Optional[str]
    hashtags: List[str]
    created_at: datetime
    metrics: ContentMetrics = field(default_factory=ContentMetrics)
    is_sponsored: bool = False
    is_community_post: bool = False

    def age_in_hours(self) -> float:
        delta = datetime.utcnow() - self.created_at
        return delta.total_seconds() / 3600

    def recency_score(self) -> float:
        hours = self.age_in_hours()
        if hours <= 1:
            return 1.0
        elif hours <= 6:
            return 0.85
        elif hours <= 12:
            return 0.65
        elif hours <= 24:
            return 0.45
        elif hours <= 48:
            return 0.25
        else:
            return max(0.05, 1.0 / (1.0 + hours / 24))
