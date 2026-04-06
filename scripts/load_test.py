#!/usr/bin/env python3
"""
load_test.py — Async HTTP load tester for the Jamii Feed API.

Measures throughput and latency distribution across all endpoints
under concurrent load. Uses asyncio + aiohttp for realistic concurrency.

Usage:
    python scripts/load_test.py                        # default: 50 users, 10s
    python scripts/load_test.py --users 100 --duration 30
    python scripts/load_test.py --url http://localhost:5000 --rps 200

Output:
    Per-endpoint table: requests, errors, p50/p95/p99 latency, throughput
"""

import argparse
import asyncio
import random
import statistics
import time
from collections import defaultdict
from typing import Dict, List, Tuple

try:
    import aiohttp
except ImportError:
    print("aiohttp not found — installing...")
    import subprocess, sys
    subprocess.run([sys.executable, "-m", "pip", "install", "aiohttp", "-q"], check=True)
    import aiohttp

# ─── Config ──────────────────────────────────────────────────────────────────

DEFAULT_URL      = "http://localhost:5000"
DEFAULT_USERS    = 50
DEFAULT_DURATION = 10    # seconds
DEFAULT_RPS      = None  # None = max throughput
SAMPLE_USER_IDS  = [f"user_{i:03d}" for i in range(50)]
SAMPLE_POST_IDS  = [f"post_{i:04d}" for i in range(300)]
HASHTAGS         = ["tag1", "tag5", "tag9", "tag18", "nairobi", "lagos", "tech"]


# ─── Scenario definitions ─────────────────────────────────────────────────────

async def feed_scenario(session: aiohttp.ClientSession, base_url: str) -> Tuple[str, float, bool]:
    uid = random.choice(SAMPLE_USER_IDS)
    t0  = time.perf_counter()
    try:
        async with session.post(
            f"{base_url}/feed/",
            json={"user_id": uid, "feed_size": 20},
        ) as r:
            ok = r.status == 200
            await r.json()
    except Exception:
        ok = False
    return "POST /feed/", (time.perf_counter() - t0) * 1000, ok


async def trending_scenario(session, base_url) -> Tuple[str, float, bool]:
    t0 = time.perf_counter()
    try:
        async with session.get(f"{base_url}/trending/?limit=10") as r:
            ok = r.status == 200
            await r.json()
    except Exception:
        ok = False
    return "GET /trending/", (time.perf_counter() - t0) * 1000, ok


async def search_scenario(session, base_url) -> Tuple[str, float, bool]:
    tag = random.choice(HASHTAGS)
    t0  = time.perf_counter()
    try:
        async with session.get(f"{base_url}/search/?q={tag}&limit=10") as r:
            ok = r.status == 200
            await r.json()
    except Exception:
        ok = False
    return "GET /search/", (time.perf_counter() - t0) * 1000, ok


async def user_profile_scenario(session, base_url) -> Tuple[str, float, bool]:
    uid = random.choice(SAMPLE_USER_IDS)
    t0  = time.perf_counter()
    try:
        async with session.get(f"{base_url}/users/{uid}") as r:
            ok = r.status == 200
            await r.json()
    except Exception:
        ok = False
    return "GET /users/{id}", (time.perf_counter() - t0) * 1000, ok


async def wtf_scenario(session, base_url) -> Tuple[str, float, bool]:
    uid = random.choice(SAMPLE_USER_IDS)
    t0  = time.perf_counter()
    try:
        async with session.get(f"{base_url}/users/{uid}/who-to-follow?limit=5") as r:
            ok = r.status == 200
            await r.json()
    except Exception:
        ok = False
    return "GET /who-to-follow", (time.perf_counter() - t0) * 1000, ok


async def signal_scenario(session, base_url) -> Tuple[str, float, bool]:
    uid = random.choice(SAMPLE_USER_IDS)
    pid = random.choice(SAMPLE_POST_IDS)
    sig = random.choice(["like", "bookmark", "retweet", "reply"])
    t0  = time.perf_counter()
    try:
        async with session.post(
            f"{base_url}/users/{uid}/signal",
            json={"post_id": pid, "author_id": "user_000", "signal_type": sig},
        ) as r:
            ok = r.status == 200
            await r.json()
    except Exception:
        ok = False
    return "POST /signal", (time.perf_counter() - t0) * 1000, ok


async def metrics_scenario(session, base_url) -> Tuple[str, float, bool]:
    t0 = time.perf_counter()
    try:
        async with session.get(f"{base_url}/metrics") as r:
            ok = r.status == 200
            await r.json()
    except Exception:
        ok = False
    return "GET /metrics", (time.perf_counter() - t0) * 1000, ok


