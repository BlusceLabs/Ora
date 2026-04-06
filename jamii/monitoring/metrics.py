"""
Metrics — Prometheus-style counter/histogram/gauge collection.

Tracks key pipeline observability signals:
  - feed_builds_total          Counter: total feeds built
  - feed_build_duration_ms     Histogram: latency per feed build
  - feed_size                  Histogram: posts per feed
  - pipeline_stage_duration_ms Histogram: per-stage latency
  - candidates_sourced         Histogram: raw candidate count
  - candidates_after_filter    Histogram: after T&S + social proof
  - cache_hits / cache_misses  Counter
  - signal_events_total        Counter: by signal type
  - api_requests_total         Counter: by endpoint × status

In production this would export to Prometheus via /metrics endpoint
or push to StatsD / Datadog. This module is a drop-in shim that
collects the same data and exposes it via /metrics on the API.
"""

import math
import threading
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple


# ─── Metric Types ─────────────────────────────────────────────────────────────

class Counter:
    def __init__(self, name: str, help_text: str = "", labels: Tuple = ()):
        self.name      = name
        self.help_text = help_text
        self._counts: Dict[Tuple, float] = defaultdict(float)
        self._lock = threading.Lock()

    def inc(self, value: float = 1.0, **label_values):
        key = tuple(sorted(label_values.items()))
        with self._lock:
            self._counts[key] += value

    def get(self, **label_values) -> float:
        key = tuple(sorted(label_values.items()))
        return self._counts.get(key, 0.0)

    def all(self) -> Dict[Tuple, float]:
        with self._lock:
            return dict(self._counts)

    def total(self) -> float:
        return sum(self._counts.values())


class Gauge:
    def __init__(self, name: str, help_text: str = ""):
        self.name      = name
        self.help_text = help_text
        self._values: Dict[Tuple, float] = defaultdict(float)
        self._lock = threading.Lock()

    def set(self, value: float, **label_values):
        key = tuple(sorted(label_values.items()))
        with self._lock:
            self._values[key] = value

    def get(self, **label_values) -> float:
        key = tuple(sorted(label_values.items()))
        return self._values.get(key, 0.0)


class Histogram:
    """Approximate histogram with configurable buckets."""

    DEFAULT_BUCKETS = (1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000)

    def __init__(self, name: str, help_text: str = "", buckets: Tuple = DEFAULT_BUCKETS):
        self.name      = name
        self.help_text = help_text
        self.buckets   = sorted(buckets)
        self._sum:     float = 0.0
        self._count:   int   = 0
        self._buckets: List[int] = [0] * (len(self.buckets) + 1)  # +inf bucket
        self._samples: List[float] = []  # keep last 10k for percentiles
        self._lock     = threading.Lock()

    def observe(self, value: float):
        with self._lock:
            self._sum   += value
            self._count += 1
            self._samples.append(value)
            if len(self._samples) > 10_000:
                self._samples.pop(0)
            for i, b in enumerate(self.buckets):
                if value <= b:
                    self._buckets[i] += 1
            self._buckets[-1] += 1  # +inf

    def mean(self) -> float:
        return self._sum / self._count if self._count else 0.0

    def percentile(self, pct: float) -> float:
        with self._lock:
            if not self._samples:
                return 0.0
            s = sorted(self._samples)
            k = (len(s) - 1) * pct / 100
            f, c = int(k), min(int(k) + 1, len(s) - 1)
            return s[f] + (s[c] - s[f]) * (k - f)

    def summary(self) -> dict:
        return {
            "count": self._count,
            "mean":  round(self.mean(), 3),
            "p50":   round(self.percentile(50), 3),
            "p95":   round(self.percentile(95), 3),
            "p99":   round(self.percentile(99), 3),
            "min":   round(min(self._samples), 3) if self._samples else 0,
            "max":   round(max(self._samples), 3) if self._samples else 0,
        }


# ─── Registry ─────────────────────────────────────────────────────────────────

