/*!
 * Thunder — In-network content retrieval service.
 *
 * Mirrors xai-org/x-algorithm's Thunder component:
 * retrieves posts from accounts the viewer follows, using Real Graph
 * scores to prioritize which authors get more candidates included.
 *
 * Reference: xai-org/x-algorithm → home-mixer/sources/
 *
 * Responsibilities:
 *   - Retrieve up to 200 candidates from followed accounts
 *   - Apply Real Graph weighting to author priority
 *   - Apply light engagement-velocity ranking
 *   - Serve over gRPC (or HTTP/JSON for local dev)
 *
 * Real Graph integration:
 *   Each (viewer, author) pair has a Real Graph score [0, 100].
 *   Authors with higher scores contribute more candidates to the feed.
 *   This is how Twitter selects "the most relevant tweets" from people you follow.
 */

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use candidate_pipeline::types::{Query, Candidate, ContentType, Metrics};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
use tracing::{info, warn};

// ─── State ───────────────────────────────────────────────────────────────────

#[derive(Clone)]
struct ThunderState {
    post_store:       Arc<HashMap<String, Candidate>>,
    real_graph_scores: Arc<HashMap<(String, String), f64>>,
}

// ─── Request / Response ───────────────────────────────────────────────────────

#[derive(Deserialize)]
struct ThunderRequest {
    user_id:         String,
    language:        String,
    country:         String,
    city:            Option<String>,
    following:       Vec<String>,
    close_friends:   Vec<String>,
    community_ids:   Vec<String>,
    exclude_post_ids: Vec<String>,
    max_results:     Option<usize>,
}

#[derive(Serialize)]
struct ThunderResponse {
    candidates:    Vec<ThunderCandidate>,
    source:        String,
    total_fetched: usize,
}

#[derive(Serialize)]
struct ThunderCandidate {
    post_id:     String,
    author_id:   String,
    language:    String,
    country:     String,
    score:       f64,
    source:      String,
}

// ─── Handler ─────────────────────────────────────────────────────────────────

async fn get_candidates(
    State(state): State<ThunderState>,
    Json(req): Json<ThunderRequest>,
) -> Result<Json<ThunderResponse>, StatusCode> {
    let max = req.max_results.unwrap_or(200);
    let exclude_set: std::collections::HashSet<&str> =
        req.exclude_post_ids.iter().map(|s| s.as_str()).collect();
    let follow_set: std::collections::HashSet<&str> =
        req.following.iter().chain(req.close_friends.iter()).map(|s| s.as_str()).collect();

    let mut candidates: Vec<(f64, &Candidate)> = state.post_store.values()
        .filter(|p| {
            follow_set.contains(p.author_id.as_str()) &&
            !exclude_set.contains(p.post_id.as_str())
        })
        .map(|p| {
            let rg_score = state.real_graph_scores
                .get(&(req.user_id.clone(), p.author_id.clone()))
                .copied()
                .unwrap_or(0.0);
            let engagement = p.metrics.engagement_velocity(p.age_hours());
            // Real Graph weights 40% of the score, engagement 60%
            let score = rg_score / 100.0 * 0.4 + engagement * 0.6;
            (score, p)
        })
        .collect();

    candidates.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    candidates.truncate(max);

    let result: Vec<ThunderCandidate> = candidates.iter().map(|(score, p)| {
        ThunderCandidate {
            post_id:   p.post_id.clone(),
            author_id: p.author_id.clone(),
            language:  p.language.clone(),
            country:   p.country.clone(),
            score:     *score,
            source:    "thunder".into(),
        }
    }).collect();

    let total = result.len();
    info!("[Thunder] Returning {} candidates for user {}", total, req.user_id);

    Ok(Json(ThunderResponse {
        candidates: result,
        source: "thunder".into(),
        total_fetched: total,
    }))
}

// ─── Health ───────────────────────────────────────────────────────────────────

async fn health() -> &'static str { "OK" }

// ─── Main ─────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = ThunderState {
        post_store:        Arc::new(HashMap::new()),
        real_graph_scores: Arc::new(HashMap::new()),
    };

    let app = Router::new()
        .route("/candidates", post(get_candidates))
        .route("/health",     axum::routing::get(health))
        .with_state(state);

    let addr = "0.0.0.0:7001";
    info!("[Thunder] Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
