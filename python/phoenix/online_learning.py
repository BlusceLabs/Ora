"""
Phoenix Online Learning — Incremental Model Updates

Mirrors Twitter's online learning pipeline:
updates user and post embeddings in near-real-time as engagement
events arrive, without requiring a full batch retraining cycle.

Architecture:
  - EventQueue receives engagement events (like, reply, share, etc.)
  - EventProcessor applies gradient updates to relevant embeddings
  - EmbeddingStore serves updated embeddings to downstream services
  - Periodic full retraining every 24h via train.py batch job

Update strategy:
  - User embeddings: updated when user engages with a post
  - Post embeddings: updated when it receives significant engagement
  - Learning rate decays over time (warm start from batch weights)

Events supported:
  like, reply, retweet, quote, bookmark, report, negative_feedback,
  profile_click, video_50pct, dwell_time, link_click
"""

import math
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

# Engagement weights (Twitter open-source)
ENGAGEMENT_WEIGHTS = {
    "like":               0.5,
    "retweet":            1.0,
    "reply":             13.5,
    "quote":              3.0,
    "bookmark":           2.0,
    "profile_click":     12.0,
    "good_click":        11.0,
    "video_50pct":        0.005,
    "dwell_time":         0.2,
    "link_click":         0.3,
    "negative_feedback": -74.0,
    "report":           -369.0,
}


# ─── Event ──────────────────────────────────────────────────────────────────

@dataclass
class EngagementEvent:
    user_id:      str
    post_id:      str
    author_id:    str
    event_type:   str
    timestamp_ms: int = field(default_factory=lambda: int(time.time() * 1000))
    metadata:     Dict = field(default_factory=dict)

    @property
    def weight(self) -> float:
        return ENGAGEMENT_WEIGHTS.get(self.event_type, 0.0)

    @property
    def is_positive(self) -> bool:
        return self.weight > 0


# ─── Embedding Store ─────────────────────────────────────────────────────────

class EmbeddingStore:
    """
    Thread-safe in-memory embedding store.
    In production backed by Manhattan (Twitter's distributed KV).
    """

    def __init__(self, dim: int = 128):
        self.dim  = dim
        self._lock = threading.RLock()
        self._user_embs: Dict[str, np.ndarray] = {}
        self._post_embs: Dict[str, np.ndarray] = {}
        self._update_counts: Dict[str, int]    = {}

    def get_user(self, user_id: str) -> Optional[np.ndarray]:
        with self._lock:
            return self._user_embs.get(user_id)

    def get_post(self, post_id: str) -> Optional[np.ndarray]:
        with self._lock:
            return self._post_embs.get(post_id)

    def set_user(self, user_id: str, emb: np.ndarray) -> None:
        with self._lock:
            self._user_embs[user_id] = self._l2_norm(emb)
            self._update_counts[f"u:{user_id}"] = self._update_counts.get(f"u:{user_id}", 0) + 1

    def set_post(self, post_id: str, emb: np.ndarray) -> None:
        with self._lock:
            self._post_embs[post_id] = self._l2_norm(emb)
            self._update_counts[f"p:{post_id}"] = self._update_counts.get(f"p:{post_id}", 0) + 1

    def get_or_init_user(self, user_id: str) -> np.ndarray:
        emb = self.get_user(user_id)
        if emb is None:
            emb = np.random.randn(self.dim).astype(np.float32)
            self.set_user(user_id, emb)
        return emb

    def get_or_init_post(self, post_id: str) -> np.ndarray:
        emb = self.get_post(post_id)
        if emb is None:
            emb = np.random.randn(self.dim).astype(np.float32)
            self.set_post(post_id, emb)
        return emb

    @staticmethod
    def _l2_norm(v: np.ndarray) -> np.ndarray:
        norm = np.linalg.norm(v)
        return v / norm if norm > 1e-10 else v

    @property
    def user_count(self) -> int:
        return len(self._user_embs)

    @property
    def post_count(self) -> int:
        return len(self._post_embs)

    def most_updated(self, n: int = 10) -> List[Tuple[str, int]]:
        with self._lock:
            return sorted(self._update_counts.items(), key=lambda x: -x[1])[:n]


