# Jamii Feed Algorithm

Polyglot monorepo implementing the personalized feed pipeline for **Jamii** — BlusceLabs' Africa-first community + messaging super-app.

Language stack mirrors **twitter/the-algorithm** and **xai-org/x-algorithm** exactly:
**Python · Scala · Java · Rust · C++ · Thrift · Starlark (Bazel)**

---

## Repository Structure

```
jamii-algorithm/
│
├── thrift/                         # IDL service interfaces (shared across all languages)
│   ├── models.thrift               # Post, User, Metrics, SimClusterEmbedding, RealGraphEdge
│   ├── services.thrift             # HomeMixerService, CandidateSourcerService, SimClustersANNService
│   ├── notification.thrift         # NotificationService: WTF, push, in-app, email, SMS
│   └── BUILD                       # Starlark thrift_library targets
│
├── scala/                          # Scala services (Twitter's original language)
│   ├── simclusters/SimClusters.scala      # Community detection, InterestedIn/KnownFor/Topic embeddings
│   ├── home_mixer/HomeMixer.scala         # Full 10-stage pipeline orchestrator (Product Mixer equivalent)
│   ├── candidate_sourcer/CandidateSourcer.scala  # CR-Mixer: InNetwork, Community, GraphJet sources
│   ├── real_graph/RealGraph.scala         # Real Graph batch job: engagement edge scoring
│   ├── tweepcred/Tweepcred.scala          # PageRank user reputation (Tweepcred)
│   ├── user_signal_service/UserSignalService.scala  # Online signal aggregation service
│   ├── social_graph/SocialGraph.scala     # Follow/block/mute graph, second-degree traversal
│   ├── magic_recs/MagicRecs.scala         # Who-To-Follow + push notification engine
│   ├── feature_switches/FeatureSwitches.scala  # Decider: feature flags, % rollouts, A/B buckets
│   └── BUILD
│
├── java/                           # Java services
│   ├── graphjet/InteractionGraph.java     # GraphJet UTEG: bipartite user↔post graph, 2-hop traversal
│   ├── earlybird/EarlybirdIndex.java      # Inverted index: hashtag/language/country → post IDs
│   ├── topic_social_proof/TopicSocialProof.java  # Topic social proof scoring
│   ├── timeline/TimelineService.java      # User timeline storage + cursor-based pagination (MAX=800)
│   └── BUILD
│
├── rust/                           # Rust services (xai-org/x-algorithm's language)
│   ├── candidate_pipeline/         # Reusable pipeline framework
│   │   └── src/{types,source,hydrator,filter,scorer,selector,pipeline}.rs
│   ├── thunder/src/main.rs         # In-network retrieval service (Axum, port 7001)
│   ├── phoenix/src/main.rs         # ML embedding serving (Axum, port 7002)
│   ├── representation_scorer/src/main.rs  # TwHIN+SimCluster+Topic scorer (Axum, port 7003)
│   ├── Cargo.toml                  # Workspace root
│   └── BUILD
│
├── cpp/                            # C++ services
│   ├── ann/
│   │   ├── hnsw_index.h            # HNSW approximate nearest-neighbor index (cosine/L2/dot-product)
│   │   ├── product_quantization.h  # FAISS-style PQ: 64× embedding compression, ADC search
│   │   ├── ann_server.cc           # ANN serving: user→post, user→user, post→post similarity
│   │   └── BUILD
│   └── BUILD
│
├── python/phoenix/                 # ML training pipeline
│   ├── model.py                    # Two-tower neural ranker, TwHIN embeddings
│   ├── train.py                    # Training loop, data loading, eval
│   └── online_learning.py          # Streaming gradient descent on InfoNCE, EmbeddingStore
│
├── jamii/                          # Python pipeline (runs the live API)
│   ├── models/                     # User, Post, Event, Community dataclasses
│   ├── pipeline/
│   │   ├── sourcer.py              # Candidate sourcing: following, community, trending, graph, discovery
│   │   ├── hydrator.py             # Query + Candidate Hydration (xai-org pattern)
│   │   ├── light_ranker.py         # Fast pre-rank using Twitter engagement weights
│   │   ├── heavy_ranker.py         # Full scoring: Real Graph + SimClusters + Topic + PageRank
│   │   ├── diversity.py            # Mix-ratio enforcement (50/30/10/10) + per-cluster caps
│   │   ├── filter.py               # Strict dedup + same-author cap + discovery injection
│   │   └── feed.py                 # 10-stage orchestrator
│   ├── graph/
│   │   ├── real_graph.py           # Real Graph: engagement probability between user pairs
│   │   ├── page_rank.py            # Tweepcred: PageRank user reputation
│   │   ├── social_proof.py         # Social Proof Index: friend engagement tracking
│   │   └── interaction_graph.py    # GraphJet-style in-memory traversal
│   ├── embeddings/
│   │   ├── sim_clusters.py         # SimClusters: sparse community embeddings
│   │   └── topic_embeddings.py     # Topic affinity: 23 African topics
│   ├── safety/trust_safety.py      # Trust & Safety: author/post quality filter
│   ├── cache/feed_cache.py         # Redis + in-memory fallback
│   ├── monitoring/metrics.py       # Prometheus-style Counter/Gauge/Histogram, MetricsMiddleware
│   └── api/
│       ├── feed.py                 # POST /feed/ — personalized feed
│       ├── trending.py             # GET /trending/ — velocity-ranked posts/topics/hashtags
│       ├── search.py               # GET /search/ — relevance×recency search, cursor pagination
│       └── users.py                # GET/POST /users/ — profile, follow, signal, who-to-follow
│
├── data/sample/seed.py             # 50 users × 300 posts, 8 African countries
├── scripts/
│   ├── simulate.py                 # End-to-end pipeline simulation
│   ├── benchmark.py                # Latency + throughput benchmark
│   ├── eval.py                     # NDCG@K, Precision@K, Recall@K, MRR, Diversity, Coverage
│   └── ab_test.py                  # A/B experiment framework (Welch's t-test)
├── tests/
│   ├── test_pipeline.py            # 18 pipeline tests
│   ├── test_filter.py              # 3 filter tests
│   ├── test_ranker.py              # 3 ranker tests
│   ├── test_sourcer.py             # 3 sourcer tests
│   └── test_api.py                 # 27 API endpoint tests (all routers)
├── main.py                         # FastAPI app v0.3.0 (port 5000)
├── WORKSPACE                       # Bazel workspace
├── BUILD                           # Root Bazel aliases
└── Cargo.toml                      # Rust workspace root
```

