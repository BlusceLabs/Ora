package com.blusce.jamii.topic_social_proof;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TopicSocialProof.
 */
public class TopicSocialProofTest {

    private TopicSocialProof tsp;

    @BeforeEach
    void setUp() {
        tsp = new TopicSocialProof();
    }

    // ─── tagPost ──────────────────────────────────────────────────────────────

    @Test
    void tagPost_detectsTopicFromHashtag() {
        Set<String> topics = tsp.tagPost("p1", List.of("#afrobeats", "#music"), "en");
        assertTrue(topics.contains("afrobeats") || topics.contains("music"));
    }

    @Test
    void tagPost_swahiliTagsCulture() {
        Set<String> topics = tsp.tagPost("p1", List.of(), "sw");
        assertTrue(topics.contains("culture"));
    }

    @Test
    void tagPost_yorubaTagsNollywood() {
        Set<String> topics = tsp.tagPost("p1", List.of(), "yo");
        assertTrue(topics.contains("nollywood"));
    }

    @Test
    void tagPost_techHashtag() {
        Set<String> topics = tsp.tagPost("p1", List.of("#tech", "#ai"), "en");
        assertTrue(topics.contains("tech"));
    }

    @Test
    void tagPost_cryptoHashtag() {
        Set<String> topics = tsp.tagPost("p1", List.of("#bitcoin", "#crypto"), "en");
        assertTrue(topics.contains("cryptocurrency"));
    }

    @Test
    void tagPost_unknownHashtags_returnsEmptyOrLanguageTopics() {
        Set<String> topics = tsp.tagPost("p1", List.of("#xyzabc123"), "en");
        // Should have no matched topics from the unknown hashtag
        assertFalse(topics.contains("xyzabc123"));
    }

    @Test
    void tagPost_incrementsIndexedPostCount() {
        int before = tsp.indexedPostCount();
        tsp.tagPost("p1", List.of("#tech"), "en");
        assertEquals(before + 1, tsp.indexedPostCount());
    }

    // ─── recordEngagement ────────────────────────────────────────────────────

    @Test
    void recordEngagement_affects_topicSocialProof() {
        tsp.tagPost("p1", List.of("#tech"), "en");
        tsp.recordEngagement("friend1", "p1");

        double score = tsp.topicSocialProofScore("p1", List.of("friend1"), List.of());
        assertTrue(score > 0.0);
    }

    // ─── topicSocialProofScore ───────────────────────────────────────────────

    @Test
    void topicSocialProofScore_isZeroForPostWithNoTopics() {
        // Post never tagged
        double score = tsp.topicSocialProofScore("unknown_post", List.of("u1"), List.of());
        assertEquals(0.0, score);
    }

    @Test
    void topicSocialProofScore_closeFriendsCountMore() {
        tsp.tagPost("p1", List.of("#football"), "en");
        tsp.recordEngagement("pal", "p1");

        double friendScore  = tsp.topicSocialProofScore("p1", List.of(), List.of("pal"));
        double followScore  = tsp.topicSocialProofScore("p1", List.of("pal"), List.of());
        assertTrue(friendScore >= followScore);
    }

    @Test
    void topicSocialProofScore_isCappedAtOne() {
        tsp.tagPost("p1", List.of("#tech"), "en");
        for (int i = 0; i < 100; i++) {
            tsp.recordEngagement("u" + i, "p1");
        }
        double score = tsp.topicSocialProofScore("p1",
            List.of("u0", "u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9"), List.of());
        assertTrue(score <= 1.0);
    }

    // ─── topNetworkTopics ────────────────────────────────────────────────────

    @Test
    void topNetworkTopics_returnsTopicsEngagedByFollows() {
        tsp.tagPost("p1", List.of("#tech"), "en");
        tsp.tagPost("p2", List.of("#football"), "en");
        tsp.recordEngagement("u1", "p1");
        tsp.recordEngagement("u1", "p1");
        tsp.recordEngagement("u1", "p2");

        var topics = tsp.topNetworkTopics(List.of("u1"), 5);
        assertFalse(topics.isEmpty());
        // "tech" should be top since u1 engaged twice
        assertEquals("tech", topics.get(0).getKey());
    }
}
