# Jamii Feed Algorithm

Polyglot monorepo implementing the personalized feed pipeline for **Jamii** — BlusceLabs' Africa-first community + messaging super-app.

Language stack mirrors **twitter/the-algorithm** and **xai-org/x-algorithm** exactly:
**Python · Scala · Java · Rust · C++ · Thrift · Starlark (Bazel)**

---

## Repository Structure

```
jamii-algorithm/
│
├── thrift/                    # IDL service interfaces (shared across all languages)
│   ├── models.thrift          # Post, User, Metrics, SimClusterEmbedding, RealGraphEdge
│   ├── services.thrift        # HomeMixerService, CandidateSourcerService, SimClustersANNService
│   └── BUILD                  # Starlark thrift_library targets
│
├── scala/                     # Scala services (Twitter's original language)
│   ├── simclusters/
│   │   └── SimClusters.scala  # Community detection, InterestedIn/KnownFor/Topic embeddings, ANN index
│   ├── home_mixer/
│   │   └── HomeMixer.scala    # Full 10-stage pipeline orchestrator (Product Mixer equivalent)
│   ├── candidate_sourcer/
│   │   └── CandidateSourcer.scala # CR-Mixer: InNetwork, Community, GraphJet, SimClusters sources
│   └── BUILD                  # scala_library / scala_binary / scala_test targets
│
├── java/                      # Java services
│   ├── graphjet/
│   │   └── InteractionGraph.java  # GraphJet-style UTEG: bipartite user↔post graph, 2-hop traversal
│   ├── earlybird/
│   │   └── EarlybirdIndex.java    # Inverted index: hashtag/language/country/author → post IDs
│   └── BUILD                  # java_library / java_binary targets
│
├── rust/                      # Rust services (xai-org/x-algorithm's language)
│   ├── candidate_pipeline/    # Reusable pipeline framework (mirrors x-algorithm's crate)
│   │   └── src/
│   │       ├── lib.rs         # Module exports
│   │       ├── types.rs       # Query, Candidate, Metrics, PipelineResult, PipelineError
│   │       ├── source.rs      # Source trait + parallel fetch_all_parallel()
│   │       ├── hydrator.rs    # Hydrator trait: Reputation, SocialProof, Topic hydrators
│   │       ├── filter.rs      # Filter trait: AuthorSafety, SocialProof, Reputation filters
│   │       ├── scorer.rs      # Scorer trait: Engagement, Recency, Relationship, Language, Location
│   │       ├── selector.rs    # Selector trait: TopK, DiversitySelector (50/30/10/10 mix)
│   │       └── pipeline.rs    # Pipeline orchestrator + PipelineBuilder
│   ├── thunder/               # In-network retrieval service
│   │   └── src/main.rs        # Axum HTTP server: Real Graph weighted in-network sourcing
│   ├── Cargo.toml             # Workspace root
│   └── BUILD                  # rust_library / rust_binary targets
│
├── cpp/                       # C++ services
│   ├── ann/
│   │   ├── hnsw_index.h       # HNSW approximate nearest-neighbor index (cosine/L2/dot-product)
│   │   ├── ann_server.cc      # ANN serving: user→post, user→user, post→post similarity
│   │   └── BUILD              # cc_library / cc_binary targets
│   └── BUILD
│
├── python/                    # Python (orchestration + ML)
│   └── phoenix/
│       ├── model.py           # Two-tower neural ranker, TwHIN embeddings, engagement label formula
│       ├── __init__.py
│       └── BUILD
│
├── jamii/                     # Python pipeline (runs the live API)
│   ├── models/                # User, Post, Event, Community dataclasses
│   ├── pipeline/
│   │   ├── sourcer.py         # Candidate sourcing: following, community, trending, graph, discovery
│   │   ├── hydrator.py        # Query + Candidate Hydration (xai-org pattern)
│   │   ├── light_ranker.py    # Fast pre-rank using Twitter engagement weights
│   │   ├── heavy_ranker.py    # Full scoring: Real Graph + SimClusters + Topic + PageRank
│   │   ├── diversity.py       # Mix-ratio enforcement (50/30/10/10) + per-cluster caps
│   │   ├── filter.py          # Strict dedup + same-author cap + discovery injection
│   │   └── feed.py            # 10-stage orchestrator
│   ├── graph/
│   │   ├── real_graph.py      # Real Graph: engagement probability between user pairs
│   │   ├── page_rank.py       # Tweepcred: PageRank user reputation
│   │   ├── social_proof.py    # Social Proof Index: friend engagement tracking
│   │   └── interaction_graph.py # GraphJet-style in-memory traversal
│   ├── embeddings/
│   │   ├── sim_clusters.py    # SimClusters: sparse community embeddings
│   │   └── topic_embeddings.py # Topic affinity: 23 African topics
│   ├── safety/
│   │   └── trust_safety.py    # Trust & Safety: author/post quality filter
│   ├── cache/
│   │   └── feed_cache.py      # Redis + in-memory fallback
│   └── api/feed.py            # FastAPI router
│
├── data/sample/seed.py        # 50 users × 300 posts, 8 African countries
├── scripts/simulate.py        # End-to-end pipeline simulation
├── tests/                     # pytest test suite
├── main.py                    # FastAPI app (port 5000)
├── WORKSPACE                  # Bazel workspace (Python, Scala, Java, Rust, C++ rules)
├── BUILD                      # Root Bazel targets / aliases
└── Cargo.toml                 # Rust workspace root
```

