/*!
 * RepresentationScorer — embedding-based relevance re-ranking.
 *
 * Mirrors xai-org/x-algorithm's RepresentationScorer:
 * a dedicated microservice that computes relevance scores between
 * user representations and post representations in embedding space.
 *
 * Unlike Phoenix (which does ANN retrieval), RepresentationScorer
 * takes a fixed candidate list and re-scores each one using
 * richer embedding similarity computations:
 *
 *   - TwHIN user embedding ↔ TwHIN post embedding
 *   - SimCluster user embedding ↔ SimCluster post embedding
 *   - Topic interest vector ↔ post topic vector
 *
 * Combined into a weighted blended score used by the Heavy Ranker.
 *
 * Served via HTTP on port 7003.
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
use tracing::info;

// ─── Types ────────────────────────────────────────────────────────────────────

type Embedding = Vec<f64>;

#[derive(Clone)]
struct ScorerState {
    /// user_id → TwHIN 128d embedding
    user_twhin:      Arc<HashMap<String, Embedding>>,
    /// post_id → TwHIN 128d embedding
    post_twhin:      Arc<HashMap<String, Embedding>>,
    /// user_id → SimCluster sparse embedding {cluster_id: weight}
    user_simcluster: Arc<HashMap<String, HashMap<u32, f64>>>,
    /// post_id → SimCluster sparse embedding
    post_simcluster: Arc<HashMap<String, HashMap<u32, f64>>>,
    /// user_id → topic affinities {topic: score}
    user_topics:     Arc<HashMap<String, HashMap<String, f64>>>,
    /// post_id → topic tags {topic: weight}
    post_topics:     Arc<HashMap<String, HashMap<String, f64>>>,
}

// ─── Request / Response ───────────────────────────────────────────────────────

#[derive(Deserialize)]
struct ScoreRequest {
    user_id:    String,
    post_ids:   Vec<String>,
    /// Weights for each score component: [twhin, simcluster, topic]
    weights:    Option<[f64; 3]>,
}

#[derive(Serialize)]
struct ScoreResponse {
    scores:     Vec<PostScore>,
    model_version: String,
}

#[derive(Serialize, Clone)]
struct PostScore {
    post_id:          String,
    twhin_score:      f64,
    simcluster_score: f64,
    topic_score:      f64,
    blended_score:    f64,
}

// ─── Similarity functions ─────────────────────────────────────────────────────

fn cosine_sim(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() || a.is_empty() { return 0.0; }
    let dot:  f64 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let na:   f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let nb:   f64 = b.iter().map(|y| y * y).sum::<f64>().sqrt();
    if na == 0.0 || nb == 0.0 { return 0.0; }
    (dot / (na * nb)).clamp(0.0, 1.0)
}

fn sparse_dot(a: &HashMap<u32, f64>, b: &HashMap<u32, f64>) -> f64 {
    // Always iterate over the smaller map
    let (small, large) = if a.len() <= b.len() { (a, b) } else { (b, a) };
    small.iter()
        .filter_map(|(k, v)| large.get(k).map(|u| v * u))
        .sum()
}

fn sparse_cosine(a: &HashMap<u32, f64>, b: &HashMap<u32, f64>) -> f64 {
    let dot = sparse_dot(a, b);
    let na: f64 = a.values().map(|v| v * v).sum::<f64>().sqrt();
    let nb: f64 = b.values().map(|v| v * v).sum::<f64>().sqrt();
    if na == 0.0 || nb == 0.0 { return 0.0; }
    (dot / (na * nb)).clamp(0.0, 1.0)
}

fn topic_overlap(user: &HashMap<String, f64>, post: &HashMap<String, f64>) -> f64 {
    let score: f64 = user.iter()
        .filter_map(|(topic, u_weight)| post.get(topic).map(|p_weight| u_weight * p_weight))
        .sum();
    // Normalize: 5.0 treated as "perfect" topic alignment
    (score / 5.0).clamp(0.0, 1.0)
}

// ─── Handler ─────────────────────────────────────────────────────────────────

async fn score_candidates(
    State(state): State<ScorerState>,
    Json(req):    Json<ScoreRequest>,
) -> Result<Json<ScoreResponse>, StatusCode> {
    let weights = req.weights.unwrap_or([0.40, 0.35, 0.25]);
    let [w_twhin, w_simcluster, w_topic] = weights;

    let user_twhin_emb   = state.user_twhin.get(&req.user_id);
    let user_simcluster  = state.user_simcluster.get(&req.user_id);
    let user_topics      = state.user_topics.get(&req.user_id);

    let scores: Vec<PostScore> = req.post_ids.iter().map(|post_id| {
        // TwHIN dense cosine similarity
        let twhin_score = match (user_twhin_emb, state.post_twhin.get(post_id)) {
            (Some(u), Some(p)) => cosine_sim(u, p),
            _ => 0.0,
        };

        // SimCluster sparse cosine similarity
        let simcluster_score = match (user_simcluster, state.post_simcluster.get(post_id)) {
            (Some(u), Some(p)) => sparse_cosine(u, p),
            _ => 0.0,
        };

        // Topic affinity overlap
        let topic_score = match (user_topics, state.post_topics.get(post_id)) {
            (Some(u), Some(p)) => topic_overlap(u, p),
            _ => 0.0,
        };

        let blended_score = w_twhin * twhin_score
            + w_simcluster * simcluster_score
            + w_topic      * topic_score;

        PostScore {
            post_id:          post_id.clone(),
            twhin_score,
            simcluster_score,
            topic_score,
            blended_score,
        }
    }).collect();

    info!("[RepScorer] Scored {} posts for user {}", scores.len(), req.user_id);

    Ok(Json(ScoreResponse {
        scores,
        model_version: "twhin-v2-simcluster-v3".to_string(),
    }))
}

async fn health() -> &'static str { "OK" }

// ─── Main ─────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = ScorerState {
        user_twhin:      Arc::new(HashMap::new()),
        post_twhin:      Arc::new(HashMap::new()),
        user_simcluster: Arc::new(HashMap::new()),
        post_simcluster: Arc::new(HashMap::new()),
        user_topics:     Arc::new(HashMap::new()),
        post_topics:     Arc::new(HashMap::new()),
    };

    let app = Router::new()
        .route("/score",  post(score_candidates))
        .route("/health", axum::routing::get(health))
        .with_state(state);

    let addr = "0.0.0.0:7003";
    info!("[RepresentationScorer] Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
