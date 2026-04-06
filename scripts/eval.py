"""
Jamii Feed Algorithm — Offline Evaluation

Computes standard IR metrics over a held-out relevance dataset:

  - NDCG@K    (Normalized Discounted Cumulative Gain)
  - Precision@K
  - Recall@K
  - MRR       (Mean Reciprocal Rank)
  - Hit Rate@K
  - Diversity Score (intra-list diversity)
  - Coverage  (% of catalog recommended at least once)

Relevance labels are derived from historical engagement data using
the Twitter/X open-source engagement weight formula.

Usage:
    python scripts/eval.py --k 10 --users 10 --runs 3
"""

import argparse
import logging
import math
import random
import statistics
import sys
from collections import defaultdict
from pathlib import Path

logging.disable(logging.INFO)
sys.path.insert(0, str(Path(__file__).parent.parent))

from data.sample.seed import seed
from jamii.pipeline import FeedPipeline
from jamii.graph import RealGraph, UserReputation, SocialProofIndex, InteractionGraph
from jamii.safety import TrustAndSafetyFilter
from jamii.embeddings import SimClusters, TopicEmbeddings
from jamii.models import Post

# ─── Relevance Label ─────────────────────────────────────────────────────────

ENGAGEMENT_WEIGHTS = {
    "like":               0.5,
    "retweet":            1.0,
    "reply":             13.5,
    "bookmark":           2.0,
    "profile_click":     12.0,
    "negative_feedback": -74.0,
    "report":           -369.0,
}

def engagement_label(post: Post, user_following: set) -> float:
    """
    Synthetic relevance label [0, 3]:
      3 = highly relevant (close author + high engagement velocity)
      2 = relevant (following + some engagement)
      1 = marginally relevant
      0 = irrelevant
    """
    # Engagement velocity proxy from post metrics (ContentMetrics dataclass)
    m     = post.metrics
    views = max(getattr(m, "views", 1) or 1, 1)
    score = (
        0.5  * getattr(m, "likes",    0) / views
      + 1.0  * getattr(m, "shares",   0) / views
      + 13.5 * getattr(m, "comments", 0) / views
      + 2.0  * getattr(m, "saves",    0) / views
    )
    author_bonus = 1.0 if post.author_id in user_following else 0.0
    raw = score + author_bonus
    if raw >= 0.5:   return 3
    if raw >= 0.1:   return 2
    if raw >= 0.01:  return 1
    return 0


# ─── Metrics ─────────────────────────────────────────────────────────────────

def dcg(labels: list, k: int) -> float:
    return sum(
        (2**rel - 1) / math.log2(i + 2)
        for i, rel in enumerate(labels[:k])
    )

def ndcg_at_k(recommended: list, relevance_map: dict, k: int) -> float:
    labels      = [relevance_map.get(pid, 0) for pid in recommended[:k]]
    ideal_labels = sorted(relevance_map.values(), reverse=True)
    ideal_dcg   = dcg(ideal_labels, k)
    if ideal_dcg == 0:
        return 0.0
    return dcg(labels, k) / ideal_dcg

def precision_at_k(recommended: list, relevant_set: set, k: int) -> float:
    hits = sum(1 for pid in recommended[:k] if pid in relevant_set)
    return hits / k

def recall_at_k(recommended: list, relevant_set: set, k: int) -> float:
    if not relevant_set:
        return 0.0
    hits = sum(1 for pid in recommended[:k] if pid in relevant_set)
    return hits / len(relevant_set)

def reciprocal_rank(recommended: list, relevant_set: set) -> float:
    for i, pid in enumerate(recommended):
        if pid in relevant_set:
            return 1.0 / (i + 1)
    return 0.0

def hit_rate_at_k(recommended: list, relevant_set: set, k: int) -> bool:
    return any(pid in relevant_set for pid in recommended[:k])

def intra_list_diversity(recommended: list, posts: dict) -> float:
    """
    Fraction of unique (language, content_type) pairs in the feed.
    Ranges [0, 1] — higher is more diverse.
    """
    if not recommended:
        return 0.0
    pairs = set()
    for pid in recommended:
        p = posts.get(pid)
        if p:
            pairs.add((getattr(p, "language", "?"), getattr(p, "content_type", "?")))
    return len(pairs) / len(recommended)


# ─── Setup ───────────────────────────────────────────────────────────────────

