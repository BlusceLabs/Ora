# Jamii Feed Algorithm

Standalone Python implementation of a personalized feed pipeline for **Jamii** — BlusceLabs' Africa-first community + messaging super-app. Architecture is directly inspired by Twitter/the-algorithm and xai-org/x-algorithm.

## Project Structure

```
jamii/
├── models/          # User, Post, Event, Community dataclasses
├── pipeline/
│   ├── sourcer.py      # Stage 1: Candidate sourcing (5 sources)
│   ├── hydrator.py     # Stage 3: Query + Candidate Hydration
│   ├── light_ranker.py # Stage 6: Fast pre-rank (engagement formula)
│   ├── heavy_ranker.py # Stage 7: Full neural-style scoring
│   ├── diversity.py    # Stage 8: Mix-ratio enforcement + cluster cap
│   ├── filter.py       # Stage 9: Dedup + same-author cap + discovery
│   ├── ranker.py       # Legacy single-stage ranker
│   └── feed.py         # Orchestrator — wires all 10 stages
├── graph/
│   ├── real_graph.py        # Real Graph: engagement probability between users
│   ├── page_rank.py         # Tweepcred: PageRank user reputation
│   ├── social_proof.py      # Social Proof Index: which friends engaged
│   └── interaction_graph.py # GraphJet-style traversal for discovery
├── embeddings/
│   ├── sim_clusters.py      # SimClusters: community sparse embeddings
│   └── topic_embeddings.py  # Topic affinity: user interest vectors
├── safety/
│   └── trust_safety.py      # Trust & Safety: content + author quality filter
├── cache/
│   └── feed_cache.py        # Redis FeedCache with in-memory fallback
├── api/
│   └── feed.py              # FastAPI router
└── events/
    └── tracker.py           # Event tracking
config/settings.py      # All weights and configuration
data/sample/seed.py     # 50 users × 300 posts, 8 African countries
scripts/simulate.py     # End-to-end pipeline simulation
tests/                  # pytest test suite
main.py                 # FastAPI app — port 5000
```

## 10-Stage Pipeline (Production Architecture)

| Stage | Name | Description |
|-------|------|-------------|
| 1 | Query Hydration | Assemble user context: top Real Graph authors, reputation, topic interests |
| 2 | Candidate Sourcing | Collect ~500 posts: following, community, trending, GraphJet traversal, discovery |
| 3 | Candidate Hydration | Enrich posts: author reputation, social proof score, topic tags |
| 4 | Trust & Safety Filter | Remove posts from flagged authors or over-reported posts |
| 5 | Social Proof Filter | Out-of-network posts need ≥1 connection to have engaged |
| 6 | Light Ranking | Fast pre-rank using engagement formula → top 40% |
| 7 | Heavy Ranking | Full scoring: Real Graph + SimClusters + Topic + Reputation |
| 8 | Diversity Scoring | Enforce 50/30/10/10 mix ratio + max 10 posts per topic cluster |
| 9 | Feed Filter | Strict dedup + max 3 consecutive same author + discovery injection |
| 10 | Cache | Redis cache with in-memory fallback |

## Engagement Scoring Formula (from Twitter/X algorithm)

```
score = Σ weight_i × P(engagement_i) / log(age_hours + 2)

Weights:
  like:              0.5×
  retweet:           1.0×
  reply:            13.5×
  bookmark:          2.0×
  profile_click:    12.0×
  good_click:       11.0×
  video_50pct:       0.005×
  negative_feedback: -74.0×
  report:           -369.0×
```

## Ranking Signals (Heavy Ranker)

| Signal | Weight | Source |
|--------|--------|--------|
| Real Graph score | 25% | Twitter Real Graph |
| SimCluster similarity | 15% | Twitter SimClusters |
| Engagement velocity | 15% | X-algorithm formula |
| Topic affinity | 10% | Topic Social Proof |
| Social proof | 10% | X-algorithm Social Proof Filter |
| Recency | 10% | time-decay function |
| PageRank reputation | 5% | Tweepcred |
| Language match | 5% | Africa-first |
| Location proximity | 3% | Africa-first |
| Content type affinity | 2% | User preference |

## Africa-First Signals

- **Languages**: Swahili (sw), Hausa (ha), Yoruba (yo), Zulu (zu), Igbo (ig), Amharic (am), French (fr), English (en)
- **Countries**: Kenya, Nigeria, South Africa, Ghana, Ethiopia, Tanzania, Uganda, Senegal
- Language match is an explicit ranking signal
- Location proximity (city → country → region) boosts local content
- Community membership drives candidate sourcing

## API

- **FastAPI** on port 5000
- `POST /feed/` — generate personalized feed for a user
- `GET /feed/health` — health check
- `GET /` — pipeline overview
- `GET /docs` — Swagger UI

## Running

```bash
# Start API
python main.py

# Run simulation
python scripts/simulate.py

# Run tests
pytest tests/
```

## Key Features (Sources)

From **twitter/the-algorithm**:
- Real Graph (engagement probability prediction)
- SimClusters (145k community sparse embeddings)
- Two-stage Light Ranker → Heavy Ranker
- Engagement weights (reply 13.5×, negative -74×, report -369×)
- Tweepcred (PageRank user reputation)
- Trust & Safety content filtering
- Topic Social Proof (topic affinity from fav history)
- GraphJet interaction graph traversal

From **xai-org/x-algorithm**:
- Query Hydration (user context pre-fetch)
- Candidate Hydration (post enrichment post-sourcing)
- Social Proof Filter (require friend engagement for out-of-network)
- Author Safety Filter
- Diversity Scorer (50/30/10/10 mix ratio + cluster caps)
- Time-decay normalized engagement: `score / log(age + 2)`
- Side effects pattern (async cache + event logging)
