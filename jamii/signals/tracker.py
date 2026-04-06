from typing import List, Dict
from collections import defaultdict
from jamii.models import Event, EventType
import logging

logger = logging.getLogger(__name__)


class EventTracker:
    """
    Tracks user interactions with posts (views, likes, shares, skips, etc.)
    and computes per-user, per-author, and per-content-type affinity scores.
    Used to continuously improve ranking signals.
    """

    def __init__(self):
        self._events: List[Event] = []
        self._user_author_weights: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        self._user_content_type_weights: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))

    def track(self, event: Event, author_id: str, content_type: str) -> None:
        self._events.append(event)
        weight = event.weight

        self._user_author_weights[event.user_id][author_id] += weight
        self._user_content_type_weights[event.user_id][content_type] += weight

        logger.debug(
            f"[Tracker] user={event.user_id} event={event.event_type} "
            f"author={author_id} content={content_type} weight={weight}"
        )

    def get_author_affinity(self, user_id: str) -> Dict[str, float]:
        raw = dict(self._user_author_weights[user_id])
        return self._normalize(raw)

    def get_content_type_affinity(self, user_id: str) -> Dict[str, float]:
        raw = dict(self._user_content_type_weights[user_id])
        return self._normalize(raw)

    def get_all_events(self, user_id: str = None) -> List[Event]:
        if user_id:
            return [e for e in self._events if e.user_id == user_id]
        return list(self._events)

    def total_events(self) -> int:
        return len(self._events)

    def _normalize(self, scores: Dict[str, float]) -> Dict[str, float]:
        if not scores:
            return {}
        total = sum(abs(v) for v in scores.values())
        if total == 0:
            return scores
        return {k: round(v / total, 4) for k, v in scores.items()}
