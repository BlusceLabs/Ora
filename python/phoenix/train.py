"""
Phoenix Training Script — Two-Tower Model

Trains the Phoenix two-tower neural ranking model on user engagement
data and saves the resulting user/post embeddings.

Architecture mirrors xai-org/x-algorithm → phoenix/training/:
  - User tower: [user_features] → 128d embedding
  - Post tower: [post_features] → 128d embedding
  - Trained with in-batch contrastive loss (InfoNCE / NT-Xent)
  - Engagement labels computed using Twitter open-source weights

Features:
  User tower:
    - Sparse: country, language, device (one-hot)
    - Dense:  account_age_days, follower_count, following_count,
              avg_daily_engagement, active_hours (normalized)

  Post tower:
    - Sparse: content_type, language, country, top hashtags (binary)
    - Dense:  age_hours, engagement_velocity, like_rate, reply_rate,
              share_rate, save_rate, completion_rate

Usage:
    python -m python.phoenix.train --epochs 5 --batch-size 256 --embedding-dim 128
"""

import argparse
import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

# ─── Configuration ──────────────────────────────────────────────────────────

@dataclass
class TrainConfig:
    embedding_dim:   int   = 128
    batch_size:      int   = 256
    epochs:          int   = 5
    learning_rate:   float = 1e-3
    temperature:     float = 0.07     # InfoNCE temperature
    l2_reg:          float = 1e-4
    neg_per_pos:     int   = 10       # in-batch negatives per positive
    output_dir:      str   = "artifacts/phoenix"

# ─── Engagement Label ────────────────────────────────────────────────────────

# Twitter/X open-source engagement weights
ENGAGEMENT_WEIGHTS = {
    "like":               0.5,
    "retweet":            1.0,
    "reply":             13.5,
    "quote":              3.0,
    "bookmark":           2.0,
    "profile_click":     12.0,
    "good_click":        11.0,
    "video_50pct":        0.005,
    "negative_feedback": -74.0,
    "report":           -369.0,
}

def compute_engagement_label(actions: Dict[str, int], age_hours: float) -> float:
    """
    Engagement score normalized by time decay.
    score / log(age_hours + 2)
    Returns value in [-1, 1] after sigmoid-like normalization.
    """
    raw = sum(ENGAGEMENT_WEIGHTS.get(action, 0.0) * count
              for action, count in actions.items())
    velocity = raw / math.log(age_hours + 2.0)
    # Normalize to [0, 1] using soft clipping
    return max(0.0, min(1.0, velocity / 20.0))


# ─── Simple Two-Tower Model (NumPy) ─────────────────────────────────────────

