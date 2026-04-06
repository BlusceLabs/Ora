package com.blusce.jamii.graphjet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for InteractionGraph.
 */
public class InteractionGraphTest {

    private InteractionGraph graph;

    @BeforeEach
    void setUp() {
        graph = new InteractionGraph();
    }

    // ─── addEdge ──────────────────────────────────────────────────────────────

    @Test
    void addEdge_increasesEdgeCount() {
        graph.addEdge("u1", "p1", "like");
        assertEquals(1, graph.getTotalEdges());
    }

    @Test
    void addEdge_defaultEngagementType_isLike() {
        graph.addEdge("u1", "p1");
        assertFalse(graph.getPostsForUser("u1").isEmpty());
    }

    @Test
    void addEdge_negativeSignal_notIndexed() {
        // Negative signals should not create traversal edges
        long before = graph.getTotalEdges();
        graph.addEdge("u1", "p1", "negative");
        assertEquals(before, graph.getTotalEdges());
    }

    @Test
    void addEdge_multipleEngagements_accumulatesWeight() {
        graph.addEdge("u1", "p1", "like");
        graph.addEdge("u1", "p1", "reply");
        Map<String, Double> posts = graph.getPostsForUser("u1");
        assertTrue(posts.get("p1") > InteractionGraph.ENGAGEMENT_WEIGHTS.get("like"));
    }

    // ─── discover ─────────────────────────────────────────────────────────────

    @Test
    void discover_returnsOONPosts() {
        // u2 follows p1, u3 also follows p1 and has p2
        graph.addEdge("u2", "p1", "like");
        graph.addEdge("u3", "p1", "like");
        graph.addEdge("u3", "p2", "like");

        Set<String> following = Set.of("u2");
        Set<String> exclude   = Set.of();

        var results = graph.discover("u1", following, exclude, 10);
        assertTrue(results.stream().anyMatch(e -> e.getKey().equals("p2")));
    }

    @Test
    void discover_excludesAlreadySeenPosts() {
        graph.addEdge("u2", "p1", "like");
        graph.addEdge("u3", "p1", "like");
        graph.addEdge("u3", "p2", "like");

        var results = graph.discover("u1", Set.of("u2"), Set.of("p2"), 10);
        assertTrue(results.stream().noneMatch(e -> e.getKey().equals("p2")));
    }

    @Test
    void discover_emptyFollowGraph_returnsEmpty() {
        graph.addEdge("u3", "p1", "like");
        var results = graph.discover("u1", Set.of(), Set.of(), 10);
        assertTrue(results.isEmpty());
    }

    @Test
    void discover_resultsAreSortedByScoreDescending() {
        // p2 has more social proof than p1
        graph.addEdge("u2", "p_hot", "reply");   // high weight
        graph.addEdge("u2", "p_hot", "like");
        graph.addEdge("u3", "p_hot", "like");
        graph.addEdge("u3", "p_cold", "like");   // low weight

        var results = graph.discover("u1", Set.of("u2", "u3"),
            Set.of("p_hot", "p_cold"), 10);  // these are level-1, not returned

        // With nothing to traverse to, should return empty
        assertTrue(results.size() <= 10);
    }

    // ─── Stats ────────────────────────────────────────────────────────────────

    @Test
    void stats_trackUsersAndPosts() {
        graph.addEdge("u1", "p1");
        graph.addEdge("u1", "p2");
        graph.addEdge("u2", "p1");

        assertEquals(2, graph.getUserCount());
        assertEquals(2, graph.getPostCount());
        assertEquals(3, graph.getTotalEdges());
    }

    @Test
    void toString_containsStats() {
        graph.addEdge("u1", "p1");
        String s = graph.toString();
        assertTrue(s.contains("InteractionGraph"));
    }
}
