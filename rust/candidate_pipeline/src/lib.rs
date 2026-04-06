/*!
 * Candidate Pipeline — reusable framework for recommendation pipelines.
 *
 * Directly mirrors xai-org/x-algorithm's `candidate-pipeline` crate:
 * a flexible Rust framework for building recommendation pipelines with:
 *   - Separation of pipeline execution from business logic
 *   - Parallel execution of independent stages
 *   - Graceful error handling at each stage
 *   - Easy addition of new sources, filters, hydrators, and scorers
 *
 * Reference: xai-org/x-algorithm → candidate-pipeline/
 *
 * Traits defined:
 *   Source    — fetches raw candidates
 *   Hydrator  — enriches candidates with metadata
 *   Filter    — removes ineligible candidates
 *   Scorer    — assigns scores to candidates
 *   Selector  — selects top-K from scored candidates
 */

pub mod source;
pub mod hydrator;
pub mod filter;
pub mod scorer;
pub mod selector;
pub mod pipeline;
pub mod types;

pub use source::Source;
pub use hydrator::Hydrator;
pub use filter::Filter;
pub use scorer::Scorer;
pub use selector::Selector;
pub use pipeline::Pipeline;
pub use types::{Candidate, Query, PipelineResult, PipelineError};
