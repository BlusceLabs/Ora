from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class EventType(str, Enum):
    VIEW = "view"
    LIKE = "like"
    COMMENT = "comment"
    SHARE = "share"
    SAVE = "save"
    SKIP = "skip"
    FOLLOW = "follow"
    UNFOLLOW = "unfollow"
    COMPLETE = "complete"


@dataclass
class Event:
    event_id: str
    user_id: str
    post_id: str
    event_type: EventType
    timestamp: datetime = None
    metadata: dict = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}

    @property
    def weight(self) -> float:
        weights = {
            EventType.VIEW: 0.1,
            EventType.LIKE: 1.0,
            EventType.COMMENT: 2.0,
            EventType.SHARE: 3.0,
            EventType.SAVE: 2.5,
            EventType.SKIP: -0.5,
            EventType.COMPLETE: 1.5,
            EventType.FOLLOW: 5.0,
            EventType.UNFOLLOW: -5.0,
        }
        return weights.get(self.event_type, 0.0)
