use async_trait::async_trait;
use crate::types::{Query, Candidate, PipelineError};

/// Scorer trait — assigns a relevance score to a candidate.
///
/// Multiple scorers are combined with weights in the pipeline.
/// Scorers run sequentially; the final score is the weighted sum.
#[async_trait]
pub trait Scorer: Send + Sync {
    fn name(&self) -> &str;
    fn weight(&self) -> f64;

    async fn score(
        &self,
        query:     &Query,
        candidate: &Candidate,
    ) -> Result<f64, PipelineError>;
}

/// Applies all scorers to a batch of candidates.
pub async fn score_all(
    scorers:    &[Box<dyn Scorer>],
    query:      &Query,
    candidates: Vec<Candidate>,
) -> Vec<Candidate> {
    let mut result = candidates;
    for c in &mut result {
        let mut total = 0.0;
        let mut weight_sum = 0.0;
        for scorer in scorers {
            match scorer.score(query, c).await {
                Ok(s)  => {
                    total += s * scorer.weight();
                    weight_sum += scorer.weight();
                }
                Err(e) => tracing::warn!("Scorer {} error: {}", scorer.name(), e),
            }
        }
        if weight_sum > 0.0 {
            c.score = total / weight_sum;
        }
    }
    result
}

// ─── Concrete Scorers ─────────────────────────────────────────────────────────

/// EngagementVelocityScorer — Twitter/X engagement formula.
/// score = Σ weight_i × P(engagement_i) / log(age_hours + 2)
pub struct EngagementVelocityScorer;

#[async_trait]
impl Scorer for EngagementVelocityScorer {
    fn name(&self) -> &str { "engagement_velocity" }
    fn weight(&self) -> f64 { 0.35 }

    async fn score(&self, _query: &Query, c: &Candidate) -> Result<f64, PipelineError> {
        Ok(c.metrics.engagement_velocity(c.age_hours()))
    }
}

/// RecencyScorer — exponential decay favoring newer content.
pub struct RecencyScorer;

#[async_trait]
impl Scorer for RecencyScorer {
    fn name(&self) -> &str { "recency" }
    fn weight(&self) -> f64 { 0.20 }

    async fn score(&self, _query: &Query, c: &Candidate) -> Result<f64, PipelineError> {
        Ok(c.recency_score())
    }
}

/// RelationshipScorer — boosts content from close friends and follows.
pub struct RelationshipScorer;

#[async_trait]
impl Scorer for RelationshipScorer {
    fn name(&self) -> &str { "relationship" }
    fn weight(&self) -> f64 { 0.25 }

    async fn score(&self, query: &Query, c: &Candidate) -> Result<f64, PipelineError> {
        let score = if query.close_friends_set().contains(c.author_id.as_str()) {
            1.0
        } else if query.following_set().contains(c.author_id.as_str()) {
            0.6
        } else {
            c.social_proof_score * 0.3
        };
        Ok(score)
    }
}

/// LanguageScorer — Africa-first: exact language match is a strong signal.
pub struct LanguageScorer;

#[async_trait]
impl Scorer for LanguageScorer {
    fn name(&self) -> &str { "language_match" }
    fn weight(&self) -> f64 { 0.10 }

    async fn score(&self, query: &Query, c: &Candidate) -> Result<f64, PipelineError> {
        Ok(if c.language == query.language { 1.0 } else { 0.0 })
    }
}

/// LocationScorer — Africa-first: local content boosted.
pub struct LocationScorer;

#[async_trait]
impl Scorer for LocationScorer {
    fn name(&self) -> &str { "location" }
    fn weight(&self) -> f64 { 0.05 }

    async fn score(&self, query: &Query, c: &Candidate) -> Result<f64, PipelineError> {
        let score = match (&c.city, &query.city) {
            (Some(pc), Some(uc)) if pc == uc => 1.0,
            _ if c.country == query.country   => 0.6,
            _                                 => 0.0,
        };
        Ok(score)
    }
}

/// ReputationScorer — boosts content from high-reputation authors.
pub struct ReputationScorer;

#[async_trait]
impl Scorer for ReputationScorer {
    fn name(&self) -> &str { "reputation" }
    fn weight(&self) -> f64 { 0.05 }

    async fn score(&self, _query: &Query, c: &Candidate) -> Result<f64, PipelineError> {
        Ok(c.author_reputation)
    }
}
