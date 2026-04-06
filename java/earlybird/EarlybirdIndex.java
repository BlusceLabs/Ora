package com.blusce.jamii.earlybird;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Earlybird — real-time inverted index for post retrieval.
 *
 * Mirrors Twitter's Earlybird search system, which builds and maintains
 * inverted indexes for real-time search and retrieval of posts.
 * This is the backbone of the in-network candidate source (~50% of feed).
 *
 * Reference: twitter/the-algorithm → src/java/com/twitter/search/
 *
 * Features:
 *  - Inverted index on hashtags, language, content type
 *  - BM25-style relevance scoring
 *  - Recency-boosted ranking (newer posts rank higher)
 *  - Author reputation boosting (Tweepcred integration)
 *  - Engagement velocity signal
 */
public class EarlybirdIndex {

    public record PostDocument(
        String   postId,
        String   authorId,
        String   language,
        String   country,
        String   contentType,
        List<String> hashtags,
        long     createdAtMs,
        int      likes,
        int      comments,
        int      shares,
        int      saves,
        int      views
    ) {}

    // Inverted indexes
    private final ConcurrentHashMap<String, Set<String>> hashtagIndex   = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> languageIndex  = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> countryIndex   = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> authorIndex    = new ConcurrentHashMap<>();

    // Document store
    private final ConcurrentHashMap<String, PostDocument> documents = new ConcurrentHashMap<>();

    // Author reputation scores (from PageRank / Tweepcred)
    private final Map<String, Double> authorReputation;

    public EarlybirdIndex(Map<String, Double> authorReputation) {
        this.authorReputation = authorReputation != null ? authorReputation : Collections.emptyMap();
    }

    public EarlybirdIndex() {
        this(Collections.emptyMap());
    }

    // ─── Indexing ────────────────────────────────────────────────────────────

    public void index(PostDocument doc) {
        documents.put(doc.postId(), doc);

        // Hashtag index
        doc.hashtags().forEach(tag ->
            hashtagIndex.computeIfAbsent(tag.toLowerCase(), k -> ConcurrentHashMap.newKeySet())
                        .add(doc.postId())
        );

        // Language index
        languageIndex.computeIfAbsent(doc.language(), k -> ConcurrentHashMap.newKeySet())
                     .add(doc.postId());

        // Country index
        countryIndex.computeIfAbsent(doc.country(), k -> ConcurrentHashMap.newKeySet())
                    .add(doc.postId());

        // Author index
        authorIndex.computeIfAbsent(doc.authorId(), k -> ConcurrentHashMap.newKeySet())
                   .add(doc.postId());
    }

    public void remove(String postId) {
        PostDocument doc = documents.remove(postId);
        if (doc == null) return;

        doc.hashtags().forEach(tag -> {
            Set<String> s = hashtagIndex.get(tag.toLowerCase());
            if (s != null) s.remove(postId);
        });

        Optional.ofNullable(languageIndex.get(doc.language())).ifPresent(s -> s.remove(postId));
        Optional.ofNullable(countryIndex.get(doc.country())).ifPresent(s -> s.remove(postId));
        Optional.ofNullable(authorIndex.get(doc.authorId())).ifPresent(s -> s.remove(postId));
    }

    // ─── Search ──────────────────────────────────────────────────────────────

    public record SearchQuery(
        List<String> hashtags,
        String       language,
        String       country,
        Set<String>  authorIds,
        int          maxResults,
        Set<String>  excludePostIds
    ) {}

    public List<Map.Entry<PostDocument, Double>> search(SearchQuery query) {
        Set<String> candidates = new HashSet<>(documents.keySet());

        // Filter by language (mandatory)
        if (query.language() != null) {
            candidates.retainAll(languageIndex.getOrDefault(query.language(), Set.of()));
        }

        // Filter by author set (in-network)
        if (query.authorIds() != null && !query.authorIds().isEmpty()) {
            Set<String> authorPosts = query.authorIds().stream()
                .flatMap(a -> authorIndex.getOrDefault(a, Set.of()).stream())
                .collect(Collectors.toSet());
            candidates.retainAll(authorPosts);
        }

        // Exclude seen posts
        if (query.excludePostIds() != null) {
            candidates.removeAll(query.excludePostIds());
        }

        // Score and rank
        return candidates.stream()
            .map(documents::get)
            .filter(Objects::nonNull)
            .map(doc -> Map.entry(doc, bm25Score(doc, query)))
            .sorted(Map.Entry.<PostDocument, Double>comparingByValue().reversed())
            .limit(query.maxResults())
            .collect(Collectors.toList());
    }

    // ─── Scoring ─────────────────────────────────────────────────────────────

    /**
     * BM25-style score with:
     *  - Recency boost (newer = higher)
     *  - Engagement velocity (engagement / log(age + 2))
     *  - Author reputation multiplier
     *  - Hashtag match bonus
     */
    private double bm25Score(PostDocument doc, SearchQuery query) {
        double ageHours = (System.currentTimeMillis() - doc.createdAtMs()) / 3_600_000.0;
        double recency  = 1.0 / (1.0 + ageHours / 24.0);

        int views = Math.max(doc.views(), 1);
        double engagementVelocity = (
            doc.likes()    * 0.5  / views +
            doc.shares()   * 1.0  / views +
            doc.comments() * 13.5 / views +
            doc.saves()    * 2.0  / views
        ) / Math.log(ageHours + 2);

        double reputation = authorReputation.getOrDefault(doc.authorId(), 0.5);

        double hashtagBonus = 0.0;
        if (query.hashtags() != null) {
            long matches = query.hashtags().stream()
                .filter(t -> doc.hashtags().contains(t.toLowerCase()))
                .count();
            hashtagBonus = matches * 0.1;
        }

        return 0.4 * recency
             + 0.4 * Math.min(engagementVelocity, 1.0)
             + 0.1 * reputation
             + 0.1 * Math.min(hashtagBonus, 1.0);
    }

    // ─── Stats ────────────────────────────────────────────────────────────────

    public int getIndexSize() { return documents.size(); }
}