---

## Language → Component Mapping

| Language | Components | Why this language |
|----------|-----------|-------------------|
| **Thrift** | Service IDL, data models | Shared RPC contract across all services (same as Twitter) |
| **Scala** | SimClusters, Home Mixer, CR-Mixer | Twitter's original language; functional + JVM |
| **Java** | GraphJet, Earlybird | High-throughput inverted indexes, JVM ecosystem |
| **Rust** | Candidate Pipeline framework, Thunder | Memory-safe, zero-cost abstractions, xai-org's choice |
| **C++** | HNSW ANN server, model serving | Raw performance for embedding search (O(log N)) |
| **Python** | Phoenix ML models, FastAPI orchestration | ML ecosystem (NumPy/JAX), rapid iteration |
| **Starlark** | Bazel BUILD files | Hermetic, reproducible polyglot builds |

---

## 10-Stage Pipeline

| # | Stage | Language | Component |
|---|-------|----------|-----------|
| 1 | Query Hydration | Python/Rust | Assemble user context: Real Graph, reputation, topic interests |
| 2 | Candidate Sourcing | Scala/Rust | InNetwork (Thunder), Community, Trending, GraphJet, SimClusters |
| 3 | Candidate Hydration | Rust | Reputation, Social Proof, Topic tags |
| 4 | Trust & Safety Filter | Python/Scala | Author flagging, post report counting |
| 5 | Social Proof Filter | Rust | OON posts require ≥1 friend engagement |
| 6 | Light Ranking | Python/Scala | Engagement weights + time-decay, cut to 40% |
| 7 | Heavy Ranking | Python (Phoenix) | Two-tower: Real Graph + SimClusters + TwHIN + Topic |
| 8 | Diversity Scoring | Rust (DiversitySelector) | 50% following / 30% community / 10% trending / 10% discovery |
| 9 | Feed Filter | Python | Strict dedup + max 3 consecutive same author + discovery injection |
| 10 | Cache + Side Effects | Python | Redis + async event logging |

---

## Engagement Scoring (Twitter/X open-source weights)

```
score = Σ weight_i × P(engagement_i) / log(age_hours + 2)

like              →   0.5×
retweet           →   1.0×
reply             →  13.5×
bookmark          →   2.0×
profile_click     →  12.0×
good_click        →  11.0×
video_50pct       →   0.005×
negative_feedback → -74.0×
report            → -369.0×
```

---

## ANN Index (C++ HNSW)

- **O(log N)** query time for 128d embeddings
- Supports cosine, L2, dot-product distance
- Online insert (no batch rebuild required)
- Backs SimClustersANNService and TwHIN lookup

---

## Africa-First Signals

| Signal | Languages | Countries |
|--------|-----------|-----------|
| Language match (10% weight) | Swahili, Hausa, Yoruba, Zulu, Igbo, Amharic, French, English | — |
| Location proximity (5%) | — | Kenya, Nigeria, South Africa, Ghana, Ethiopia, Tanzania, Uganda, Senegal |
| Community membership | — | 8 countries × multiple communities |

---

## Build System (Bazel + Starlark)

```bash
# Build all targets
bazel build //...

# Run specific service
bazel run //:home_mixer          # Scala home mixer
bazel run //:thunder             # Rust in-network server
bazel run //:ann_server          # C++ ANN server
bazel run //:candidate_pipeline  # Rust pipeline lib

# Tests
bazel test //scala/...
bazel test //java/...
bazel test //rust/...
```

---

## Running (Python API — live)

```bash
python main.py          # FastAPI on port 5000
python scripts/simulate.py  # End-to-end simulation
pytest tests/           # Unit tests
```
