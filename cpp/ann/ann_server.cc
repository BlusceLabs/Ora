/**
 * ANN Server — Approximate Nearest Neighbor serving for Jamii.
 *
 * Serves SimClusters and TwHIN embedding lookups to the ranking pipeline.
 * Backs the SimClustersANNService Thrift endpoint.
 *
 * Mirrors Twitter's ANN service and Navi (the model serving layer written in Rust),
 * and xai-org/x-algorithm's Phoenix retrieval backend.
 *
 * Reference: twitter/the-algorithm → ann/src/main/
 *            xai-org/x-algorithm   → phoenix/
 *
 * Functionality:
 *  - Accepts embedding lookup requests (user_id or post_id → top-K similar)
 *  - Backed by HNSW index (see hnsw_index.h)
 *  - Supports: user→post (feed recommendation)
 *              user→user (people you may know)
 *              post→post (similar content)
 *  - Minimal HTTP/JSON interface for local dev; gRPC in production
 */

#include "hnsw_index.h"

#include <algorithm>
#include <chrono>
#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

namespace jamii {
namespace ann {

// ─── Embedding Store ──────────────────────────────────────────────────────────

class EmbeddingStore {
public:
    explicit EmbeddingStore(size_t dims) : dims_(dims) {}

    void insert(const std::string& entity_id, std::vector<float> embedding) {
        if (embedding.size() != dims_) {
            std::cerr << "[EmbeddingStore] Dimension mismatch for " << entity_id << "\n";
            return;
        }
        store_[entity_id] = std::move(embedding);
    }

    const std::vector<float>* get(const std::string& entity_id) const {
        auto it = store_.find(entity_id);
        return it != store_.end() ? &it->second : nullptr;
    }

    size_t size() const { return store_.size(); }

private:
    size_t dims_;
    std::unordered_map<std::string, std::vector<float>> store_;
};

// ─── ANN Service ──────────────────────────────────────────────────────────────

class ANNService {
public:
    struct Config {
        size_t         embedding_dims = 128;
        size_t         hnsw_M        = 16;
        size_t         ef_search     = 64;
        DistanceMetric metric        = DistanceMetric::Cosine;
    };

    explicit ANNService(const Config& config)
        : config_(config)
        , user_store_(config.embedding_dims)
        , post_store_(config.embedding_dims)
        , user_index_(make_hnsw_config(config))
        , post_index_(make_hnsw_config(config))
    {}

    // Index operations
    void index_user(const std::string& user_id, const std::vector<float>& embedding) {
        user_store_.insert(user_id, embedding);
        user_index_.insert(user_id, embedding);
    }

    void index_post(const std::string& post_id, const std::vector<float>& embedding) {
        post_store_.insert(post_id, embedding);
        post_index_.insert(post_id, embedding);
    }

    // Query: find top-K posts most similar to a user's embedding
    std::vector<SearchResult> find_posts_for_user(
        const std::string& user_id, size_t top_k = 50
    ) {
        const auto* emb = user_store_.get(user_id);
        if (!emb) {
            std::cerr << "[ANN] Unknown user: " << user_id << "\n";
            return {};
        }
        return post_index_.search(*emb, top_k);
    }

    // Query: find top-K users most similar to a query user
    std::vector<SearchResult> find_similar_users(
        const std::string& user_id, size_t top_k = 50
    ) {
        const auto* emb = user_store_.get(user_id);
        if (!emb) return {};
        auto results = user_index_.search(*emb, top_k + 1);
        // Remove the query user itself
        results.erase(
            std::remove_if(results.begin(), results.end(),
                [&user_id](const SearchResult& r) { return r.entity_id == user_id; }),
            results.end()
        );
        if (results.size() > top_k) results.resize(top_k);
        return results;
    }

    // Query: find top-K posts similar to a given post
    std::vector<SearchResult> find_similar_posts(
        const std::string& post_id, size_t top_k = 20
    ) {
        const auto* emb = post_store_.get(post_id);
        if (!emb) return {};
        auto results = post_index_.search(*emb, top_k + 1);
        results.erase(
            std::remove_if(results.begin(), results.end(),
                [&post_id](const SearchResult& r) { return r.entity_id == post_id; }),
            results.end()
        );
        return results;
    }

    void print_stats() const {
        std::cout << "[ANN] Users indexed: " << user_index_.size()
                  << " | Posts indexed: "    << post_index_.size() << "\n";
    }

private:
    Config         config_;
    EmbeddingStore user_store_;
    EmbeddingStore post_store_;
    HNSWIndex      user_index_;
    HNSWIndex      post_index_;

    static HNSWIndex::Config make_hnsw_config(const Config& c) {
        return { c.embedding_dims, c.hnsw_M, 200, c.ef_search, c.metric };
    }
};

// ─── Demo / Entry Point ───────────────────────────────────────────────────────

void run_demo() {
    std::cout << "=== Jamii ANN Server — Demo ===\n\n";

    ANNService::Config config;
    config.embedding_dims = 16;  // Small dims for demo
    config.hnsw_M         = 8;

    ANNService service(config);

    // Seed with fake embeddings
    size_t dims = 16;
    std::mt19937 rng(42);
    std::uniform_real_distribution<float> dist(-1.0f, 1.0f);

    for (int i = 0; i < 100; ++i) {
        std::vector<float> emb(dims);
        std::generate(emb.begin(), emb.end(), [&]{ return dist(rng); });
        service.index_user("user_" + std::to_string(i), emb);
    }

    for (int i = 0; i < 500; ++i) {
        std::vector<float> emb(dims);
        std::generate(emb.begin(), emb.end(), [&]{ return dist(rng); });
        service.index_post("post_" + std::to_string(i), emb);
    }

    service.print_stats();

    auto t0 = std::chrono::high_resolution_clock::now();
    auto results = service.find_posts_for_user("user_0", 10);
    auto t1 = std::chrono::high_resolution_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();

    std::cout << "\nTop-10 posts for user_0 (latency: " << ms << " μs):\n";
    for (auto& r : results) {
        std::cout << "  " << r.entity_id << "  distance=" << r.distance << "\n";
    }

    auto sim_users = service.find_similar_users("user_0", 5);
    std::cout << "\nTop-5 similar users to user_0:\n";
    for (auto& r : sim_users) {
        std::cout << "  " << r.entity_id << "  distance=" << r.distance << "\n";
    }
}

}  // namespace ann
}  // namespace jamii

int main() {
    jamii::ann::run_demo();
    return 0;
}