# ─── Online Learner ──────────────────────────────────────────────────────────

class OnlineLearner:
    """
    Processes engagement events and applies incremental embedding updates.

    Update rule (online gradient descent on InfoNCE loss):
      For positive event (like, reply, etc.):
        user_emb  += lr * engagement_weight * post_emb
        post_emb  += lr * engagement_weight * user_emb

      For negative event (report, negative_feedback):
        user_emb  -= lr * abs(weight) * post_emb
        post_emb  -= lr * abs(weight) * user_emb
    """

    def __init__(
        self,
        store:         EmbeddingStore,
        base_lr:       float = 0.01,
        lr_decay:      float = 0.999,
        min_lr:        float = 0.0001,
        event_buffer:  int   = 10_000,
    ):
        self.store      = store
        self.base_lr    = base_lr
        self.lr         = base_lr
        self.lr_decay   = lr_decay
        self.min_lr     = min_lr
        self._queue:    deque = deque(maxlen=event_buffer)
        self._processed = 0
        self._lock      = threading.Lock()

    def enqueue(self, event: EngagementEvent) -> None:
        with self._lock:
            self._queue.append(event)

    def process_next(self, batch_size: int = 32) -> int:
        with self._lock:
            batch = [self._queue.popleft() for _ in range(min(batch_size, len(self._queue)))]

        for event in batch:
            self._apply_update(event)
            self._processed += 1

        # Decay learning rate
        self.lr = max(self.min_lr, self.lr * (self.lr_decay ** len(batch)))
        return len(batch)

    def _apply_update(self, event: EngagementEvent) -> None:
        weight = event.weight
        if abs(weight) < 0.001:
            return

        user_emb = self.store.get_or_init_user(event.user_id).copy()
        post_emb = self.store.get_or_init_post(event.post_id).copy()

        if event.is_positive:
            user_delta = self.lr * weight * post_emb
            post_delta = self.lr * weight * user_emb
            user_emb  += user_delta
            post_emb  += post_delta
        else:
            penalty    = self.lr * abs(weight) * 0.01  # damped negative
            user_emb  -= penalty * post_emb
            post_emb  -= penalty * user_emb

        self.store.set_user(event.user_id, user_emb)
        self.store.set_post(event.post_id, post_emb)

    def flush(self) -> int:
        total = 0
        while self.queue_size > 0:
            total += self.process_next(batch_size=256)
        return total

    @property
    def queue_size(self) -> int:
        return len(self._queue)

    @property
    def processed_count(self) -> int:
        return self._processed


# ─── Background Processor ────────────────────────────────────────────────────

class EventStreamProcessor:
    """
    Background thread that continuously drains the event queue
    and applies online learning updates.

    In production this would consume from a Kafka / EventBus topic.
    """

    def __init__(
        self,
        learner:           OnlineLearner,
        poll_interval_ms:  int   = 100,
        batch_size:        int   = 64,
    ):
        self.learner          = learner
        self.poll_interval_s  = poll_interval_ms / 1000.0
        self.batch_size       = batch_size
        self._thread:         Optional[threading.Thread] = None
        self._running         = False
        self._total_processed = 0

    def start(self) -> None:
        self._running = True
        self._thread  = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)

    def _loop(self) -> None:
        while self._running:
            n = self.learner.process_next(self.batch_size)
            self._total_processed += n
            if n == 0:
                time.sleep(self.poll_interval_s)

    def publish(self, event: EngagementEvent) -> None:
        self.learner.enqueue(event)

    @property
    def total_processed(self) -> int:
        return self._total_processed

    @property
    def queue_depth(self) -> int:
        return self.learner.queue_size
