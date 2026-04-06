use std::time::Instant;
use crate::types::{Query, Candidate, PipelineResult, PipelineError};
use crate::source::{Source, fetch_all_parallel};
use crate::hydrator::Hydrator;
use crate::filter::Filter;
use crate::scorer::{Scorer, score_all};
use crate::selector::Selector;

/// Pipeline — executes all stages end-to-end.
///
/// Full flow:
///   1. Parallel candidate sourcing (all sources at once)
///   2. Sequential candidate hydration
///   3. Sequential filtering
///   4. Sequential scoring (combined weighted score)
///   5. Selector (Top-K with diversity)
///   6. Side effects (async cache + logging) — triggered post-return
///
/// Mirrors xai-org/x-algorithm's PhoenixCandidatePipeline.
pub struct Pipeline {
    pub sources:   Vec<Box<dyn Source>>,
    pub hydrators: Vec<Box<dyn Hydrator>>,
    pub filters:   Vec<Box<dyn Filter>>,
    pub scorers:   Vec<Box<dyn Scorer>>,
    pub selector:  Box<dyn Selector>,
}

impl Pipeline {
    pub async fn run(&self, query: &Query) -> Result<PipelineResult, PipelineError> {
        let start = Instant::now();

        // Stage 1: Parallel sourcing
        let candidates = fetch_all_parallel(&self.sources, query).await;
        let total_sourced = candidates.len();
        tracing::info!("[Pipeline] Sourced {} candidates", total_sourced);

        // Stage 2: Hydration (sequential)
        let mut hydrated = candidates;
        for hydrator in &self.hydrators {
            hydrated = hydrator.hydrate(query, hydrated).await
                .map_err(|e| PipelineError::HydrationError(e.to_string()))?;
            tracing::debug!("[Pipeline] After hydrator '{}': {} candidates", hydrator.name(), hydrated.len());
        }

        // Stage 3: Filtering (sequential)
        let mut filtered = hydrated;
        for filter in &self.filters {
            filtered = filter.apply(query, filtered).await?;
            tracing::debug!("[Pipeline] After filter '{}': {} candidates", filter.name(), filtered.len());
        }
        let total_filtered = total_sourced - filtered.len();

        // Stage 4: Scoring
        let scored = score_all(&self.scorers, query, filtered).await;

        // Stage 5: Selection
        let feed = self.selector.select(query, scored);
        tracing::info!("[Pipeline] Final feed size: {}", feed.len());

        Ok(PipelineResult {
            feed,
            total_sourced,
            total_filtered,
            pipeline_latency_ms: start.elapsed().as_millis(),
        })
    }
}

/// Builder for constructing a Pipeline with sensible defaults.
pub struct PipelineBuilder {
    sources:   Vec<Box<dyn Source>>,
    hydrators: Vec<Box<dyn Hydrator>>,
    filters:   Vec<Box<dyn Filter>>,
    scorers:   Vec<Box<dyn Scorer>>,
    selector:  Option<Box<dyn Selector>>,
}

impl PipelineBuilder {
    pub fn new() -> Self {
        Self {
            sources:   Vec::new(),
            hydrators: Vec::new(),
            filters:   Vec::new(),
            scorers:   Vec::new(),
            selector:  None,
        }
    }

    pub fn with_source(mut self, source: Box<dyn Source>) -> Self {
        self.sources.push(source);
        self
    }

    pub fn with_hydrator(mut self, hydrator: Box<dyn Hydrator>) -> Self {
        self.hydrators.push(hydrator);
        self
    }

    pub fn with_filter(mut self, filter: Box<dyn Filter>) -> Self {
        self.filters.push(filter);
        self
    }

    pub fn with_scorer(mut self, scorer: Box<dyn Scorer>) -> Self {
        self.scorers.push(scorer);
        self
    }

    pub fn with_selector(mut self, selector: Box<dyn Selector>) -> Self {
        self.selector = Some(selector);
        self
    }

    pub fn build(self) -> Pipeline {
        use crate::selector::TopKSelector;
        Pipeline {
            sources:   self.sources,
            hydrators: self.hydrators,
            filters:   self.filters,
            scorers:   self.scorers,
            selector:  self.selector.unwrap_or_else(|| Box::new(TopKSelector { k: 50 })),
        }
    }
}
