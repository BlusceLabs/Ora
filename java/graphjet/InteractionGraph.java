package com.blusce.jamii.graphjet;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * InteractionGraph — in-memory User-to-Post interaction graph.
 *
 * Directly mirrors Twitter's GraphJet (UTEG — User-Tweet Entity Graph):
 * maintains a real-time, in-memory bipartite graph between users and posts,
 * enabling fast out-of-network discovery via graph traversal.
 *
 * Reference: twitter/the-algorithm → src/scala/com/twitter/recos/
 *            https://github.com/twitter/GraphJet
 *
 * Graph structure:
 *   Left nodes:  Users
 *   Right nodes: Posts
 *   Edges:       User → Post (weighted by engagement type)
 *
 * Discovery algorithm (2-hop traversal):
 *   1. Start from viewer's followed accounts
 *   2. Find posts they engaged with (Level 1)
 *   3. Find other users who engaged with those posts (Level 2)
 *   4. Collect posts from those users (Level 3)
 *   → Returns ranked list of discovered post IDs
 */
public class InteractionGraph {

    // Engagement weights matching Twitter's open-source formula
    public static final Map<String, Double> ENGAGEMENT_WEIGHTS = Map.of(
        "like",              0.5,
        "retweet",           1.0,
        "reply",            13.5,
        "bookmark",          2.0,
        "profile_click",    12.0,
        "negative",        -74.0,
        "report",         -369.0
    );

    // Adjacency: user_id → { post_id → engagement_weight }
    private final ConcurrentHashMap<String, Map<String, Double>> userToPost
        = new ConcurrentHashMap<>();

    // Reverse adjacency: post_id → { user_id → engagement_weight }
    private final ConcurrentHashMap<String, Map<String, Double>> postToUser
        = new ConcurrentHashMap<>();

    // Total edge count (for monitoring)
    private volatile long edgeCount = 0;

    // ─── Mutation ─────────────────────────────────────────────────────────────

    /**
     * Add a weighted engagement edge.
     * engagementType: "like" | "retweet" | "reply" | "bookmark" | "report" etc.
     */
    public void addEdge(String userId, String postId, String engagementType) {
        double weight = ENGAGEMENT_WEIGHTS.getOrDefault(engagementType, 0.1);
        if (weight <= 0) return;  // Don't index negative signals as edges

        userToPost
            .computeIfAbsent(userId, k -> new ConcurrentHashMap<>())
            .merge(postId, weight, Double::sum);

        postToUser
            .computeIfAbsent(postId, k -> new ConcurrentHashMap<>())
            .merge(userId, weight, Double::sum);

        edgeCount++;
    }

    public void addEdge(String userId, String postId) {
        addEdge(userId, postId, "like");
    }

    // ─── Query ────────────────────────────────────────────────────────────────

    public Map<String, Double> getPostsForUser(String userId) {
        return userToPost.getOrDefault(userId, Collections.emptyMap());
    }

    public Map<String, Double> getUsersForPost(String postId) {
        return postToUser.getOrDefault(postId, Collections.emptyMap());
    }

    /**
     * Discover out-of-network posts via 2-hop traversal.
     *
     * @param viewerId         the user requesting the feed
     * @param viewerFollowing  accounts the viewer follows
     * @param excludePostIds   posts already seen or in feed
     * @param maxResults       max discovered posts to return
     * @return ranked list of (postId, score) pairs
     */
    public List<Map.Entry<String, Double>> discover(
        String viewerId,
        Set<String> viewerFollowing,
        Set<String> excludePostIds,
        int maxResults
    ) {
        // Level 1: posts liked by viewer's follows
        Map<String, Double> level1Posts = new HashMap<>();
        for (String followedId : viewerFollowing) {
            Map<String, Double> theirPosts = userToPost.getOrDefault(followedId, Collections.emptyMap());
            for (Map.Entry<String, Double> e : theirPosts.entrySet()) {
                if (!excludePostIds.contains(e.getKey())) {
                    level1Posts.merge(e.getKey(), e.getValue(), Double::sum);
                }
            }
        }

        // Level 2: similar users (who also liked Level 1 posts)
        Map<String, Double> similarUsers = new HashMap<>();
        for (Map.Entry<String, Double> postEntry : level1Posts.entrySet()) {
            Map<String, Double> engagers = postToUser.getOrDefault(postEntry.getKey(), Collections.emptyMap());
            for (Map.Entry<String, Double> engager : engagers.entrySet()) {
                String uid = engager.getKey();
                if (!viewerFollowing.contains(uid) && !uid.equals(viewerId)) {
                    similarUsers.merge(uid, engager.getValue() * postEntry.getValue(), Double::sum);
                }
            }
        }

        // Level 3: posts from similar users (not already seen)
        Map<String, Double> discovered = new HashMap<>();
        for (Map.Entry<String, Double> userEntry : similarUsers.entrySet()) {
            Map<String, Double> theirPosts = userToPost.getOrDefault(userEntry.getKey(), Collections.emptyMap());
            for (Map.Entry<String, Double> postEntry : theirPosts.entrySet()) {
                String postId = postEntry.getKey();
                if (!excludePostIds.contains(postId) && !level1Posts.containsKey(postId)) {
                    double score = postEntry.getValue() * userEntry.getValue();
                    discovered.merge(postId, score, Double::sum);
                }
            }
        }

        // Sort by score descending
        return discovered.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(maxResults)
            .collect(Collectors.toList());
    }

    // ─── Stats ────────────────────────────────────────────────────────────────

    public long getTotalEdges() { return edgeCount; }
    public int getUserCount()   { return userToPost.size(); }
    public int getPostCount()   { return postToUser.size(); }

    @Override
    public String toString() {
        return String.format("InteractionGraph{users=%d, posts=%d, edges=%d}",
            getUserCount(), getPostCount(), getTotalEdges());
    }
}