class MetricsRegistry:
    """Singleton registry of all metrics."""

    _instance: Optional["MetricsRegistry"] = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._init()
        return cls._instance

    def _init(self):
        # Counters
        self.feed_builds_total        = Counter("feed_builds_total",        "Total feed builds")
        self.cache_hits_total         = Counter("cache_hits_total",         "Cache hits")
        self.cache_misses_total       = Counter("cache_misses_total",       "Cache misses")
        self.signal_events_total      = Counter("signal_events_total",      "Signal events by type")
        self.api_requests_total       = Counter("api_requests_total",       "API requests by endpoint")
        self.api_errors_total         = Counter("api_errors_total",         "API errors by endpoint")
        self.ts_filter_removals       = Counter("ts_filter_removals_total", "Trust & Safety removals")
        self.sp_filter_removals       = Counter("sp_filter_removals_total", "Social proof filter removals")

        # Histograms
        self.feed_build_duration_ms   = Histogram("feed_build_duration_ms",   "Feed build latency")
        self.feed_size                = Histogram("feed_size",                 "Posts per feed",
                                                  buckets=(5, 10, 20, 30, 40, 50, 75, 100))
        self.candidates_sourced       = Histogram("candidates_sourced",        "Raw candidates",
                                                  buckets=(50, 100, 200, 300, 500))
        self.candidates_after_filter  = Histogram("candidates_after_filter",   "After filtering",
                                                  buckets=(20, 50, 100, 200))
        self.light_ranker_kept        = Histogram("light_ranker_kept",         "After light ranking",
                                                  buckets=(20, 50, 100, 200))
        self.stage_duration_ms        = Histogram("stage_duration_ms",         "Per-stage latency")

        # Gauges
        self.pipeline_ready           = Gauge("pipeline_ready",  "Pipeline initialized")
        self.user_count               = Gauge("user_count",      "Users in store")
        self.post_count               = Gauge("post_count",      "Posts in store")

    @staticmethod
    def _stringify_keys(d: dict) -> dict:
        """Convert tuple label-keys to dot-separated strings for JSON serialization."""
        result = {}
        for k, v in d.items():
            if isinstance(k, tuple):
                str_key = ",".join(f"{a}={b}" for a, b in k) if k else "total"
            else:
                str_key = str(k)
            result[str_key] = v
        return result

    def snapshot(self) -> dict:
        return {
            "counters": {
                "feed_builds_total":   self.feed_builds_total.total(),
                "cache_hits_total":    self.cache_hits_total.total(),
                "cache_misses_total":  self.cache_misses_total.total(),
                "signal_events_total": self._stringify_keys(self.signal_events_total.all()),
                "api_requests_total":  self._stringify_keys(self.api_requests_total.all()),
                "api_errors_total":    self._stringify_keys(self.api_errors_total.all()),
                "ts_filter_removals":  self.ts_filter_removals.total(),
                "sp_filter_removals":  self.sp_filter_removals.total(),
            },
            "histograms": {
                "feed_build_duration_ms":   self.feed_build_duration_ms.summary(),
                "feed_size":                self.feed_size.summary(),
                "candidates_sourced":       self.candidates_sourced.summary(),
                "candidates_after_filter":  self.candidates_after_filter.summary(),
            },
            "gauges": {
                "pipeline_ready": self.pipeline_ready.get(),
                "user_count":     self.user_count.get(),
                "post_count":     self.post_count.get(),
            },
        }


# Global singleton
REGISTRY = MetricsRegistry()


# ─── Context manager for timing ───────────────────────────────────────────────

class timer:
    """Context manager that records elapsed time to a histogram."""

    def __init__(self, histogram: Histogram):
        self.histogram = histogram

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *args):
        elapsed_ms = (time.perf_counter() - self._start) * 1000
        self.histogram.observe(elapsed_ms)


# ─── FastAPI middleware ───────────────────────────────────────────────────────

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class MetricsMiddleware(BaseHTTPMiddleware):
    """Records request counts and latency for every API call."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        endpoint = request.url.path

        try:
            response = await call_next(request)
            elapsed_ms = (time.perf_counter() - start) * 1000
            REGISTRY.api_requests_total.inc(endpoint=endpoint, status=str(response.status_code))
            return response
        except Exception as exc:
            REGISTRY.api_errors_total.inc(endpoint=endpoint)
            raise