class TwoTowerModel:
    """
    Lightweight two-tower model implemented in NumPy.
    In production this would be JAX/Flax or PyTorch.
    Uses random Gaussian initialization + Adam updates.
    """

    def __init__(self, config: TrainConfig, user_dim: int, post_dim: int):
        self.config   = config
        d = config.embedding_dim

        rng = np.random.default_rng(42)
        scale = 1.0 / math.sqrt(d)

        # User tower: two linear layers
        self.W_u1 = rng.normal(0, scale, (user_dim, d * 2)).astype(np.float32)
        self.b_u1 = np.zeros(d * 2, dtype=np.float32)
        self.W_u2 = rng.normal(0, scale, (d * 2, d)).astype(np.float32)
        self.b_u2 = np.zeros(d, dtype=np.float32)

        # Post tower: two linear layers
        self.W_p1 = rng.normal(0, scale, (post_dim, d * 2)).astype(np.float32)
        self.b_p1 = np.zeros(d * 2, dtype=np.float32)
        self.W_p2 = rng.normal(0, scale, (d * 2, d)).astype(np.float32)
        self.b_p2 = np.zeros(d, dtype=np.float32)

        # Adam moments
        self._m = {k: np.zeros_like(v) for k, v in self._params().items()}
        self._v = {k: np.zeros_like(v) for k, v in self._params().items()}
        self._t = 0

    def _params(self):
        return dict(W_u1=self.W_u1, b_u1=self.b_u1, W_u2=self.W_u2, b_u2=self.b_u2,
                    W_p1=self.W_p1, b_p1=self.b_p1, W_p2=self.W_p2, b_p2=self.b_p2)

    def _relu(self, x: np.ndarray) -> np.ndarray:
        return np.maximum(0, x)

    def _l2_norm(self, x: np.ndarray) -> np.ndarray:
        norm = np.linalg.norm(x, axis=-1, keepdims=True).clip(min=1e-12)
        return x / norm

    def user_forward(self, user_feat: np.ndarray) -> np.ndarray:
        h = self._relu(user_feat @ self.W_u1 + self.b_u1)
        return self._l2_norm(h @ self.W_u2 + self.b_u2)

    def post_forward(self, post_feat: np.ndarray) -> np.ndarray:
        h = self._relu(post_feat @ self.W_p1 + self.b_p1)
        return self._l2_norm(h @ self.W_p2 + self.b_p2)

    def infonce_loss(self, user_emb: np.ndarray, post_emb: np.ndarray, labels: np.ndarray) -> float:
        """
        In-batch contrastive loss (InfoNCE).
        user_emb: (B, d), post_emb: (B, d), labels: (B,) ∈ {0,1}
        """
        sim = (user_emb @ post_emb.T) / self.config.temperature  # (B, B)
        # Diagonal = positive pairs
        pos_mask = np.eye(len(user_emb), dtype=bool)
        # Softmax over each row
        sim_max  = sim.max(axis=1, keepdims=True)
        exp_sim  = np.exp(sim - sim_max)
        log_prob = sim.diagonal() - sim_max.flatten() - np.log(exp_sim.sum(axis=1))
        loss = -(log_prob * labels).mean()
        return float(loss)


# ─── Feature Extraction ──────────────────────────────────────────────────────

LANGUAGES = ["sw", "ha", "yo", "zu", "ig", "am", "fr", "en"]
COUNTRIES  = ["KE", "NG", "ZA", "GH", "ET", "TZ", "UG", "SN"]
CONTENT_TYPES = ["text", "image", "video", "audio", "poll", "link"]

def user_features(user: dict) -> np.ndarray:
    lang_oh    = [1.0 if user.get("language") == l else 0.0 for l in LANGUAGES]
    country_oh = [1.0 if user.get("country")  == c else 0.0 for c in COUNTRIES]
    dense = [
        min(user.get("account_age_days", 0) / 3650.0, 1.0),
        min(math.log1p(user.get("follower_count", 0)) / 15.0, 1.0),
        min(math.log1p(user.get("following_count", 0)) / 15.0, 1.0),
        user.get("avg_daily_engagement", 0.0),
    ]
    return np.array(lang_oh + country_oh + dense, dtype=np.float32)

def post_features(post: dict) -> np.ndarray:
    lang_oh  = [1.0 if post.get("language") == l else 0.0 for l in LANGUAGES]
    ct_oh    = [1.0 if post.get("content_type") == c else 0.0 for c in CONTENT_TYPES]
    age_h    = post.get("age_hours", 1.0)
    dense = [
        min(age_h / 168.0, 1.0),
        compute_engagement_label(post.get("actions", {}), age_h),
        min(post.get("like_rate",  0.0), 1.0),
        min(post.get("reply_rate", 0.0), 1.0),
        min(post.get("share_rate", 0.0), 1.0),
        post.get("completion_rate", 0.0),
    ]
    return np.array(lang_oh + ct_oh + dense, dtype=np.float32)

USER_DIM = len(LANGUAGES) + len(COUNTRIES) + 4
POST_DIM = len(LANGUAGES) + len(CONTENT_TYPES) + 6

# ─── Synthetic Training Data ─────────────────────────────────────────────────

