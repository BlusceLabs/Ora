package com.blusce.jamii.topic_social_proof;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * TopicSocialProof — identifies topics related to individual posts
 * and tracks social proof at the topic level.
 *
 * Mirrors Twitter's topic-social-proof service:
 * Given a post, find which topics it belongs to and determine
 * whether people in the viewer's network engage with those topics.
 *
 * Reference: twitter/the-algorithm → topic-social-proof/README.md
 *
 * Two functions:
 *  1. Topic Tagging  — assign canonical topic labels to posts
 *  2. Topic Social Proof — score how much the viewer's network
 *                          engages with a post's topics
 *
 * Topics are 23 Africa-first categories:
 *  politics, sports, music, tech, business, fashion, food, travel,
 *  health, entertainment, education, religion, culture, economy,
 *  agriculture, nollywood, afrobeats, football, comedy, art,
 *  gaming, cryptocurrency, startups
 *
 * Social proof formula:
 *  topic_sp(topic, viewer) = Σ_u∈network engagement(u, topic) × relationship_strength(viewer, u)
 *  normalized to [0, 1]
 */
public class TopicSocialProof {

    // ─── African Topic Taxonomy ───────────────────────────────────────────────

    public static final List<String> AFRICAN_TOPICS = List.of(
        "politics", "sports", "music", "tech", "business", "fashion",
        "food", "travel", "health", "entertainment", "education", "religion",
        "culture", "economy", "agriculture", "nollywood", "afrobeats",
        "football", "comedy", "art", "gaming", "cryptocurrency", "startups"
    );

    private static final Map<String, List<String>> TOPIC_KEYWORDS = new HashMap<>();
    static {
        TOPIC_KEYWORDS.put("tech",           List.of("tech", "code", "software", "ai", "data", "startup"));
        TOPIC_KEYWORDS.put("sports",         List.of("sports", "football", "basketball", "match", "goal"));
        TOPIC_KEYWORDS.put("music",          List.of("music", "afrobeats", "amapiano", "hiphop", "bongo"));
        TOPIC_KEYWORDS.put("politics",       List.of("politics", "election", "government", "president", "senate"));
        TOPIC_KEYWORDS.put("nollywood",      List.of("nollywood", "movie", "film", "actor", "cinema"));
        TOPIC_KEYWORDS.put("football",       List.of("football", "soccer", "premier", "champions", "goal"));
        TOPIC_KEYWORDS.put("afrobeats",      List.of("afrobeats", "afro", "wizkid", "davido", "burna"));
        TOPIC_KEYWORDS.put("cryptocurrency", List.of("crypto", "bitcoin", "ethereum", "web3", "nft", "defi"));
        TOPIC_KEYWORDS.put("startups",       List.of("startup", "founder", "vc", "pitch", "funding", "saas"));
        TOPIC_KEYWORDS.put("health",         List.of("health", "medical", "hospital", "wellness", "mental"));
        TOPIC_KEYWORDS.put("education",      List.of("education", "school", "university", "scholarship", "learning"));
        TOPIC_KEYWORDS.put("food",           List.of("food", "jollof", "suya", "ugali", "recipe", "cook"));
        TOPIC_KEYWORDS.put("comedy",         List.of("funny", "comedy", "joke", "lol", "meme", "humor"));
    }

    // ─── Indexes ─────────────────────────────────────────────────────────────

    /** post_id → Set<topic> */
    private final ConcurrentHashMap<String, Set<String>> postTopics = new ConcurrentHashMap<>();

    /** topic → Map<user_id, engagement_count> */
    private final ConcurrentHashMap<String, Map<String, Integer>> topicEngagements = new ConcurrentHashMap<>();

    // ─── Topic Tagging ───────────────────────────────────────────────────────

    /**
     * Assign topic tags to a post based on its hashtags and content.
     */
    public Set<String> tagPost(String postId, List<String> hashtags, String language) {
        Set<String> topics = new HashSet<>();

        for (String hashtag : hashtags) {
            String clean = hashtag.toLowerCase().replace("#", "");
            TOPIC_KEYWORDS.forEach((topic, keywords) -> {
                if (keywords.stream().anyMatch(kw -> clean.contains(kw) || kw.contains(clean))) {
                    topics.add(topic);
                }
            });
            if (AFRICAN_TOPICS.contains(clean)) {
                topics.add(clean);
            }
        }

        // Language-based topic signals
        if (List.of("sw", "am").contains(language)) topics.add("culture");
        if (List.of("yo", "ig").contains(language)) topics.add("nollywood");
        if (List.of("ha").contains(language))       topics.add("culture");

        postTopics.put(postId, topics);
        return topics;
    }

    /**
     * Record that a user engaged with a post's topics.
     */
    public void recordEngagement(String userId, String postId) {
        Set<String> topics = postTopics.getOrDefault(postId, Set.of());
        for (String topic : topics) {
            topicEngagements
                .computeIfAbsent(topic, k -> new ConcurrentHashMap<>())
                .merge(userId, 1, Integer::sum);
        }
    }

    // ─── Social Proof Scoring ────────────────────────────────────────────────

    /**
     * Compute topic social proof score for a post.
     * How much do people in the viewer's network engage with this post's topics?
     *
     * @param postId         target post
     * @param viewerFollowing list of users the viewer follows
     * @param closeFriends   list of close friends (double weight)
     * @return score in [0, 1]
     */
    public double topicSocialProofScore(
        String postId,
        List<String> viewerFollowing,
        List<String> closeFriends
    ) {
        Set<String> topics = postTopics.getOrDefault(postId, Set.of());
        if (topics.isEmpty()) return 0.0;

        Set<String> followSet      = new HashSet<>(viewerFollowing);
        Set<String> closeFriendSet = new HashSet<>(closeFriends);

        double totalScore = 0.0;

        for (String topic : topics) {
            Map<String, Integer> engagers = topicEngagements.getOrDefault(topic, Map.of());

            double topicScore = 0.0;
            for (Map.Entry<String, Integer> e : engagers.entrySet()) {
                String uid   = e.getKey();
                int    count = e.getValue();
                double weight = closeFriendSet.contains(uid) ? 2.0
                              : followSet.contains(uid)      ? 1.0
                              : 0.0;
                topicScore += weight * Math.log1p(count);
            }
            totalScore += topicScore;
        }

        // Normalize: 5.0 is "saturated" topic social proof
        return Math.min(totalScore / 5.0, 1.0);
    }

    /**
     * Get topics the viewer's network engages with most (for candidate sourcing).
     */
    public List<Map.Entry<String, Double>> topNetworkTopics(
        List<String> viewerFollowing,
        int topK
    ) {
        Set<String> followSet = new HashSet<>(viewerFollowing);
        Map<String, Double> topicScores = new HashMap<>();

        topicEngagements.forEach((topic, engagers) -> {
            double score = engagers.entrySet().stream()
                .filter(e -> followSet.contains(e.getKey()))
                .mapToDouble(e -> Math.log1p(e.getValue()))
                .sum();
            if (score > 0) topicScores.put(topic, score);
        });

        return topicScores.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(topK)
            .collect(Collectors.toList());
    }

    /**
     * Get posts tagged with a specific topic (for sourcing).
     */
    public Set<String> postsByTopic(String topic) {
        return postTopics.entrySet().stream()
            .filter(e -> e.getValue().contains(topic))
            .map(Map.Entry::getKey)
            .collect(Collectors.toSet());
    }

    public int indexedPostCount() { return postTopics.size(); }
}
