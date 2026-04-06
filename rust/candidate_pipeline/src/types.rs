use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Core query struct — carries user context through all pipeline stages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Query {
    pub user_id:        String,
    pub language:       String,
    pub country:        String,
    pub city:           Option<String>,
    pub following:      Vec<String>,
    pub close_friends:  Vec<String>,
    pub community_ids:  Vec<String>,
    pub exclude_ids:    Vec<String>,
    pub max_results:    usize,
    pub page_token:     Option<String>,
}

impl Query {
    pub fn following_set(&self) -> std::collections::HashSet<&str> {
        self.following.iter().map(|s| s.as_str()).collect()
    }

    pub fn close_friends_set(&self) -> std::collections::HashSet<&str> {
        self.close_friends.iter().map(|s| s.as_str()).collect()
    }

    pub fn exclude_set(&self) -> std::collections::HashSet<&str> {
        self.exclude_ids.iter().map(|s| s.as_str()).collect()
    }
}

/// Engagement metrics carried with each candidate.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Metrics {
    pub views:           u64,
    pub likes:           u32,
    pub comments:        u32,
    pub shares:          u32,
    pub saves:           u32,
    pub completion_rate: f64,
}

impl Metrics {
    /// Engagement velocity = weighted_engagement / log(age_hours + 2)
    /// Uses Twitter/X open-source engagement weights.
    pub fn engagement_velocity(&self, age_hours: f64) -> f64 {
        let views = self.views.max(1) as f64;
        let raw = 0.5  * (self.likes    as f64 / views)
                + 1.0  * (self.shares   as f64 / views)
                + 13.5 * (self.comments as f64 / views)
                + 2.0  * (self.saves    as f64 / views);
        (raw / (age_hours + 2.0).ln()).clamp(0.0, 1.0)
    }
}

/// Content type enum matching the Thrift IDL.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContentType {
    Text,
    Image,
    Video,
    Audio,
    Poll,
    Link,
}

/// A candidate post moving through the pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Candidate {
    pub post_id:          String,
    pub author_id:        String,
    pub content_type:     ContentType,
    pub language:         String,
    pub country:          String,
    pub city:             Option<String>,
    pub hashtags:         Vec<String>,
    pub created_at:       DateTime<Utc>,
    pub metrics:          Metrics,
    pub is_community:     bool,
    pub community_ids:    Vec<String>,

    // Pipeline-assigned fields (set during hydration/scoring)
    pub score:            f64,
    pub source:           String,
    pub author_reputation: f64,
    pub social_proof_score: f64,
    pub topic_tags:       Vec<String>,
}

impl Candidate {
    pub fn age_hours(&self) -> f64 {
        let now = Utc::now();
        let delta = now - self.created_at;
        delta.num_seconds() as f64 / 3600.0
    }

    pub fn recency_score(&self) -> f64 {
        let hours = self.age_hours();
        match hours as u64 {
            0..=1   => 1.0,
            2..=6   => 0.85,
            7..=12  => 0.65,
            13..=24 => 0.45,
            25..=48 => 0.25,
            _       => (1.0 / (1.0 + hours / 24.0)).max(0.05),
        }
    }
}

/// Final pipeline result with metadata.
#[derive(Debug)]
pub struct PipelineResult {
    pub feed:              Vec<Candidate>,
    pub total_sourced:     usize,
    pub total_filtered:    usize,
    pub pipeline_latency_ms: u128,
}

/// Pipeline execution errors.
#[derive(Debug, thiserror::Error)]
pub enum PipelineError {
    #[error("source error in {source}: {message}")]
    SourceError { source: String, message: String },

    #[error("hydration error: {0}")]
    HydrationError(String),

    #[error("scoring error: {0}")]
    ScoringError(String),

    #[error("timeout after {ms}ms")]
    Timeout { ms: u64 },
}