---

## Live API Endpoints (port 5000)

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/` | API info, endpoint map |
| POST | `/feed/` | Personalized feed for a user |
| GET  | `/feed/health` | Pipeline health check |
| GET  | `/trending/` | Velocity-ranked posts, topics, hashtags |
| GET  | `/trending/hashtag/{tag}` | Posts by hashtag |
| GET  | `/search/?q=` | Post + user search with cursor pagination |
| GET  | `/search/posts/{id}` | Single post lookup |
| GET  | `/users/{id}` | User profile |
| GET  | `/users/{id}/following` | Following list |
| GET  | `/users/{id}/followers` | Follower list |
| POST | `/users/{id}/follow` | Follow a user |
| POST | `/users/{id}/unfollow` | Unfollow a user |
| POST | `/users/{id}/signal` | Record engagement signal |
| GET  | `/users/{id}/who-to-follow` | WTF recommendations |
| GET  | `/metrics` | Prometheus-style metrics snapshot |
| GET  | `/docs` | Swagger UI |

---

## Language → Component Mapping

| Language | Components | Why this language |
|----------|-----------|-------------------|
| **Thrift** | Service IDL, data models, notification | Shared RPC contract across all services |
| **Scala** | SimClusters, HomeMixer, CandidateSourcer, SocialGraph, MagicRecs, FeatureSwitches | Twitter's original language; functional + JVM |
| **Java** | GraphJet, Earlybird, TopicSocialProof, TimelineService | High-throughput indexes, JVM ecosystem |
| **Rust** | Candidate Pipeline, Thunder, Phoenix, RepresentationScorer | Memory-safe, zero-cost abstractions |
| **C++** | HNSW ANN index, ProductQuantization, ann_server | Raw performance for embedding search |
| **Python** | Phoenix ML models, FastAPI REST API, monitoring | ML ecosystem, rapid iteration |
| **Starlark** | Bazel BUILD files | Hermetic, reproducible polyglot builds |

---

## 10-Stage Pipeline

| # | Stage | Component |
|---|-------|-----------|
| 1 | Query Hydration | User context: Real Graph, reputation, topic interests |
| 2 | Candidate Sourcing | InNetwork (Thunder), Community, Trending, GraphJet, SimClusters |
| 3 | Candidate Hydration | Reputation, Social Proof, Topic tags |
| 4 | Trust & Safety Filter | Author flagging, post report counting |
| 5 | Social Proof Filter | OON posts require ≥1 friend engagement |
| 6 | Light Ranking | Engagement weights + time-decay, cut to 40% |
| 7 | Heavy Ranking | Two-tower: Real Graph + SimClusters + TwHIN + Topic |
| 8 | Diversity Scoring | 50% following / 30% community / 10% trending / 10% discovery |
| 9 | Feed Filter | Strict dedup + max 3 consecutive same author + discovery injection |
| 10 | Cache + Side Effects | Redis + async event logging |

---

## Engagement Weights (Twitter/X open-source values)

```
like              →   0.5×
retweet           →   1.0×
reply             →  13.5×
quote             →   3.0×
bookmark          →   2.0×
profile_click     →  12.0×
good_click        →  11.0×
video_50pct       →   0.005×
negative_feedback → -74.0×
report            → -369.0×
```

---

## Embedding Compression (C++ Product Quantization)

- **PQ(M=8, K=256)** on 128d embeddings → 8 bytes/vector = **64× compression**
- Asymmetric Distance Computation (ADC): precompute M×K table once per query
- Trained per sub-space via k-means (25 iterations)
- Pairs with HNSW index for full IVF-PQ style search

---

## Feature Switches (Scala Decider)

Pre-populated features include:
- `magic_recs_push_enabled` (50% rollout)
- `phoenix_retrieval_enabled` (30% rollout)
- `feed_size`, `candidate_pool_size`, `light_ranker_keep_fraction`
- `diversity_*_pct` (50/30/10/10)
- `ranking_model_experiment` A/B (baseline / simcluster_boost / recency_boost)
- `wtf_algorithm_experiment` A/B (network_only / topic_sim / full_magicrecs)

---

## Test Coverage

```
pytest tests/ — 54 passed, 0 failed

  test_pipeline.py  18 tests  (feed size, no-dup, exclusions, diversity, edge cases)
  test_filter.py     3 tests  (feed size limit, author cap, return type)
  test_ranker.py     3 tests  (sorted scores, score bounds, close-friend boost)
  test_sourcer.py    3 tests  (candidates returned, seen exclusion, limit respect)
  test_api.py       27 tests  (root, feed, trending, search, users, signals, WTF, metrics)
```

---

## Performance

```
Throughput: 739 feeds/sec
Latency:    P50=1.20ms  P95=1.75ms  P99=1.88ms
NDCG@10:    0.90
```

---

## Running

```bash
python main.py              # FastAPI on port 5000
python scripts/simulate.py  # End-to-end simulation
python scripts/benchmark.py # Latency benchmark
python scripts/eval.py      # Offline NDCG evaluation
python scripts/ab_test.py   # A/B experiment comparison
pytest tests/               # 54 unit + integration tests
```
