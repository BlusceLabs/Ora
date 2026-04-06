package com.blusce.jamii.user_index;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * UserIndexService — inverted index for user demographics and interests.
 *
 * Mirrors Twitter's user-targeting index used for:
 *   - Trending topic delivery (country-specific trends)
 *   - WTF (Who-To-Follow) demographic matching
 *   - Language-matched content delivery
 *   - Community membership lookup
 *
 * Index dimensions:
 *   1. country   → Set<user_id>
 *   2. language  → Set<user_id>
 *   3. community → Set<user_id>
 *   4. country × language → Set<user_id>  (composite for efficient filtering)
 *
 * Operations:
 *   - O(1) insert and remove
 *   - O(|result|) lookup per dimension
 *   - Set intersection across dimensions for compound filters
 *
 * Reference: twitter/the-algorithm →
 *   src/java/com/twitter/search/ingester/pipeline/twitter/
 */
public class UserIndexService {

    // ─── Indexes ──────────────────────────────────────────────────────────────

    /** country → user IDs */
    private final ConcurrentHashMap<String, Set<String>> countryIndex    = new ConcurrentHashMap<>();
    /** language → user IDs */
    private final ConcurrentHashMap<String, Set<String>> languageIndex   = new ConcurrentHashMap<>();
    /** community_id → user IDs */
    private final ConcurrentHashMap<String, Set<String>> communityIndex  = new ConcurrentHashMap<>();
    /** "country:language" → user IDs (composite) */
    private final ConcurrentHashMap<String, Set<String>> compositeIndex  = new ConcurrentHashMap<>();
    /** user_id → UserRecord (forward index for profile lookups) */
    private final ConcurrentHashMap<String, UserRecord>  userRecords     = new ConcurrentHashMap<>();

    // ─── User Record ──────────────────────────────────────────────────────────

    public record UserRecord(
        String       userId,
        String       country,
        String       language,
        List<String> communityIds,
        long         followersCount,
        boolean      isActive,
        long         indexedAtMs
    ) {}

    // ─── Indexing ─────────────────────────────────────────────────────────────

    private Set<String> getOrCreate(ConcurrentHashMap<String, Set<String>> index, String key) {
        return index.computeIfAbsent(key, k -> ConcurrentHashMap.newKeySet());
    }

    /**
     * Index a user. Safe to call multiple times (idempotent).
     */
    public void index(UserRecord user) {
        // Remove old index entries if user exists (handles updates)
        UserRecord old = userRecords.get(user.userId());
        if (old != null) remove(old.userId());

        userRecords.put(user.userId(), user);

        getOrCreate(countryIndex,  user.country()).add(user.userId());
        getOrCreate(languageIndex, user.language()).add(user.userId());

        String compositeKey = user.country() + ":" + user.language();
        getOrCreate(compositeIndex, compositeKey).add(user.userId());

        for (String cid : user.communityIds()) {
            getOrCreate(communityIndex, cid).add(user.userId());
        }
    }

    /**
     * Remove a user from all indexes.
     */
    public boolean remove(String userId) {
        UserRecord user = userRecords.remove(userId);
        if (user == null) return false;

        Set<String> c = countryIndex.get(user.country());
        if (c != null) c.remove(userId);

        Set<String> l = languageIndex.get(user.language());
        if (l != null) l.remove(userId);

        String ck = user.country() + ":" + user.language();
        Set<String> comp = compositeIndex.get(ck);
        if (comp != null) comp.remove(userId);

        for (String cid : user.communityIds()) {
            Set<String> comm = communityIndex.get(cid);
            if (comm != null) comm.remove(userId);
        }
        return true;
    }

    // ─── Lookups ──────────────────────────────────────────────────────────────

    /**
     * All users in a given country.
     */
    public Set<String> byCountry(String country) {
        return Collections.unmodifiableSet(
            countryIndex.getOrDefault(country, Collections.emptySet())
        );
    }

    /**
     * All users speaking a given language.
     */
    public Set<String> byLanguage(String language) {
        return Collections.unmodifiableSet(
            languageIndex.getOrDefault(language, Collections.emptySet())
        );
    }

