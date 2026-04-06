use crate::types::{Query, Candidate};

/// Selector trait — selects the final Top-K candidates for the feed.
///
/// Mirrors xai-org/x-algorithm's selector.rs:
/// Takes scored, filtered candidates and produces the final ranked list.
pub trait Selector: Send + Sync {
    fn name(&self) -> &str;

    fn select(
        &self,
        query:      &Query,
        candidates: Vec<Candidate>,
    ) -> Vec<Candidate>;
}

/// TopKSelector — sorts by score and takes top-K.
pub struct TopKSelector {
    pub k: usize,
}

impl Selector for TopKSelector {
    fn name(&self) -> &str { "top_k" }

    fn select(&self, _query: &Query, mut candidates: Vec<Candidate>) -> Vec<Candidate> {
        candidates.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        candidates.truncate(self.k);
        candidates
    }
}

/// DiversitySelector — enforces mix ratios and per-cluster caps.
/// Mirrors xai-org/x-algorithm's diversity scorer (HDBSCAN-inspired).
pub struct DiversitySelector {
    pub max_per_cluster: usize,
    pub limit:           usize,
    pub following_quota: f64,
    pub community_quota: f64,
    pub trending_quota:  f64,
    pub discovery_quota: f64,
}

impl Default for DiversitySelector {
    fn default() -> Self {
        Self {
            max_per_cluster: 8,
            limit:           50,
            following_quota: 0.50,
            community_quota: 0.30,
            trending_quota:  0.10,
            discovery_quota: 0.10,
        }
    }
}

impl Selector for DiversitySelector {
    fn name(&self) -> &str { "diversity" }

    fn select(&self, query: &Query, mut candidates: Vec<Candidate>) -> Vec<Candidate> {
        candidates.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        let following_set: std::collections::HashSet<&str> = query.following_set();

        let following_quota  = ((self.limit as f64 * self.following_quota) as usize).max(1);
        let community_quota  = ((self.limit as f64 * self.community_quota) as usize).max(1);
        let trending_quota   = ((self.limit as f64 * self.trending_quota)  as usize).max(1);
        let discovery_quota  = ((self.limit as f64 * self.discovery_quota) as usize).max(1);

        let mut buckets: std::collections::HashMap<&str, Vec<&Candidate>> = std::collections::HashMap::new();
        for c in &candidates {
            let bucket = if following_set.contains(c.author_id.as_str()) { "following" }
                         else if c.is_community { "community" }
                         else if c.country == query.country { "trending" }
                         else { "discovery" };
            buckets.entry(bucket).or_default().push(c);
        }

        let mut result = Vec::with_capacity(self.limit);
        let mut cluster_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

        let order = ["following", "community", "trending", "discovery"];
        let quotas = [following_quota, community_quota, trending_quota, discovery_quota];

        let mut ptrs: [usize; 4] = [0, 0, 0, 0];
        let mut bucket_counts: [usize; 4] = [0, 0, 0, 0];

        'outer: loop {
            let mut added = 0;
            for (i, (&bucket, &quota)) in order.iter().zip(quotas.iter()).enumerate() {
                let bucket_list = buckets.get(bucket).map(|v| v.as_slice()).unwrap_or_default();
                while ptrs[i] < bucket_list.len() && bucket_counts[i] < quota {
                    let c = bucket_list[ptrs[i]];
                    ptrs[i] += 1;
                    let cluster_key = format!("{}_{}", c.content_type.as_str(), c.language);
                    let count = cluster_counts.entry(cluster_key).or_insert(0);
                    if *count < self.max_per_cluster {
                        *count += 1;
                        bucket_counts[i] += 1;
                        result.push((*c).clone());
                        added += 1;
                        if result.len() >= self.limit { break 'outer; }
                    }
                }
            }
            if added == 0 { break; }
        }

        result
    }
}

trait ContentTypeStr {
    fn as_str(&self) -> &str;
}

impl ContentTypeStr for crate::types::ContentType {
    fn as_str(&self) -> &str {
        match self {
            crate::types::ContentType::Text  => "text",
            crate::types::ContentType::Image => "image",
            crate::types::ContentType::Video => "video",
            crate::types::ContentType::Audio => "audio",
            crate::types::ContentType::Poll  => "poll",
            crate::types::ContentType::Link  => "link",
        }
    }
}
