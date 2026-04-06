/*!
 * Phoenix — ML-based out-of-network candidate retrieval.
 *
 * Mirrors xai-org/x-algorithm's Phoenix component:
 * uses the trained two-tower model and TwHIN embeddings to find
 * posts the viewer is likely to engage with, even from accounts
 * they don't follow.
 *
 * Reference: xai-org/x-algorithm → phoenix/
 *
 * Pipeline:
 *   1. Look up viewer's TwHIN user embedding (128d vector)
 *   2. Query the ANN index for top-K nearest post embeddings
 *   3. Re-rank using engagement velocity + language match + recency
 *   4. Apply social proof filter (require ≥1 connection engaged)
 *   5. Return as ScoredPost list to Home Mixer
 *
 * Served via HTTP on port 7002 (Thunder is 7001, Python API is 5000).
 */

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
use tracing::{info, warn};

// ─── State ────────────────────────────────────────────────────────────────────

#[derive(Clone)]
struct PhoenixState {
    /// Precomputed user embeddings: user_id → Vec<f64> (128d TwHIN vector)
    user_embeddings:  Arc<HashMap<String, Vec<f64>>>,
    /// Precomputed post embeddings: post_id → Vec<f64>
    post_embeddings:  Arc<HashMap<String, Vec<f64>>>,
    /// Post metadata for scoring: post_id → PostMeta
    post_meta:        Arc<HashMap<String, PostMeta>>,
    /// Social proof: post_id → Set<user_id> who engaged
    social_proof_index: Arc<HashMap<String, Vec<String>>>,
}

#[derive(Clone, Debug)]
struct PostMeta {
    post_id:     String,
    author_id:   String,
    language:    String,
    country:     String,
    age_hours:   f64,
    likes:       u32,
    comments:    u32,
    shares:      u32,
    saves:       u32,
    views:       u32,
}

// ─── Request / Response ───────────────────────────────────────────────────────

#[derive(Deserialize)]
struct PhoenixRequest {
    user_id:         String,
    language:        String,
    country:         String,
    following:       Vec<String>,
    close_friends:   Vec<String>,
    exclude_post_ids: Vec<String>,
    max_results:     Option<usize>,
}

#[derive(Serialize)]
struct PhoenixResponse {
    candidates:    Vec<PhoenixCandidate>,
    source:        String,
    total_fetched: usize,
}

#[derive(Serialize, Clone)]
struct PhoenixCandidate {
    post_id:          String,
    author_id:        String,
    language:         String,
    embedding_score:  f64,
    engagement_score: f64,
    social_proof:     f64,
    final_score:      f64,
    source:           String,
}

// ─── ANN (approximate nearest-neighbor in embedding space) ───────────────────

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() { return 0.0; }
    let dot:  f64 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let na:   f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let nb:   f64 = b.iter().map(|y| y * y).sum::<f64>().sqrt();
    if na == 0.0 || nb == 0.0 { return 0.0; }
    (dot / (na * nb)).clamp(-1.0, 1.0)
}

fn embedding_score_all(
    user_emb:       &[f64],
    post_embeddings: &HashMap<String, Vec<f64>>,
    exclude:        &std::collections::HashSet<String>,
    top_k:          usize,
) -> Vec<(String, f64)> {
    let mut scores: Vec<(String, f64)> = post_embeddings.iter()
        .filter(|(pid, _)| !exclude.contains(*pid))
        .map(|(pid, emb)| (pid.clone(), cosine_similarity(user_emb, emb)))
        .collect();

    scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    scores.truncate(top_k * 3);  // Fetch 3× for re-ranking
    scores
}

// ─── Engagement velocity ──────────────────────────────────────────────────────

fn engagement_velocity(meta: &PostMeta) -> f64 {
    let views = meta.views.max(1) as f64;
    let raw = 0.5  * meta.likes    as f64 / views
            + 1.0  * meta.shares   as f64 / views
            + 13.5 * meta.comments as f64 / views
            + 2.0  * meta.saves    as f64 / views;
    (raw / (meta.age_hours + 2.0).ln()).clamp(0.0, 1.0)
}