    /**
     * All users in a given community.
     */
    public Set<String> byCommunity(String communityId) {
        return Collections.unmodifiableSet(
            communityIndex.getOrDefault(communityId, Collections.emptySet())
        );
    }

    /**
     * Compound filter: country AND language.
     * Uses the composite index for O(1) key lookup.
     */
    public Set<String> byCountryAndLanguage(String country, String language) {
        String key = country + ":" + language;
        return Collections.unmodifiableSet(
            compositeIndex.getOrDefault(key, Collections.emptySet())
        );
    }

    /**
     * Compound filter: country AND community.
     * Computes intersection of two index sets.
     */
    public Set<String> byCountryAndCommunity(String country, String communityId) {
        Set<String> inCountry   = countryIndex.getOrDefault(country, Collections.emptySet());
        Set<String> inCommunity = communityIndex.getOrDefault(communityId, Collections.emptySet());
        return setIntersection(inCountry, inCommunity);
    }

    /**
     * Multi-community union: users in ANY of the given communities.
     */
    public Set<String> byAnyCommunity(List<String> communityIds) {
        Set<String> result = new HashSet<>();
        for (String cid : communityIds) {
            Set<String> members = communityIndex.getOrDefault(cid, Collections.emptySet());
            result.addAll(members);
        }
        return Collections.unmodifiableSet(result);
    }

    /**
     * Get full user record.
     */
    public Optional<UserRecord> getUser(String userId) {
        return Optional.ofNullable(userRecords.get(userId));
    }

    // ─── Scoring Helpers ──────────────────────────────────────────────────────

    /**
     * Count shared communities between two users.
     * Used for WTF social proof scoring.
     */
    public int sharedCommunityCount(String userA, String userB) {
        UserRecord a = userRecords.get(userA);
        UserRecord b = userRecords.get(userB);
        if (a == null || b == null) return 0;
        Set<String> commA = new HashSet<>(a.communityIds());
        commA.retainAll(new HashSet<>(b.communityIds()));
        return commA.size();
    }

    /**
     * Find users with the most shared communities with a given user.
     * Returns user_id → shared_community_count, descending.
     */
    public List<Map.Entry<String, Integer>> communityNeighbors(String userId, int topK) {
        UserRecord user = userRecords.get(userId);
        if (user == null) return Collections.emptyList();

        Map<String, Integer> counts = new HashMap<>();
        for (String cid : user.communityIds()) {
            Set<String> members = communityIndex.getOrDefault(cid, Collections.emptySet());
            for (String member : members) {
                if (!member.equals(userId)) {
                    counts.merge(member, 1, Integer::sum);
                }
            }
        }

        return counts.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .limit(topK)
            .collect(Collectors.toList());
    }

    // ─── Stats ────────────────────────────────────────────────────────────────

    public int totalUsers()      { return userRecords.size(); }
    public int countryCount()    { return countryIndex.size(); }
    public int languageCount()   { return languageIndex.size(); }
    public int communityCount()  { return communityIndex.size(); }

    public Map<String, Integer> countryDistribution() {
        Map<String, Integer> dist = new TreeMap<>();
        countryIndex.forEach((country, users) -> dist.put(country, users.size()));
        return dist;
    }

    public Map<String, Integer> languageDistribution() {
        Map<String, Integer> dist = new TreeMap<>();
        languageIndex.forEach((lang, users) -> dist.put(lang, users.size()));
        return dist;
    }

    public Map<String, Integer> communityDistribution() {
        Map<String, Integer> dist = new TreeMap<>();
        communityIndex.forEach((cid, users) -> dist.put(cid, users.size()));
        return dist;
    }

    @Override
    public String toString() {
        return String.format(
            "UserIndexService{users=%d, countries=%d, languages=%d, communities=%d}",
            totalUsers(), countryCount(), languageCount(), communityCount()
        );
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Set<String> setIntersection(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) return Collections.emptySet();
        Set<String> small = a.size() < b.size() ? a : b;
        Set<String> large = a.size() < b.size() ? b : a;
        return small.stream()
            .filter(large::contains)
            .collect(Collectors.toSet());
    }
}
