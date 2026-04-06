/*!
 * serving_cache — LRU + TTL feed result cache.
 *
 * Mirrors Twitter's Manhattan/Redis caching layer for home-timeline results.
 *
 * Architecture:
 *   - LRU eviction: keeps the N most-recently-used feed results
 *   - TTL expiry: entries expire after a configurable duration (default 30s)
 *   - Shard by user_id hash for concurrent access without a global write lock
 *   - Metrics: hit_rate, evictions, expired_entries
 *
 * HTTP API (Axum, port 7004):
 *   GET  /cache/{user_id}            — fetch cached feed (404 if missing/expired)
 *   PUT  /cache/{user_id}            — store feed result (JSON body)
 *   DELETE /cache/{user_id}          — invalidate a user's feed
 *   GET  /cache/metrics              — cache statistics
 *   POST /cache/flush                — clear all entries (admin)
 */

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, VecDeque},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
pub struct CachedFeed {
    pub user_id:   String,
    pub post_ids:  Vec<String>,
    pub feed_size: usize,
    pub built_at_ms: u64,
}

#[derive(Clone)]
struct CacheEntry {
    feed:       CachedFeed,
    inserted:   Instant,
    last_used:  Instant,
}

// ─── Shard ────────────────────────────────────────────────────────────────────

const N_SHARDS:      usize = 16;
const DEFAULT_CAP:   usize = 1_000;  // per shard → 16k total
const DEFAULT_TTL_S: u64   = 30;

struct CacheShard {
    entries:    HashMap<String, CacheEntry>,
    lru_order:  VecDeque<String>,          // front = most recently used
    capacity:   usize,
    ttl:        Duration,
    hits:       u64,
    misses:     u64,
    evictions:  u64,
    expirations: u64,
}

impl CacheShard {
    fn new(capacity: usize, ttl: Duration) -> Self {
        Self {
            entries:    HashMap::with_capacity(capacity),
            lru_order:  VecDeque::with_capacity(capacity),
            capacity,
            ttl,
            hits:       0,
            misses:     0,
            evictions:  0,
            expirations: 0,
        }
    }

    fn get(&mut self, key: &str) -> Option<CachedFeed> {
        // Check expiry first
        if let Some(entry) = self.entries.get(key) {
            if entry.inserted.elapsed() > self.ttl {
                self.entries.remove(key);
                self.lru_order.retain(|k| k != key);
                self.expirations += 1;
                self.misses      += 1;
                return None;
            }
        }

        if let Some(entry) = self.entries.get_mut(key) {
            entry.last_used = Instant::now();
            // Promote to front of LRU
            self.lru_order.retain(|k| k != key);
            self.lru_order.push_front(key.to_string());
            self.hits += 1;
            Some(entry.feed.clone())
        } else {
            self.misses += 1;
            None
        }
    }

    fn put(&mut self, key: String, feed: CachedFeed) {
        // Evict LRU entries until under capacity
        while self.entries.len() >= self.capacity {
            if let Some(oldest) = self.lru_order.pop_back() {
                self.entries.remove(&oldest);
                self.evictions += 1;
            } else {
                break;
            }
        }

        let now = Instant::now();
        let entry = CacheEntry { feed, inserted: now, last_used: now };

        self.entries.insert(key.clone(), entry);
        self.lru_order.retain(|k| k != &key);
        self.lru_order.push_front(key);
    }

    fn invalidate(&mut self, key: &str) -> bool {
        let removed = self.entries.remove(key).is_some();
        self.lru_order.retain(|k| k != key);
        removed
    }

    fn flush(&mut self) {
        self.entries.clear();
        self.lru_order.clear();
    }

    fn size(&self)    -> usize { self.entries.len() }
    fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 { 0.0 } else { self.hits as f64 / total as f64 }
    }
}

// ─── Sharded Cache ────────────────────────────────────────────────────────────

pub struct ServingCache {
    shards: Vec<Mutex<CacheShard>>,
}

