use async_trait::async_trait;
use crate::types::{Query, Candidate, PipelineError};

/// Filter trait — removes ineligible candidates from the pipeline.
///
/// Filters are applied sequentially. Each filter can:
///   - Remove posts from flagged authors (AuthorSafetyFilter)
///   - Remove posts lacking social proof for OON content (SocialProofFilter)
///   - Remove duplicate posts (DeduplicationFilter)
///   - Remove posts that violate content policies (TrustSafetyFilter)
#[async_trait]
pub trait Filter: Send + Sync {
    /// Unique name for this filter (used in metrics/logging).
    fn name(&self) -> &str;

    /// Returns true if this candidate should be KEPT (not filtered out).
    async fn keep(
        &self,
        query:     &Query,
        candidate: &Candidate,
    ) -> Result<bool, PipelineError>;

    /// Applies filter to a batch, returning only kept candidates.
    async fn apply(
        &self,
        query:      &Query,
        candidates: Vec<Candidate>,
    ) -> Result<Vec<Candidate>, PipelineError> {
        let mut kept = Vec::with_capacity(candidates.len());
        for c in candidates {
            match self.keep(query, &c).await {
                Ok(true)  => kept.push(c),
                Ok(false) => {}
                Err(e)    => tracing::warn!("Filter {} error: {}", self.name(), e),
            }
        }
        Ok(kept)
    }
}

/// AuthorSafetyFilter — blocks posts from flagged/suspended authors.
/// Mirrors xai-org/x-algorithm's author safety filter.
pub struct AuthorSafetyFilter {
    pub flagged_authors: std::collections::HashSet<String>,
}

#[async_trait]
impl Filter for AuthorSafetyFilter {
    fn name(&self) -> &str { "author_safety" }

    async fn keep(&self, _query: &Query, candidate: &Candidate) -> Result<bool, PipelineError> {
        Ok(!self.flagged_authors.contains(&candidate.author_id))
    }
}

/// SocialProofFilter — out-of-network posts must have social proof.
/// Mirrors xai-org/x-algorithm's social proof filter:
/// "users should only see OON posts if people in their network engaged."
pub struct SocialProofFilter {
    pub min_proof_score: f64,
}

#[async_trait]
impl Filter for SocialProofFilter {
    fn name(&self) -> &str { "social_proof" }

    async fn keep(&self, query: &Query, candidate: &Candidate) -> Result<bool, PipelineError> {
        let following = query.following_set();
        let is_in_network = following.contains(candidate.author_id.as_str())
            || query.close_friends_set().contains(candidate.author_id.as_str());

        if is_in_network {
            return Ok(true);
        }

        // OON: require social proof score above threshold
        Ok(candidate.social_proof_score >= self.min_proof_score || candidate.is_community)
    }
}

/// ReputationFilter — filters authors below minimum reputation threshold.
pub struct ReputationFilter {
    pub min_reputation: f64,
}

#[async_trait]
impl Filter for ReputationFilter {
    fn name(&self) -> &str { "reputation" }

    async fn keep(&self, _query: &Query, candidate: &Candidate) -> Result<bool, PipelineError> {
        Ok(candidate.author_reputation >= self.min_reputation)
    }
}
