"""
Topic Embeddings — maps posts and users to topic vectors.
Inspired by Twitter's Topic Social Proof.

Topics are extracted from hashtags, language, and community membership.
Users build topic interest vectors from their engagement history.
Used to surface posts that match a user's demonstrated interests.
"""

from typing import Dict, List, Set, Tuple
from collections import defaultdict
from jamii.models import User, Post, Event, EventType


AFRICAN_TOPICS = [
    "politics", "sports", "music", "tech", "business", "fashion",
    "food", "travel", "health", "entertainment", "education", "religion",
    "culture", "economy", "agriculture", "nollywood", "afrobeats",
    "football", "comedy", "art", "gaming", "cryptocurrency", "startups",
]


class TopicEmbeddings:
    def __init__(self):
        self._topics = AFRICAN_TOPICS
        self._topic_index = {t: i for i, t in enumerate(self._topics)}
        self._post_topics: Dict[str, List[str]] = {}
        self._user_interests: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))

    def tag_post(self, post: Post) -> List[str]:
        topics = []
        for tag in post.hashtags:
            clean = tag.lstrip("#").lower()
            for topic in self._topics:
                if topic in clean or clean in topic:
                    topics.append(topic)
        if post.language in ["sw", "am", "ha", "yo", "zu", "ig"]:
            topics.append("culture")
        self._post_topics[post.post_id] = list(set(topics))
        return self._post_topics[post.post_id]

    def record_engagement(self, event: Event, post: Post) -> None:
        if event.event_type in (EventType.SKIP,):
            weight = -0.1
        elif event.event_type == EventType.LIKE:
            weight = 0.5
        elif event.event_type in (EventType.SHARE, EventType.SAVE):
            weight = 1.0
        elif event.event_type == EventType.COMMENT:
            weight = 0.8
        else:
            weight = 0.1

        post_topics = self._post_topics.get(post.post_id, [])
        for topic in post_topics:
            self._user_interests[event.user_id][topic] += weight

    def user_topic_affinity(self, user_id: str, post_id: str) -> float:
        user_interests = self._user_interests.get(user_id, {})
        post_topics = self._post_topics.get(post_id, [])
        if not user_interests or not post_topics:
            return 0.0
        total = sum(abs(v) for v in user_interests.values())
        if total == 0:
            return 0.0
        score = sum(user_interests.get(t, 0.0) for t in post_topics)
        return round(max(0.0, min(score / total, 1.0)), 4)

    def top_interests(self, user_id: str, top_k: int = 5) -> List[Tuple[str, float]]:
        interests = self._user_interests.get(user_id, {})
        return sorted(interests.items(), key=lambda x: x[1], reverse=True)[:top_k]

    def posts_for_topic(self, topic: str) -> List[str]:
        return [pid for pid, topics in self._post_topics.items() if topic in topics]
