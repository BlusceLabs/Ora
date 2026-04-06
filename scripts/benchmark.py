"""
Jamii Feed Algorithm — End-to-End Benchmark

Measures throughput and latency of the full 10-stage feed pipeline.

Reports:
  - Wall time per feed build (ms)
  - P50 / P95 / P99 latency over N runs
  - Throughput: feeds/sec
  - Feed size per user

Usage:
    python scripts/benchmark.py --runs 50 --feed-size 50
"""

import argparse
import logging
import statistics
import sys
import time
from pathlib import Path

# Suppress verbose INFO logs during benchmark
logging.disable(logging.INFO)

sys.path.insert(0, str(Path(__file__).parent.parent))

from data.sample.seed import seed
from jamii.pipeline import FeedPipeline
from jamii.graph import RealGraph, UserReputation, SocialProofIndex, InteractionGraph
from jamii.safety import TrustAndSafetyFilter
from jamii.embeddings import SimClusters, TopicEmbeddings
from config.settings import FEED_SIZE


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

    return pipeline, list(users.values())


def run_benchmark(pipeline, users, n_runs: int = 50, feed_size: int = FEED_SIZE) -> dict:
    timings       = []
    feed_sizes    = []
    sample_users  = users[:min(len(users), 10)]

    for run in range(n_runs):
        user = sample_users[run % len(sample_users)]
        t0   = time.perf_counter()
        feed = pipeline.build_feed(user, feed_size=feed_size)
        t1   = time.perf_counter()
        timings.append((t1 - t0) * 1000)
        feed_sizes.append(len(feed))

    return {"runs": n_runs, "timings": timings, "feed_sizes": feed_sizes}


def percentile(data, pct):
    s = sorted(data)
    k = (len(s) - 1) * pct / 100
    f, c = int(k), min(int(k) + 1, len(s) - 1)
    return s[f] + (s[c] - s[f]) * (k - f)


def print_report(results: dict):
    t = results["timings"]
    print("\n" + "=" * 55)
    print("  JAMII FEED PIPELINE — BENCHMARK REPORT")
    print("=" * 55)
    print(f"  Runs:             {results['runs']}")
    print(f"  Avg feed size:    {statistics.mean(results['feed_sizes']):.1f} posts")
    print()
    print("  LATENCY (ms)")
    print(f"    Mean:           {statistics.mean(t):.2f}")
    print(f"    P50:            {percentile(t, 50):.2f}")
    print(f"    P95:            {percentile(t, 95):.2f}")
    print(f"    P99:            {percentile(t, 99):.2f}")
    print(f"    Min:            {min(t):.2f}")
    print(f"    Max:            {max(t):.2f}")
    print()
    print(f"  THROUGHPUT:       {1000 / statistics.mean(t):.1f} feeds/sec")
    print("=" * 55)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs",      type=int, default=50)
    parser.add_argument("--feed-size", type=int, default=FEED_SIZE)
    args = parser.parse_args()

    print("[Benchmark] Setting up pipeline...")
    pipeline, users = setup()
    print(f"[Benchmark] {len(users)} users loaded")

    # Warm-up
    for _ in range(3):
        pipeline.build_feed(users[0], feed_size=args.feed_size)

    print(f"[Benchmark] Running {args.runs} feed builds...")
    results = run_benchmark(pipeline, users, n_runs=args.runs, feed_size=args.feed_size)
    print_report(results)


if __name__ == "__main__":
    main()