def setup():
    users, posts = seed()

    real_graph        = RealGraph()
    reputation        = UserReputation()
    social_proof      = SocialProofIndex()
    interaction_graph = InteractionGraph()

    follow_graph = {uid: u.following for uid, u in users.items()}
    reputation.compute(follow_graph)

    for user in users.values():
        for pid in list(posts.keys())[:5]:
            interaction_graph.add_edge(user.user_id, pid)

    sim_clusters = SimClusters(n_communities=100)
    sim_clusters.fit(users, posts)

    topic_embeddings = TopicEmbeddings()
    for post in posts.values():
        topic_embeddings.tag_post(post)

    trust_safety = TrustAndSafetyFilter()

    pipeline = FeedPipeline(
        post_store        = posts,
        real_graph        = real_graph,
        reputation        = reputation,
        social_proof      = social_proof,
        interaction_graph = interaction_graph,
        trust_safety      = trust_safety,
        sim_clusters      = sim_clusters,
        topic_embeddings  = topic_embeddings,
    )

    return pipeline, users, posts


# ─── Evaluation ──────────────────────────────────────────────────────────────

def evaluate(pipeline, users, posts, k: int = 10, n_users: int = 10) -> dict:
    sample = list(users.values())[:n_users]

    ndcg_scores  = []
    prec_scores  = []
    rec_scores   = []
    mrr_scores   = []
    hit_rates    = []
    div_scores   = []
    all_recs     = set()

    for user in sample:
        feed = pipeline.build_feed(user, feed_size=50)
        rec_ids = [p.post_id for p in feed]

        # Build relevance map for all posts (using proxy labels)
        relevance_map = {
            pid: engagement_label(post, set(user.following))
            for pid, post in posts.items()
        }
        relevant_set = {pid for pid, rel in relevance_map.items() if rel >= 2}

        ndcg_scores.append(ndcg_at_k(rec_ids, relevance_map, k))
        prec_scores.append(precision_at_k(rec_ids, relevant_set, k))
        rec_scores.append(recall_at_k(rec_ids, relevant_set, k))
        mrr_scores.append(reciprocal_rank(rec_ids, relevant_set))
        hit_rates.append(1.0 if hit_rate_at_k(rec_ids, relevant_set, k) else 0.0)
        div_scores.append(intra_list_diversity(rec_ids, posts))
        all_recs.update(rec_ids)

    coverage = len(all_recs) / len(posts) if posts else 0.0

    return {
        f"ndcg@{k}":      statistics.mean(ndcg_scores),
        f"precision@{k}": statistics.mean(prec_scores),
        f"recall@{k}":    statistics.mean(rec_scores),
        "mrr":            statistics.mean(mrr_scores),
        f"hit_rate@{k}":  statistics.mean(hit_rates),
        "diversity":      statistics.mean(div_scores),
        "coverage":       coverage,
        "n_users":        len(sample),
    }


# ─── Report ──────────────────────────────────────────────────────────────────

def print_report(metrics: dict, k: int):
    print("\n" + "=" * 50)
    print("  JAMII FEED — OFFLINE EVALUATION REPORT")
    print("=" * 50)
    print(f"  Users evaluated:   {metrics['n_users']}")
    print(f"  Cutoff K:          {k}")
    print()
    print(f"  NDCG@{k:<3}            {metrics[f'ndcg@{k}']:.4f}")
    print(f"  Precision@{k:<3}       {metrics[f'precision@{k}']:.4f}")
    print(f"  Recall@{k:<3}          {metrics[f'recall@{k}']:.4f}")
    print(f"  MRR                {metrics['mrr']:.4f}")
    print(f"  Hit Rate@{k:<3}        {metrics[f'hit_rate@{k}']:.4f}")
    print()
    print(f"  Diversity          {metrics['diversity']:.4f}")
    print(f"  Coverage           {metrics['coverage']:.4f}")
    print("=" * 50)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--k",     type=int, default=10)
    parser.add_argument("--users", type=int, default=10)
    args = parser.parse_args()

    print("[Eval] Setting up pipeline...")
    pipeline, users, posts = setup()
    print(f"[Eval] {len(users)} users, {len(posts)} posts")

    metrics = evaluate(pipeline, users, posts, k=args.k, n_users=args.users)
    print_report(metrics, args.k)


if __name__ == "__main__":
    main()
