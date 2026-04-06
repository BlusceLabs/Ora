/**
 * HNSW (Hierarchical Navigable Small World) Approximate Nearest Neighbor Index.
 *
 * Implements in-memory ANN for SimClusters embedding space and TwHIN embeddings.
 * Used by the recommendation pipeline to find the most similar posts/users to
 * a query embedding vector without exhaustive search.
 *
 * Directly mirrors Twitter's ANN service and the Navi model server's
 * embedding lookup used in both the-algorithm and x-algorithm.
 *
 * Reference: twitter/the-algorithm → ann/src/main/
 *
 * HNSW properties:
 *  - O(log N) query time
 *  - Supports both L2 and cosine distance
 *  - Incremental index (supports online inserts)
 *  - Multi-threaded search
 */

#pragma once

#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdint>
#include <functional>
#include <limits>
#include <memory>
#include <mutex>
#include <random>
#include <string>
#include <unordered_map>
#include <vector>

namespace jamii {
namespace ann {

// ─── Distance Metrics ────────────────────────────────────────────────────────

enum class DistanceMetric { L2, Cosine, DotProduct };

inline float l2_distance(const std::vector<float>& a, const std::vector<float>& b) {
    assert(a.size() == b.size());
    float sum = 0.0f;
    for (size_t i = 0; i < a.size(); ++i) {
        float d = a[i] - b[i];
        sum += d * d;
    }
    return std::sqrt(sum);
}

inline float dot_product(const std::vector<float>& a, const std::vector<float>& b) {
    assert(a.size() == b.size());
    float sum = 0.0f;
    for (size_t i = 0; i < a.size(); ++i) {
        sum += a[i] * b[i];
    }
    return sum;
}

inline float cosine_similarity(const std::vector<float>& a, const std::vector<float>& b) {
    float dot  = dot_product(a, b);
    float na   = dot_product(a, a);
    float nb   = dot_product(b, b);
    float denom = std::sqrt(na * nb);
    return denom == 0.0f ? 0.0f : dot / denom;
}

// ─── Search Result ────────────────────────────────────────────────────────────

struct SearchResult {
    std::string entity_id;
    float       distance;  // lower = more similar for L2/cosine, higher for dot-product

    bool operator<(const SearchResult& other) const {
        return distance < other.distance;
    }
};

// ─── HNSW Index ───────────────────────────────────────────────────────────────

/**
 * HNSWIndex — Hierarchical Navigable Small World graph index.
 *
 * Each node is connected to M neighbors at each layer.
 * Search starts at the top layer and greedily descends to layer 0.
 * Layer 0 contains all nodes; higher layers are exponentially sparser.
 *
 * Parameters:
 *   M          — max connections per node per layer (default: 16)
 *   ef_search  — beam width during search (default: 64)
 *   ef_construct — beam width during construction (default: 200)
 */
class HNSWIndex {
public:
    struct Config {
        size_t         dims;
        size_t         M            = 16;
        size_t         ef_construct = 200;
        size_t         ef_search    = 64;
        DistanceMetric metric       = DistanceMetric::Cosine;
        uint64_t       seed         = 42;
    };

    explicit HNSWIndex(const Config& config)
        : config_(config), rng_(config.seed) {}

    // ── Mutation ──────────────────────────────────────────────────────────────

    void insert(const std::string& entity_id, const std::vector<float>& embedding) {
        assert(embedding.size() == config_.dims);

        std::unique_lock<std::mutex> lock(mutex_);

        size_t node_id = nodes_.size();
        int    level   = sample_level();

        nodes_.push_back({ entity_id, embedding, {} });
        id_to_node_[entity_id] = node_id;

        if (entry_point_ == SIZE_MAX) {
            entry_point_   = node_id;
            max_level_     = level;
            nodes_[node_id].neighbors.resize(level + 1);
            return;
        }

        nodes_[node_id].neighbors.resize(std::max((int)max_level_, level) + 1);

        // Greedy descent from top layer to level+1
        size_t ep = entry_point_;
        for (int l = (int)max_level_; l > level; --l) {
            ep = greedy_search(embedding, ep, 1, l)[0];
        }

        // Insert and connect at each layer 0..level
        for (int l = std::min(level, (int)max_level_); l >= 0; --l) {
            auto neighbors = search_layer(embedding, ep, config_.ef_construct, l);
            auto selected  = select_neighbors(node_id, neighbors, config_.M, l);

            nodes_[node_id].neighbors[l] = selected;
            for (size_t nb : selected) {
                nodes_[nb].neighbors[l].push_back(node_id);
                if (nodes_[nb].neighbors[l].size() > config_.M * 2) {
                    shrink_connections(nb, l);
                }
            }
            if (!selected.empty()) ep = selected[0];
        }

        if (level > (int)max_level_) {
            max_level_   = level;
            entry_point_ = node_id;
        }
    }