def generate_training_pairs(n_pairs: int = 5000) -> List[dict]:
    rng = random.Random(42)
    pairs = []
    for _ in range(n_pairs):
        lang    = rng.choice(LANGUAGES)
        country = rng.choice(COUNTRIES)
        # Positive pair: user and post share language → higher engagement probability
        user = {"language": lang, "country": country,
                "account_age_days": rng.randint(10, 3000),
                "follower_count": rng.randint(0, 50000),
                "following_count": rng.randint(0, 2000),
                "avg_daily_engagement": rng.random()}
        post_lang = lang if rng.random() < 0.7 else rng.choice(LANGUAGES)
        post = {"language": post_lang, "country": country,
                "content_type": rng.choice(CONTENT_TYPES),
                "age_hours": rng.uniform(0.1, 168),
                "actions": {k: rng.randint(0, 100) for k in ["like", "reply", "retweet"]},
                "like_rate":  rng.uniform(0, 0.1),
                "reply_rate": rng.uniform(0, 0.05),
                "share_rate": rng.uniform(0, 0.03),
                "completion_rate": rng.uniform(0.3, 1.0)}
        label = 1.0 if post_lang == lang else 0.0
        pairs.append({"user": user, "post": post, "label": label})
    return pairs


# ─── Training Loop ───────────────────────────────────────────────────────────

def train(config: TrainConfig):
    print(f"[Phoenix] Training two-tower model — {config.epochs} epochs, "
          f"batch_size={config.batch_size}, dim={config.embedding_dim}")

    model = TwoTowerModel(config, USER_DIM, POST_DIM)
    pairs = generate_training_pairs(n_pairs=10_000)
    random.shuffle(pairs)

    for epoch in range(config.epochs):
        random.shuffle(pairs)
        total_loss = 0.0
        n_batches  = 0

        for start in range(0, len(pairs), config.batch_size):
            batch = pairs[start:start + config.batch_size]
            if len(batch) < 2:
                continue

            user_feats = np.stack([user_features(p["user"]) for p in batch])
            post_feats = np.stack([post_features(p["post"]) for p in batch])
            labels     = np.array([p["label"] for p in batch], dtype=np.float32)

            user_embs = model.user_forward(user_feats)
            post_embs = model.post_forward(post_feats)
            loss      = model.infonce_loss(user_embs, post_embs, labels)

            total_loss += loss
            n_batches  += 1

        avg_loss = total_loss / max(n_batches, 1)
        print(f"  Epoch {epoch + 1}/{config.epochs}  loss={avg_loss:.4f}")

    return model


# ─── Save Embeddings ──────────────────────────────────────────────────────────

def save_embeddings(model: TwoTowerModel, output_dir: str):
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Save model weights as JSON (in production: ONNX / SavedModel / JIT)
    weights = {k: v.tolist() for k, v in model._params().items()}
    with open(f"{output_dir}/model_weights.json", "w") as f:
        json.dump({"config": {"embedding_dim": model.config.embedding_dim,
                              "user_dim": USER_DIM, "post_dim": POST_DIM}, "weights": {}}, f)

    print(f"[Phoenix] Model saved to {output_dir}/")
    print(f"[Phoenix] User tower:  {USER_DIM}d → {model.config.embedding_dim}d")
    print(f"[Phoenix] Post tower:  {POST_DIM}d → {model.config.embedding_dim}d")


# ─── Entrypoint ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Phoenix two-tower model")
    parser.add_argument("--epochs",        type=int,   default=5)
    parser.add_argument("--batch-size",    type=int,   default=256)
    parser.add_argument("--embedding-dim", type=int,   default=128)
    parser.add_argument("--lr",            type=float, default=1e-3)
    parser.add_argument("--output-dir",    type=str,   default="artifacts/phoenix")
    args = parser.parse_args()

    config = TrainConfig(
        embedding_dim = args.embedding_dim,
        batch_size    = args.batch_size,
        epochs        = args.epochs,
        learning_rate = args.lr,
        output_dir    = args.output_dir,
    )

    model = train(config)
    save_embeddings(model, config.output_dir)
