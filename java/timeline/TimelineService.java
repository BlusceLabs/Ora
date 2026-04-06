package com.blusce.jamii.timeline;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * TimelineService — stores and serves user timelines.
 *
 * Mirrors Twitter's Timeline Service:
 * maintains an ordered list of post IDs for each user's timeline,
 * with support for cursor-based pagination and injection.
 *
 * Reference: twitter/the-algorithm →
 *   home-mixer/src/main/scala/com/twitter/home_mixer/
 *
 * Two timeline types:
 *   1. Home Timeline  — built by the feed pipeline for each user
 *   2. User Timeline  — author's own posts, served to their profile page
 *
 * Pagination: cursor-based using timeline entry IDs.
 * Entries are sorted by insertion order (newest first).
 *
 * Storage:
 *   - In production backed by Manhattan (distributed sorted KV)
 *   - This implementation uses ConcurrentHashMap with sorted insertion
 *   - Timeline entries capped at MAX_ENTRIES per user
 */
public class TimelineService {

    public static final int MAX_ENTRIES        = 800;  // Twitter stores ~800 entries
    public static final int DEFAULT_PAGE_SIZE  = 50;

    // ─── Timeline Entry ────────────────────────────────────────────────────

    public static class TimelineEntry {
        public final String  postId;
        public final String  authorId;
        public final String  language;
        public final String  source;       // "following" | "community" | "trending" | "discovery"
        public final double  score;
        public final long    insertedAtMs;

        public TimelineEntry(String postId, String authorId, String language,
                             String source, double score) {
            this.postId       = postId;
            this.authorId     = authorId;
            this.language     = language;
            this.source       = source;
            this.score        = score;
            this.insertedAtMs = System.currentTimeMillis();
        }

        @Override public String toString() {
            return String.format("TimelineEntry{post=%s, author=%s, source=%s, score=%.3f}",
                postId, authorId, source, score);
        }
    }

    // ─── Cursor ────────────────────────────────────────────────────────────

    public record TimelinePage(
        List<TimelineEntry> entries,
        String              nextCursor,    // null if no more pages
        String              prevCursor,
        int                 total
    ) {}

    // ─── Indexes ──────────────────────────────────────────────────────────

    /** user_id → list of timeline entries (newest first) */
    private final ConcurrentHashMap<String, LinkedList<TimelineEntry>> homeTimelines =
        new ConcurrentHashMap<>();

    /** author_id → list of their own posts (newest first) */
    private final ConcurrentHashMap<String, LinkedList<TimelineEntry>> userTimelines =
        new ConcurrentHashMap<>();

    // ─── Write ─────────────────────────────────────────────────────────────

    /**
     * Write a home timeline for a user (from the feed pipeline).
     * Replaces the current stored timeline.
     */
    public void writeHomeTimeline(String userId, List<TimelineEntry> entries) {
        LinkedList<TimelineEntry> list = new LinkedList<>(entries);
        while (list.size() > MAX_ENTRIES) list.removeLast();
        homeTimelines.put(userId, list);
    }

    /**
     * Inject a single post into the front of a user's timeline.
     * Used for real-time delivery of new posts from followed accounts.
     */
    public void injectEntry(String userId, TimelineEntry entry) {
        homeTimelines.compute(userId, (k, existing) -> {
            LinkedList<TimelineEntry> list = existing != null ? existing : new LinkedList<>();
            // Deduplicate
            list.removeIf(e -> e.postId.equals(entry.postId));
            list.addFirst(entry);
            while (list.size() > MAX_ENTRIES) list.removeLast();
            return list;
        });
    }

    /**
     * Record a new post to the author's own user timeline.
     */
    public void recordPost(String authorId, TimelineEntry entry) {
        userTimelines.compute(authorId, (k, existing) -> {
            LinkedList<TimelineEntry> list = existing != null ? existing : new LinkedList<>();
            list.addFirst(entry);
            while (list.size() > MAX_ENTRIES) list.removeLast();
            return list;
        });
    }

    // ─── Read ──────────────────────────────────────────────────────────────

    /**
     * Fetch a page of the user's home timeline.
     *
     * @param userId     requesting user
     * @param cursor     pagination cursor (postId of last seen entry), null for first page
     * @param count      entries per page
     * @param maxAge_ms  exclude entries older than this (0 = no limit)
     */
    public TimelinePage getHomeTimeline(
        String userId,
        String cursor,
        int    count,
        long   maxAge_ms
    ) {
        LinkedList<TimelineEntry> timeline = homeTimelines.getOrDefault(userId, new LinkedList<>());
        return paginate(timeline, cursor, count, maxAge_ms);
    }

    /**
     * Fetch a page of a user's own posted content.
     */
    public TimelinePage getUserTimeline(
        String authorId,
        String cursor,
        int    count,
        long   maxAge_ms
    ) {
        LinkedList<TimelineEntry> timeline = userTimelines.getOrDefault(authorId, new LinkedList<>());
        return paginate(timeline, cursor, count, maxAge_ms);
    }

    // ─── Pagination ────────────────────────────────────────────────────────

    private TimelinePage paginate(
        LinkedList<TimelineEntry> timeline,
        String cursor,
        int    count,
        long   maxAge_ms
    ) {
        long cutoffMs = maxAge_ms > 0 ? System.currentTimeMillis() - maxAge_ms : 0L;

        List<TimelineEntry> filtered = timeline.stream()
            .filter(e -> cutoffMs == 0 || e.insertedAtMs >= cutoffMs)
            .collect(Collectors.toList());

        // Apply cursor: skip everything up to and including the cursor entry
        int startIdx = 0;
        if (cursor != null) {
            for (int i = 0; i < filtered.size(); i++) {
                if (filtered.get(i).postId.equals(cursor)) {
                    startIdx = i + 1;
                    break;
                }
            }
        }

        List<TimelineEntry> page = filtered.subList(
            Math.min(startIdx, filtered.size()),
            Math.min(startIdx + count, filtered.size())
        );

        String nextCursor = (startIdx + count < filtered.size())
            ? page.isEmpty() ? null : page.get(page.size() - 1).postId
            : null;

        String prevCursor = (startIdx > 0 && !filtered.isEmpty())
            ? filtered.get(Math.max(0, startIdx - 1)).postId
            : null;

        return new TimelinePage(new ArrayList<>(page), nextCursor, prevCursor, filtered.size());
    }

    // ─── Metrics ──────────────────────────────────────────────────────────

    public int getUserCount()     { return homeTimelines.size(); }
    public int getAuthorCount()   { return userTimelines.size(); }

    public int getTimelineSize(String userId) {
        return homeTimelines.getOrDefault(userId, new LinkedList<>()).size();
    }

    public Map<String, Integer> timelineSizeDistribution() {
        Map<String, Integer> dist = new TreeMap<>();
        dist.put("0",    0);
        dist.put("1-50", 0);
        dist.put("51-200", 0);
        dist.put("201-500", 0);
        dist.put("501+", 0);
        homeTimelines.values().forEach(tl -> {
            int n = tl.size();
            if      (n == 0)   dist.merge("0",       1, Integer::sum);
            else if (n <= 50)  dist.merge("1-50",    1, Integer::sum);
            else if (n <= 200) dist.merge("51-200",  1, Integer::sum);
            else if (n <= 500) dist.merge("201-500", 1, Integer::sum);
            else               dist.merge("501+",    1, Integer::sum);
        });
        return dist;
    }

    @Override
    public String toString() {
        return String.format("TimelineService{home_users=%d, author_users=%d}",
            getUserCount(), getAuthorCount());
    }
}
