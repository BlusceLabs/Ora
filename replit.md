# Jamii Feed Algorithm

Feed personalization algorithm for the Jamii super-app by BlusceLabs.
Africa-first social platform — community + messaging hybrid.

## Architecture

Three-stage pipeline:

1. **Candidate Sourcing** (`jamii/pipeline/sourcer.py`)
   - Following graph posts
   - Community posts
   - Trending by region/language
   - Discovery (friend-of-friend, same language)

2. **Ranking Engine** (`jamii/pipeline/ranker.py`)
   - Relationship strength (close friends > following > community > discovery)
   - Recency (exponential decay)
   - Engagement velocity (likes, comments, shares, saves)
   - Content type affinity (per-user preference)
   - Language match (Swahili, Hausa, Yoruba, Zulu, etc.)
   - Location proximity (city > country)

3. **Filter & Diversity** (`jamii/pipeline/filter.py`)
   - Max 2 consecutive posts from same author
   - Discovery post injection every 10 posts
   - Feed size enforcement

## Structure

```
jamii/
  models/       — User, Post, Community, Event
  pipeline/     — Sourcer, Ranker, Filter, FeedPipeline
  signals/      — EventTracker (view, like, share, skip)
  cache/        — Redis-based FeedCache
  ml/           — MLScorer (Phase 1: weighted, Phase 2: trained)
  api/          — FastAPI feed endpoint
config/         — Settings and ranking weights
data/sample/    — Seed data generator
scripts/        — CLI simulation
tests/          — Pytest test suite
```

## Run

```bash
python main.py           # Start API server
python scripts/simulate.py  # Run simulation
pytest tests/            # Run tests
```

## Ranking Weights (Phase 1)

| Signal | Weight |
|---|---|
| Relationship strength | 30% |
| Recency | 25% |
| Engagement velocity | 20% |
| Content type affinity | 10% |
| Language match | 10% |
| Location proximity | 5% |

## ML Roadmap

- **Phase 1** (current): Weighted rule-based scoring
- **Phase 2**: Logistic regression trained on event data
- **Phase 3**: Two-Tower Neural Network (user embedding × content embedding)
