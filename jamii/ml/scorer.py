import numpy as np
from typing import List, Tuple
from jamii.models import User, Post


class MLScorer:
    """
    ML-based scorer using a simple logistic regression model.
    Phase 1: rule-based weighted scoring (no training data needed).
    Phase 2+: trains on event data to improve predictions.

    Feature vector per (user, post) pair:
      [relationship_strength, recency, engagement_score,
       language_match, location_match, content_type_affinity,
       post_age_hours (normalized), author_follower_ratio]
    """

    def __init__(self):
        self._weights = np.array([0.30, 0.25, 0.20, 0.10, 0.05, 0.10, 0.0, 0.0])
        self._trained = False
        self._training_X = []
        self._training_y = []

    def feature_vector(self, user: User, post: Post) -> np.ndarray:
        relationship = user.relationship_strength(post.author_id)
        recency = post.recency_score()
        engagement = min(post.metrics.engagement_score, 1.0)
        language = 1.0 if post.language == user.language else 0.0
        location = 1.0 if post.country == user.country else 0.0
        content_affinity = user.preferences.preferred_content_types.get(
            post.content_type.value, 0.5
        )
        age_norm = min(post.age_in_hours() / 168, 1.0)
        return np.array([
            relationship,
            recency,
            engagement,
            language,
            location,
            content_affinity,
            age_norm,
            0.0,
        ])

    def score(self, user: User, post: Post) -> float:
        fv = self.feature_vector(user, post)
        raw = float(np.dot(self._weights, fv))
        return round(max(0.0, min(raw, 1.0)), 6)

    def add_training_example(self, user: User, post: Post, label: float) -> None:
        fv = self.feature_vector(user, post)
        self._training_X.append(fv)
        self._training_y.append(label)

    def train(self) -> None:
        if len(self._training_X) < 50:
            return
        from sklearn.linear_model import LogisticRegression
        X = np.array(self._training_X)
        y = np.array(self._training_y)
        model = LogisticRegression(max_iter=500)
        model.fit(X, y > 0.5)
        self._weights = model.coef_[0]
        self._trained = True

    @property
    def is_trained(self) -> bool:
        return self._trained
