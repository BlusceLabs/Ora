use async_trait::async_trait;
use crate::types::{Query, Candidate, PipelineError};

/// Hydrator trait — enriches candidates with additional metadata.
///
/// Mirrors xai-org/x-algorithm's candidate_hydrators:
///   - CoreMetadataHydrator  — author info, post metadata
///   - ReputationHydrator    — author PageRank score
///   - SocialProofHydrator   — social proof score
///   - TopicHydrator         — topic tags from content analysis
#[async_trait]
pub trait Hydrator: Send + Sync {
    fn name(&self) -> &str;

    async fn hydrate(
        &self,
        query:      &Query,
        candidates: Vec<Candidate>,
    ) -> Result<Vec<Candidate>, PipelineError>;
}

/// ReputationHydrator — attaches author reputation from PageRank index.
pub struct ReputationHydrator {
    pub reputation_index: std::collections::HashMap<String, f64>,
}

#[async_trait]
impl Hydrator for ReputationHydrator {
    fn name(&self) -> &str { "reputation" }

    async fn hydrate(&self, _query: &Query, mut candidates: Vec<Candidate>)
        -> Result<Vec<Candidate>, PipelineError>
    {
        for c in &mut candidates {
            c.author_reputation = self.reputation_index
                .get(&c.author_id)
                .copied()
                .unwrap_or(0.5);
        }
        Ok(candidates)
    }
}

/// SocialProofHydrator — computes social proof score per post.
/// A post has high social proof if many of the viewer's connections engaged.
pub struct SocialProofHydrator {
    /// post_id → Set<user_id> who engaged
    pub engagement_index: std::collections::HashMap<String, std::collections::HashSet<String>>,
}

#[async_trait]
impl Hydrator for SocialProofHydrator {
    fn name(&self) -> &str { "social_proof" }

    async fn hydrate(&self, query: &Query, mut candidates: Vec<Candidate>)
        -> Result<Vec<Candidate>, PipelineError>
    {
        let following: std::collections::HashSet<&str> = query.following_set();
        let close_friends: std::collections::HashSet<&str> = query.close_friends_set();

        for c in &mut candidates {
            let engagers = self.engagement_index
                .get(&c.post_id)
                .map(|s| s.as_ref())
                .unwrap_or(&std::collections::HashSet::new());

            let friend_engagements: usize = engagers.iter()
                .filter(|u| close_friends.contains(u.as_str()))
                .count();

            let follow_engagements: usize = engagers.iter()
                .filter(|u| following.contains(u.as_str()) && !close_friends.contains(u.as_str()))
                .count();

            let raw = friend_engagements as f64 * 2.0 + follow_engagements as f64;
            c.social_proof_score = (raw / 5.0).clamp(0.0, 1.0);
        }
        Ok(candidates)
    }
}

/// TopicHydrator — tags candidates with topic labels.
pub struct TopicHydrator {
    pub african_topics: Vec<String>,
}

impl Default for TopicHydrator {
    fn default() -> Self {
        Self {
            african_topics: vec![
                "politics".into(), "sports".into(), "music".into(), "tech".into(),
                "business".into(), "fashion".into(), "food".into(), "travel".into(),
                "health".into(), "entertainment".into(), "afrobeats".into(),
                "football".into(), "nollywood".into(), "comedy".into(),
            ],
        }
    }
}

#[async_trait]
impl Hydrator for TopicHydrator {
    fn name(&self) -> &str { "topic" }

    async fn hydrate(&self, _query: &Query, mut candidates: Vec<Candidate>)
        -> Result<Vec<Candidate>, PipelineError>
    {
        for c in &mut candidates {
            let tags: Vec<String> = self.african_topics.iter()
                .filter(|topic| {
                    c.hashtags.iter().any(|tag| {
                        tag.to_lowercase().contains(topic.as_str())
                    })
                })
                .cloned()
                .collect();
            c.topic_tags = tags;
        }
        Ok(candidates)
    }
}