impl ServingCache {
    pub fn new(capacity_per_shard: usize, ttl_secs: u64) -> Self {
        let ttl = Duration::from_secs(ttl_secs);
        let shards = (0..N_SHARDS)
            .map(|_| Mutex::new(CacheShard::new(capacity_per_shard, ttl)))
            .collect();
        Self { shards }
    }

    fn shard_idx(key: &str) -> usize {
        let mut h: u64 = 0xcbf29ce484222325; // FNV-1a
        for b in key.bytes() {
            h ^= b as u64;
            h = h.wrapping_mul(0x100000001b3);
        }
        (h % N_SHARDS as u64) as usize
    }

    pub fn get(&self, user_id: &str) -> Option<CachedFeed> {
        let idx = Self::shard_idx(user_id);
        self.shards[idx].lock().unwrap().get(user_id)
    }

    pub fn put(&self, user_id: String, feed: CachedFeed) {
        let idx = Self::shard_idx(&user_id);
        self.shards[idx].lock().unwrap().put(user_id, feed);
    }

    pub fn invalidate(&self, user_id: &str) -> bool {
        let idx = Self::shard_idx(user_id);
        self.shards[idx].lock().unwrap().invalidate(user_id)
    }

    pub fn flush_all(&self) {
        for shard in &self.shards {
            shard.lock().unwrap().flush();
        }
    }

    pub fn metrics(&self) -> CacheMetrics {
        let mut total_size       = 0usize;
        let mut total_hits       = 0u64;
        let mut total_misses     = 0u64;
        let mut total_evictions  = 0u64;
        let mut total_expirations = 0u64;

        for shard in &self.shards {
            let s = shard.lock().unwrap();
            total_size        += s.size();
            total_hits        += s.hits;
            total_misses      += s.misses;
            total_evictions   += s.evictions;
            total_expirations += s.expirations;
        }

        let total_requests = total_hits + total_misses;
        CacheMetrics {
            size:            total_size,
            capacity:        N_SHARDS * DEFAULT_CAP,
            hit_rate:        if total_requests == 0 { 0.0 } else { total_hits as f64 / total_requests as f64 },
            hits:            total_hits,
            misses:          total_misses,
            evictions:       total_evictions,
            expirations:     total_expirations,
            n_shards:        N_SHARDS,
        }
    }
}

// ─── HTTP Handlers ────────────────────────────────────────────────────────────

type AppState = Arc<ServingCache>;

#[derive(Serialize)]
struct CacheMetrics {
    size:        usize,
    capacity:    usize,
    hit_rate:    f64,
    hits:        u64,
    misses:      u64,
    evictions:   u64,
    expirations: u64,
    n_shards:    usize,
}

#[derive(Serialize)]
struct ApiError { error: String }

async fn get_feed(
    Path(user_id): Path<String>,
    State(cache):  State<AppState>,
) -> Result<Json<CachedFeed>, (StatusCode, Json<ApiError>)> {
    match cache.get(&user_id) {
        Some(feed) => Ok(Json(feed)),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError { error: format!("No cached feed for user {user_id}") }),
        )),
    }
}

async fn put_feed(
    Path(user_id): Path<String>,
    State(cache):  State<AppState>,
    Json(feed):    Json<CachedFeed>,
) -> Json<serde_json::Value> {
    cache.put(user_id, feed);
    Json(serde_json::json!({ "stored": true }))
}

async fn invalidate_feed(
    Path(user_id): Path<String>,
    State(cache):  State<AppState>,
) -> Json<serde_json::Value> {
    let removed = cache.invalidate(&user_id);
    Json(serde_json::json!({ "invalidated": removed, "user_id": user_id }))
}

async fn get_metrics(State(cache): State<AppState>) -> Json<CacheMetrics> {
    Json(cache.metrics())
}

async fn flush_cache(State(cache): State<AppState>) -> Json<serde_json::Value> {
    cache.flush_all();
    Json(serde_json::json!({ "flushed": true }))
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok", "service": "serving_cache" }))
}