    // ── Search ────────────────────────────────────────────────────────────────

    std::vector<SearchResult> search(
        const std::vector<float>& query,
        size_t top_k,
        size_t ef = 0
    ) const {
        if (entry_point_ == SIZE_MAX || nodes_.empty()) return {};

        size_t ef_actual = std::max(ef, std::max(top_k, config_.ef_search));
        size_t ep        = entry_point_;

        for (int l = (int)max_level_; l > 0; --l) {
            ep = greedy_search(query, ep, 1, l)[0];
        }

        auto layer0 = const_cast<HNSWIndex*>(this)->search_layer(query, ep, ef_actual, 0);

        std::vector<SearchResult> results;
        results.reserve(std::min(top_k, layer0.size()));
        for (size_t nid : layer0) {
            float d = distance(query, nodes_[nid].embedding);
            results.push_back({ nodes_[nid].entity_id, d });
        }
        std::sort(results.begin(), results.end());
        if (results.size() > top_k) results.resize(top_k);
        return results;
    }

    size_t size() const { return nodes_.size(); }

private:
    struct Node {
        std::string              entity_id;
        std::vector<float>       embedding;
        std::vector<std::vector<size_t>> neighbors;  // neighbors[layer]
    };

    Config                            config_;
    std::vector<Node>                 nodes_;
    std::unordered_map<std::string, size_t> id_to_node_;
    size_t                            entry_point_ = SIZE_MAX;
    int                               max_level_   = 0;
    mutable std::mutex                mutex_;
    mutable std::mt19937_64           rng_;

    float distance(const std::vector<float>& a, const std::vector<float>& b) const {
        switch (config_.metric) {
            case DistanceMetric::L2:         return l2_distance(a, b);
            case DistanceMetric::DotProduct:  return -dot_product(a, b);  // negate for min-heap
            case DistanceMetric::Cosine:
            default:                          return 1.0f - cosine_similarity(a, b);
        }
    }

    int sample_level() {
        std::uniform_real_distribution<double> dist(0.0, 1.0);
        double r = dist(rng_);
        return static_cast<int>(-std::log(r) * (1.0 / std::log(config_.M)));
    }

    std::vector<size_t> greedy_search(
        const std::vector<float>& query, size_t entry, size_t k, int layer
    ) const {
        float best_dist = distance(query, nodes_[entry].embedding);
        size_t best_node = entry;

        bool changed = true;
        while (changed) {
            changed = false;
            for (size_t nb : nodes_[best_node].neighbors[layer]) {
                float d = distance(query, nodes_[nb].embedding);
                if (d < best_dist) {
                    best_dist = d;
                    best_node = nb;
                    changed   = true;
                }
            }
        }
        return { best_node };
    }

    std::vector<size_t> search_layer(
        const std::vector<float>& query, size_t entry, size_t ef, int layer
    ) {
        using PQ = std::priority_queue<std::pair<float, size_t>>;
        PQ candidates;
        PQ result;
        std::unordered_map<size_t, bool> visited;

        float d = distance(query, nodes_[entry].embedding);
        candidates.push({ -d, entry });
        result.push({ d, entry });
        visited[entry] = true;

        while (!candidates.empty()) {
            auto [neg_cd, cnode] = candidates.top(); candidates.pop();
            float cd = -neg_cd;
            if (cd > result.top().first) break;

            for (size_t nb : nodes_[cnode].neighbors[layer]) {
                if (visited.count(nb)) continue;
                visited[nb] = true;
                float nd = distance(query, nodes_[nb].embedding);
                if (nd < result.top().first || result.size() < ef) {
                    candidates.push({ -nd, nb });
                    result.push({ nd, nb });
                    if (result.size() > ef) result.pop();
                }
            }
        }

        std::vector<size_t> out;
        while (!result.empty()) { out.push_back(result.top().second); result.pop(); }
        return out;
    }

    std::vector<size_t> select_neighbors(
        size_t node_id, const std::vector<size_t>& candidates, size_t M, int layer
    ) {
        std::vector<std::pair<float, size_t>> scored;
        for (size_t nb : candidates) {
            if (nb == node_id) continue;
            scored.push_back({ distance(nodes_[node_id].embedding, nodes_[nb].embedding), nb });
        }
        std::sort(scored.begin(), scored.end());
        std::vector<size_t> result;
        for (auto& [d, nid] : scored) {
            if (result.size() >= M) break;
            result.push_back(nid);
        }
        return result;
    }

    void shrink_connections(size_t node_id, int layer) {
        auto& neighbors = nodes_[node_id].neighbors[layer];
        auto selected   = select_neighbors(node_id, neighbors, config_.M, layer);
        neighbors = selected;
    }
};

}  // namespace ann
}  // namespace jamii