SCENARIOS = [
    (feed_scenario,         0.40),   # 40% of requests are feed fetches
    (trending_scenario,     0.15),
    (search_scenario,       0.15),
    (user_profile_scenario, 0.10),
    (wtf_scenario,          0.10),
    (signal_scenario,       0.05),
    (metrics_scenario,      0.05),
]

SCENARIO_FUNCS, SCENARIO_WEIGHTS = zip(*SCENARIOS)


def pick_scenario():
    r = random.random()
    cumulative = 0.0
    for fn, w in zip(SCENARIO_FUNCS, SCENARIO_WEIGHTS):
        cumulative += w
        if r < cumulative:
            return fn
    return SCENARIO_FUNCS[-1]


# ─── Worker ──────────────────────────────────────────────────────────────────

async def worker(
    session:   aiohttp.ClientSession,
    base_url:  str,
    end_time:  float,
    results:   Dict[str, List[float]],
    errors:    Dict[str, int],
    rps_limit: float = None,
):
    interval = 1.0 / rps_limit if rps_limit else 0.0

    while time.perf_counter() < end_time:
        fn = pick_scenario()
        endpoint, latency_ms, ok = await fn(session, base_url)

        results[endpoint].append(latency_ms)
        if not ok:
            errors[endpoint] = errors.get(endpoint, 0) + 1

        if interval > 0:
            await asyncio.sleep(interval)


# ─── Main ─────────────────────────────────────────────────────────────────────

async def run(args):
    base_url    = args.url
    n_workers   = args.users
    duration    = args.duration
    rps_per_worker = args.rps / n_workers if args.rps else None

    results: Dict[str, List[float]] = defaultdict(list)
    errors:  Dict[str, int]         = defaultdict(int)

    connector = aiohttp.TCPConnector(limit=n_workers * 2)
    timeout   = aiohttp.ClientTimeout(total=10)

    print(f"\n{'='*60}")
    print(f"  Jamii Feed API — Load Test")
    print(f"  URL:      {base_url}")
    print(f"  Workers:  {n_workers}")
    print(f"  Duration: {duration}s")
    print(f"  Target:   {'max throughput' if not args.rps else f'{args.rps} RPS'}")
    print(f"{'='*60}\n")
    print("  Warming up... (2s)")

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Warmup
        warmup_end = time.perf_counter() + 2
        warmup_tasks = [
            asyncio.create_task(worker(session, base_url, warmup_end, defaultdict(list), defaultdict(int)))
            for _ in range(min(n_workers, 5))
        ]
        await asyncio.gather(*warmup_tasks)

        # Reset and run real test
        results.clear()
        errors.clear()
        print(f"  Running for {duration}s...\n")
        start = time.perf_counter()
        end   = start + duration

        tasks = [
            asyncio.create_task(worker(session, base_url, end, results, errors, rps_per_worker))
            for _ in range(n_workers)
        ]
        await asyncio.gather(*tasks)

    elapsed = time.perf_counter() - start

    # ─── Report ──────────────────────────────────────────────────────────

    total_reqs = sum(len(v) for v in results.values())
    total_errs = sum(errors.values())

    print(f"\n{'='*72}")
    print(f"  LOAD TEST REPORT — {elapsed:.1f}s")
    print(f"{'='*72}")
    print(f"  Total requests: {total_reqs:,}   Errors: {total_errs:,}   "
          f"Overall RPS: {total_reqs/elapsed:.1f}")
    print(f"\n  {'Endpoint':<24} {'Reqs':>6} {'Err':>5} {'P50':>7} {'P95':>7} {'P99':>7} {'RPS':>7}")
    print(f"  {'-'*24} {'-'*6} {'-'*5} {'-'*7} {'-'*7} {'-'*7} {'-'*7}")

    all_endpoints = sorted(results.keys())
    for ep in all_endpoints:
        lats = sorted(results[ep])
        if not lats:
            continue
        n    = len(lats)
        errs = errors.get(ep, 0)
        p50  = lats[int(n * 0.50)]
        p95  = lats[int(n * 0.95)]
        p99  = lats[int(n * 0.99)]
        rps  = n / elapsed
        print(f"  {ep:<24} {n:>6,} {errs:>5} {p50:>6.1f}ms {p95:>6.1f}ms {p99:>6.1f}ms {rps:>6.1f}")

    print(f"{'='*72}\n")


def main():
    parser = argparse.ArgumentParser(description="Jamii API Load Tester")
    parser.add_argument("--url",      default=DEFAULT_URL,      help="API base URL")
    parser.add_argument("--users",    type=int, default=DEFAULT_USERS, help="Concurrent workers")
    parser.add_argument("--duration", type=int, default=DEFAULT_DURATION, help="Test duration (seconds)")
    parser.add_argument("--rps",      type=float, default=DEFAULT_RPS,   help="Target total RPS (None = max)")
    args = parser.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