// ─── Main ────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let cache = Arc::new(ServingCache::new(DEFAULT_CAP, DEFAULT_TTL_S));

    let app = Router::new()
        .route("/cache/:user_id",  get(get_feed).put(put_feed).delete(invalidate_feed))
        .route("/cache/metrics",   get(get_metrics))
        .route("/cache/flush",     post(flush_cache))
        .route("/health",          get(health))
        .with_state(cache);

    let addr = "0.0.0.0:7004";
    println!("ServingCache running on http://{addr}");
    axum::Server::bind(&addr.parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_feed(user_id: &str) -> CachedFeed {
        CachedFeed {
            user_id:     user_id.to_string(),
            post_ids:    vec!["p1".to_string(), "p2".to_string()],
            feed_size:   2,
            built_at_ms: 0,
        }
    }

    #[test]
    fn test_put_and_get() {
        let cache = ServingCache::new(100, 60);
        cache.put("user_1".to_string(), make_feed("user_1"));
        let result = cache.get("user_1");
        assert!(result.is_some());
        assert_eq!(result.unwrap().user_id, "user_1");
    }

    #[test]
    fn test_miss_on_empty() {
        let cache = ServingCache::new(100, 60);
        assert!(cache.get("user_xyz").is_none());
    }

    #[test]
    fn test_invalidate() {
        let cache = ServingCache::new(100, 60);
        cache.put("user_1".to_string(), make_feed("user_1"));
        assert!(cache.invalidate("user_1"));
        assert!(cache.get("user_1").is_none());
        assert!(!cache.invalidate("user_1")); // already removed
    }

    #[test]
    fn test_lru_eviction() {
        let cache = ServingCache::new(2, 60); // 2 per shard but 16 shards
        // Fill one shard with 3 items to force eviction within that shard
        // Use keys that hash to the same shard
        let cache_single = CacheShard::new(2, Duration::from_secs(60));
        let mut shard = cache_single;
        shard.put("a".to_string(), make_feed("a"));
        shard.put("b".to_string(), make_feed("b"));
        shard.put("c".to_string(), make_feed("c")); // should evict "a"
        assert!(shard.get("a").is_none(), "LRU eviction: a should be gone");
        assert!(shard.get("b").is_some());
        assert!(shard.get("c").is_some());
        assert_eq!(shard.evictions, 1);
    }

    #[test]
    fn test_ttl_expiry() {
        let mut shard = CacheShard::new(100, Duration::from_millis(1));
        shard.put("u".to_string(), make_feed("u"));
        std::thread::sleep(Duration::from_millis(5));
        assert!(shard.get("u").is_none(), "TTL expired entry should be None");
        assert_eq!(shard.expirations, 1);
    }

    #[test]
    fn test_metrics_hit_rate() {
        let cache = ServingCache::new(100, 60);
        cache.put("user_1".to_string(), make_feed("user_1"));
        cache.get("user_1"); // hit
        cache.get("user_2"); // miss
        let m = cache.metrics();
        assert_eq!(m.hits,   1);
        assert_eq!(m.misses, 1);
        assert!((m.hit_rate - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_flush() {
        let cache = ServingCache::new(100, 60);
        for i in 0..10 {
            cache.put(format!("user_{i}"), make_feed(&format!("user_{i}")));
        }
        cache.flush_all();
        assert_eq!(cache.metrics().size, 0);
    }

    #[test]
    fn test_concurrent_access() {
        let cache = Arc::new(ServingCache::new(1000, 60));
        let mut handles = vec![];
        for i in 0..8 {
            let c = Arc::clone(&cache);
            handles.push(std::thread::spawn(move || {
                for j in 0..100 {
                    let uid = format!("u{}", i * 100 + j);
                    c.put(uid.clone(), make_feed(&uid));
                    let _ = c.get(&uid);
                }
            }));
        }
        for h in handles { h.join().unwrap(); }
        assert!(cache.metrics().size > 0);
    }
}
