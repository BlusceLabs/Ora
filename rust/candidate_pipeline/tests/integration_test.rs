/*!
 * Integration tests for the Candidate Pipeline framework.
 * Tests Source, Filter, Scorer, Selector, and full Pipeline execution.
 */

use candidate_pipeline::types::*;
use candidate_pipeline::filter::{Filter, AuthorSafetyFilter, SocialProofFilter};
use candidate_pipeline::scorer::{Scorer, EngagementVelocityScorer, RecencyScorer, LanguageScorer};
use candidate_pipeline::selector::{Selector, TopKSelector, DiversitySelector};
use chrono::{Utc, Duration};
use std::collections::HashSet;

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn make_query(user_id: &str, language: &str, country: &str) -> Query {
    Query {
        user_id:       user_id.to_string(),
        language:      language.to_string(),
        country:       country.to_string(),
        city:          Some("Nairobi".to_string()),
        following:     vec!["author1".to_string(), "author2".to_string()],
        close_friends: vec!["author1".to_string()],
        community_ids: vec!["community_ke".to_string()],
        exclude_ids:   vec![],
        max_results:   50,
        page_token:    None,
    }
}

fn make_candidate(post_id: &str, author_id: &str, language: &str, country: &str) -> Candidate {
    Candidate {
        post_id:           post_id.to_string(),
        author_id:         author_id.to_string(),
        content_type:      ContentType::Text,
        language:          language.to_string(),
        country:           country.to_string(),
        city:              Some("Nairobi".to_string()),
        hashtags:          vec!["#tech".to_string()],
        created_at:        Utc::now() - Duration::hours(2),
        metrics:           Metrics { views: 1000, likes: 50, comments: 10, shares: 5, saves: 3, completion_rate: 0.7 },
        is_community:      false,
        community_ids:     vec![],
        score:             0.0,
        source:            "test".to_string(),
        author_reputation: 0.8,
        social_proof_score: 0.0,
        topic_tags:        vec![],
    }
}

// ─── Metrics Tests ────────────────────────────────────────────────────────────

#[test]
fn metrics_engagement_velocity_positive() {
    let m = Metrics { views: 1000, likes: 100, comments: 20, shares: 10, saves: 5, completion_rate: 0.8 };
    let vel = m.engagement_velocity(1.0);
    assert!(vel > 0.0 && vel <= 1.0, "velocity should be in (0,1], got {}", vel);
}

#[test]
fn metrics_zero_views_doesnt_panic() {
    let m = Metrics { views: 0, likes: 10, comments: 5, shares: 2, saves: 1, completion_rate: 0.5 };
    let vel = m.engagement_velocity(1.0);
    assert!(vel >= 0.0);
}

// ─── Candidate Tests ──────────────────────────────────────────────────────────

#[test]
fn candidate_recency_score_fresh() {
    let c = make_candidate("p1", "a1", "sw", "KE");
    assert!((c.recency_score() - 0.85).abs() < 0.01, "2h old post should score ~0.85");
}

#[test]
fn candidate_recency_score_old() {
    let mut c = make_candidate("p1", "a1", "sw", "KE");
    c.created_at = Utc::now() - Duration::days(10);
    assert!(c.recency_score() < 0.25);
}

// ─── Filter Tests ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn author_safety_filter_removes_flagged() {
    let flagged = HashSet::from(["bad_author".to_string()]);
    let filter = AuthorSafetyFilter { flagged_authors: flagged };
    let query = make_query("u1", "sw", "KE");

    let kept = filter.keep(&query, &make_candidate("p1", "good_author", "sw", "KE")).await.unwrap();
    let removed = filter.keep(&query, &make_candidate("p2", "bad_author", "sw", "KE")).await.unwrap();

    assert!(kept,    "good author should be kept");
    assert!(!removed, "bad author should be removed");
}

#[tokio::test]
async fn social_proof_filter_keeps_in_network() {
    let filter = SocialProofFilter { min_proof_score: 0.1 };
    let query  = make_query("u1", "sw", "KE");
    let in_network = make_candidate("p1", "author1", "sw", "KE");  // author1 is in following

    let kept = filter.keep(&query, &in_network).await.unwrap();
    assert!(kept, "in-network post should always be kept");
}

#[tokio::test]
async fn social_proof_filter_removes_oon_without_proof() {
    let filter = SocialProofFilter { min_proof_score: 0.1 };
    let query  = make_query("u1", "sw", "KE");
    let mut oon = make_candidate("p1", "unknown_author", "sw", "KE");
    oon.social_proof_score = 0.0;  // no social proof

    let kept = filter.keep(&query, &oon).await.unwrap();
    assert!(!kept, "OON post with no social proof should be removed");
}

// ─── Scorer Tests ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn engagement_velocity_scorer_range() {
    let scorer = EngagementVelocityScorer;
    let query  = make_query("u1", "sw", "KE");
    let c      = make_candidate("p1", "a1", "sw", "KE");
    let score  = scorer.score(&query, &c).await.unwrap();
    assert!((0.0..=1.0).contains(&score), "score must be in [0,1], got {}", score);
}

#[tokio::test]
async fn language_scorer_matches_user_language() {
    let scorer = LanguageScorer;
    let query  = make_query("u1", "sw", "KE");

    let match_c  = make_candidate("p1", "a1", "sw", "KE");
    let no_match = make_candidate("p2", "a2", "en", "KE");

    let s1 = scorer.score(&query, &match_c).await.unwrap();
    let s2 = scorer.score(&query, &no_match).await.unwrap();
    assert_eq!(s1, 1.0);
    assert_eq!(s2, 0.0);
}

#[tokio::test]
async fn recency_scorer_newer_higher() {
    let scorer  = RecencyScorer;
    let query   = make_query("u1", "sw", "KE");
    let fresh   = make_candidate("p1", "a1", "sw", "KE");
    let mut old = make_candidate("p2", "a2", "sw", "KE");
    old.created_at = Utc::now() - Duration::days(5);

    let s_fresh = scorer.score(&query, &fresh).await.unwrap();
    let s_old   = scorer.score(&query, &old).await.unwrap();
    assert!(s_fresh > s_old, "fresh post should score higher than old");
}

// ─── Selector Tests ───────────────────────────────────────────────────────────

#[test]
fn top_k_selector_limits_results() {
    let selector = TopKSelector { k: 3 };
    let query    = make_query("u1", "sw", "KE");
    let mut candidates: Vec<Candidate> = (0..10)
        .map(|i| { let mut c = make_candidate(&format!("p{i}"), "a1", "sw", "KE"); c.score = i as f64; c })
        .collect();

    let result = selector.select(&query, candidates);
    assert_eq!(result.len(), 3);
    // Highest scores first
    assert!(result[0].score >= result[1].score);
}

#[test]
fn diversity_selector_respects_max_per_cluster() {
    let selector = DiversitySelector { max_per_cluster: 2, limit: 20, ..Default::default() };
    let query    = make_query("u1", "sw", "KE");
    // 10 identical text/sw posts → max 2 per cluster
    let candidates: Vec<Candidate> = (0..10)
        .map(|i| {
            let mut c = make_candidate(&format!("p{i}"), "author1", "sw", "KE");
            c.score = 1.0;
            c
        })
        .collect();

    let result = selector.select(&query, candidates);
    let text_sw: Vec<_> = result.iter()
        .filter(|c| c.language == "sw" && matches!(c.content_type, ContentType::Text))
        .collect();
    assert!(text_sw.len() <= 2, "max 2 per text_sw cluster, got {}", text_sw.len());
}
