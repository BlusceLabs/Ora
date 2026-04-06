use async_trait::async_trait;
use crate::types::{Query, Candidate, PipelineError};

/// Source trait — fetches raw candidates from a data store.
///
/// Each source implementation is responsible for one content lane:
///   InNetworkSource   — posts from accounts you follow (Thunder)
///   CommunitySource   — posts from your communities
///   TrendingSource    — top posts in your region
///   GraphJetSource    — out-of-network via graph traversal
///   SimClustersSource — embedding-space ANN results
///   DiscoverySource   — new creators matching your language
#[async_trait]
pub trait Source: Send + Sync {
    /// Unique name for this source (used in metrics/logging).
    fn name(&self) -> &str;

    /// Maximum candidates this source will return.
    fn max_results(&self) -> usize;

    /// Fetch candidates for the given query.
    async fn fetch(
        &self,
        query: &Query,
    ) -> Result<Vec<Candidate>, PipelineError>;
}

/// Runs all sources in parallel, merging and deduplicating results.
pub async fn fetch_all_parallel(
    sources: &[Box<dyn Source>],
    query:   &Query,
) -> Vec<Candidate> {
    use std::collections::HashSet;

    let handles: Vec<_> = sources
        .iter()
        .map(|src| src.fetch(query))
        .collect();

    let results = futures::future::join_all(handles).await;

    let mut seen_ids: HashSet<String> = HashSet::new();
    let mut candidates: Vec<Candidate> = Vec::new();

    for result in results {
        match result {
            Ok(batch) => {
                for c in batch {
                    if seen_ids.insert(c.post_id.clone()) {
                        candidates.push(c);
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Source fetch failed: {}", e);
            }
        }
    }

    candidates
}