// ─── Social proof ─────────────────────────────────────────────────────────────

fn social_proof_score(
    post_id:      &str,
    following:    &[String],
    close_friends: &[String],
    index:        &HashMap<String, Vec<String>>,
) -> f64 {
    let engagers = match index.get(post_id) {
        Some(e) => e,
        None    => return 0.0,
    };

    let follow_set: std::collections::HashSet<&str> =
        following.iter().chain(close_friends).map(|s| s.as_str()).collect();
    let close_set: std::collections::HashSet<&str> =
        close_friends.iter().map(|s| s.as_str()).collect();

    let score: f64 = engagers.iter().map(|uid| {
        if close_set.contains(uid.as_str()) { 2.0 }
        else if follow_set.contains(uid.as_str()) { 1.0 }
        else { 0.0 }
    }).sum();

    (score / 5.0).clamp(0.0, 1.0)
}

// ─── Handler ─────────────────────────────────────────────────────────────────

async fn get_candidates(
    State(state): State<PhoenixState>,
    Json(req):    Json<PhoenixRequest>,
) -> Result<Json<PhoenixResponse>, StatusCode> {
    let max = req.max_results.unwrap_or(100);
    let exclude: std::collections::HashSet<String> =
        req.exclude_post_ids.iter().cloned().collect();

    let user_emb = match state.user_embeddings.get(&req.user_id) {
        Some(e) => e,
        None    => {
            warn!("[Phoenix] No embedding for user {}", req.user_id);
            return Ok(Json(PhoenixResponse {
                candidates:    vec![],
                source:        "phoenix".into(),
                total_fetched: 0,
            }));
        }
    };

    // ANN search
    let ann_results = embedding_score_all(user_emb, &state.post_embeddings, &exclude, max * 3);

    // Re-rank: combine embedding score with engagement + language + recency
    let mut candidates: Vec<PhoenixCandidate> = ann_results.iter()
        .filter_map(|(post_id, emb_score)| {
            let meta = state.post_meta.get(post_id)?;
            let engagement  = engagement_velocity(meta);
            let lang_match  = if meta.language == req.language { 1.0 } else { 0.0 };
            let recency     = (1.0 / (1.0 + meta.age_hours / 24.0)).clamp(0.0, 1.0);
            let sp          = social_proof_score(
                post_id, &req.following, &req.close_friends, &state.social_proof_index
            );

            let final_score = 0.40 * emb_score
                            + 0.25 * engagement
                            + 0.15 * recency
                            + 0.10 * lang_match
                            + 0.10 * sp;

            Some(PhoenixCandidate {
                post_id:         post_id.clone(),
                author_id:       meta.author_id.clone(),
                language:        meta.language.clone(),
                embedding_score: *emb_score,
                engagement_score: engagement,
                social_proof:    sp,
                final_score,
                source: "phoenix".into(),
            })
        })
        .collect();

    candidates.sort_by(|a, b| b.final_score.partial_cmp(&a.final_score)
        .unwrap_or(std::cmp::Ordering::Equal));
    candidates.truncate(max);

    let total = candidates.len();
    info!("[Phoenix] Returning {} OON candidates for user {}", total, req.user_id);

    Ok(Json(PhoenixResponse {
        candidates,
        source:        "phoenix".into(),
        total_fetched: total,
    }))
}

async fn health() -> &'static str { "OK" }

// ─── Main ─────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = PhoenixState {
        user_embeddings:    Arc::new(HashMap::new()),
        post_embeddings:    Arc::new(HashMap::new()),
        post_meta:          Arc::new(HashMap::new()),
        social_proof_index: Arc::new(HashMap::new()),
    };

    let app = Router::new()
        .route("/candidates", post(get_candidates))
        .route("/health",     axum::routing::get(health))
        .with_state(state);

    let addr = "0.0.0.0:7002";
    info!("[Phoenix] Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
