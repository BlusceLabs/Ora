/**
 * product_quantization.h — Product Quantization for embedding compression.
 *
 * Compresses 128-dimensional float embeddings into compact byte codes
 * for fast approximate nearest-neighbor search with dramatically reduced memory.
 *
 * Mirrors FAISS PQ (used by Twitter/Meta for ANN at scale):
 *   - Original: 128d × float32 = 512 bytes per vector
 *   - PQ(M=8, K=256): 8 bytes per vector = 64× compression
 *
 * How it works:
 *   1. Split 128d vector into M sub-vectors of D/M dimensions each
 *   2. For each sub-space, build a codebook of K centroids (k-means)
 *   3. Each sub-vector is encoded as the index of its nearest centroid (1 byte if K=256)
 *   4. ANN search: compare quantized query against quantized index using ADC
 *      (Asymmetric Distance Computation) — O(M×K) per candidate
 *
 * Usage:
 *   ProductQuantizer pq(128, 8, 256);          // dim=128, M=8 sub-spaces, K=256 centroids
 *   pq.train(training_vectors, n_train);        // train codebooks
 *   pq.encode(vector, code);                    // 128 floats → 8 bytes
 *   float dist = pq.asymmetric_distance(q, c); // query float × code bytes
 *
 * Reference: Y. Jégou, M. Douze, C. Schmid — "Product Quantization for Nearest
 *            Neighbor Search" (PAMI 2011)
 */

#pragma once

#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <limits>
#include <random>
#include <stdexcept>
#include <vector>

namespace jamii {
namespace ann {

class ProductQuantizer {
public:
    const int  dim;   // original vector dimension (must be divisible by M)
    const int  M;     // number of sub-quantizers
    const int  K;     // number of centroids per sub-quantizer (max 256 for uint8 codes)
    const int  Ds;    // sub-vector dimension = dim / M

    /**
     * @param dim  Input vector dimension (e.g. 128)
     * @param M    Number of sub-spaces (e.g. 8); dim must be divisible by M
     * @param K    Codebook size per sub-space (e.g. 256 → 1 byte per sub-code)
     */
    ProductQuantizer(int dim, int M, int K)
        : dim(dim), M(M), K(K), Ds(dim / M)
    {
        if (dim % M != 0)
            throw std::invalid_argument("dim must be divisible by M");
        if (K > 256)
            throw std::invalid_argument("K must be <= 256 for uint8 codes");

        // codebooks[m][k][d] = centroid k of sub-space m, component d
        codebooks_.resize(M, std::vector<std::vector<float>>(K, std::vector<float>(Ds, 0.0f)));
        trained_ = false;
    }

    // ─── Training (k-means per sub-space) ────────────────────────────────

    /**
     * Train the PQ codebooks using k-means on a set of training vectors.
     *
     * @param data     Flat array of n_train × dim floats
     * @param n_train  Number of training vectors (should be >> K)
     * @param n_iter   K-means iterations
     */
    void train(const float* data, int n_train, int n_iter = 25) {
        std::mt19937 rng(42);

        for (int m = 0; m < M; m++) {
            // Extract m-th sub-vectors
            std::vector<std::vector<float>> sub_vecs(n_train, std::vector<float>(Ds));
            for (int i = 0; i < n_train; i++)
                std::copy(data + i * dim + m * Ds,
                          data + i * dim + m * Ds + Ds,
                          sub_vecs[i].begin());

            // Initialize centroids by random selection
            std::vector<int> idx(n_train);
            std::iota(idx.begin(), idx.end(), 0);
            std::shuffle(idx.begin(), idx.end(), rng);
            for (int k = 0; k < K; k++)
                codebooks_[m][k] = sub_vecs[idx[k % n_train]];

            // K-means iterations
            std::vector<int> assignments(n_train);
            for (int iter = 0; iter < n_iter; iter++) {
                // Assignment step
                for (int i = 0; i < n_train; i++)
                    assignments[i] = nearest_centroid(sub_vecs[i], m);

                // Update step
                std::vector<std::vector<float>> new_centroids(K, std::vector<float>(Ds, 0.0f));
                std::vector<int> counts(K, 0);

                for (int i = 0; i < n_train; i++) {
                    int c = assignments[i];
                    counts[c]++;
                    for (int d = 0; d < Ds; d++)
                        new_centroids[c][d] += sub_vecs[i][d];
                }
                for (int k = 0; k < K; k++) {
                    if (counts[k] > 0) {
                        for (int d = 0; d < Ds; d++)
                            new_centroids[k][d] /= counts[k];
                        codebooks_[m][k] = new_centroids[k];
                    }
                }
            }
        }
        trained_ = true;
    }

    // ─── Encode ──────────────────────────────────────────────────────────

    /**
     * Encode a vector into M bytes.
     *
     * @param vec   Input float vector of length `dim`
     * @param code  Output byte code of length M
     */
    void encode(const float* vec, uint8_t* code) const {
        assert(trained_);
        for (int m = 0; m < M; m++) {
            const float* sub = vec + m * Ds;
            code[m] = static_cast<uint8_t>(
                nearest_centroid(std::vector<float>(sub, sub + Ds), m)
            );
        }
    }

    /**
     * Decode a byte code back to an approximate float vector.
     *
     * @param code  Input byte code of length M
     * @param vec   Output float vector of length `dim`
     */
    void decode(const uint8_t* code, float* vec) const {
        assert(trained_);
        for (int m = 0; m < M; m++) {
            const auto& centroid = codebooks_[m][code[m]];
            std::copy(centroid.begin(), centroid.end(), vec + m * Ds);
        }
    }

    // ─── Distance ────────────────────────────────────────────────────────

    /**
     * Asymmetric Distance Computation (ADC):
     * computes squared L2 distance between a raw query vector and a stored code.
     *
     * Faster than decoding: precomputes per-sub-space distance table once.
     *
     * @param query     Float query vector of length `dim`
     * @param code      Byte code of length M
     * @param dist_tab  Precomputed distance table (M × K floats); use precompute_distance_table
     *                  for batch search. Pass nullptr to recompute.
     */
    float asymmetric_distance(const float* query, const uint8_t* code,
                              const float* dist_tab = nullptr) const {
        assert(trained_);
        float total = 0.0f;
        if (dist_tab) {
            for (int m = 0; m < M; m++)
                total += dist_tab[m * K + code[m]];
        } else {
            for (int m = 0; m < M; m++) {
                const auto& centroid = codebooks_[m][code[m]];
                const float* sub     = query + m * Ds;
                float d = 0.0f;
                for (int i = 0; i < Ds; i++) {
                    float diff = sub[i] - centroid[i];
                    d += diff * diff;
                }
                total += d;
            }
        }
        return total;
    }

    /**
     * Precompute per-sub-space distance table for a query vector.
     * Result layout: dist_tab[m * K + k] = ||query_sub_m - centroid_m_k||^2
     * Build once per query, then reuse for all database codes.
     *
     * @param query    Float query vector of length `dim`
     * @param dist_tab Output array of M × K floats
     */
    void precompute_distance_table(const float* query, float* dist_tab) const {
        assert(trained_);
        for (int m = 0; m < M; m++) {
            const float* sub = query + m * Ds;
            for (int k = 0; k < K; k++) {
                const auto& centroid = codebooks_[m][k];
                float d = 0.0f;
                for (int i = 0; i < Ds; i++) {
                    float diff = sub[i] - centroid[i];
                    d += diff * diff;
                }
                dist_tab[m * K + k] = d;
            }
        }
    }

    // ─── Batch Search ────────────────────────────────────────────────────

    /**
     * Find approximate K nearest neighbors in a PQ-compressed database.
     *
     * @param query     Raw query vector (dim floats)
     * @param codes     Database codes (n_codes × M bytes)
     * @param n_codes   Number of database entries
     * @param top_k     Number of results to return
     * @return          Vector of (index, distance) pairs, sorted by distance ascending
     */
    std::vector<std::pair<int, float>> search(
        const float*   query,
        const uint8_t* codes,
        int            n_codes,
        int            top_k
    ) const {
        std::vector<float> dist_tab(M * K);
        precompute_distance_table(query, dist_tab.data());

        std::vector<std::pair<float, int>> heap;
        heap.reserve(n_codes);

        for (int i = 0; i < n_codes; i++) {
            float d = asymmetric_distance(query, codes + i * M, dist_tab.data());
            heap.push_back({d, i});
        }

        int k = std::min(top_k, n_codes);
        std::partial_sort(heap.begin(), heap.begin() + k, heap.end());

        std::vector<std::pair<int, float>> results;
        results.reserve(k);
        for (int i = 0; i < k; i++)
            results.push_back({heap[i].second, heap[i].first});

        return results;
    }

    // ─── Info ─────────────────────────────────────────────────────────────

    bool   is_trained()    const { return trained_; }
    size_t bytes_per_code() const { return static_cast<size_t>(M); }

    float compression_ratio() const {
        float original = static_cast<float>(dim * sizeof(float));
        float compressed = static_cast<float>(M * sizeof(uint8_t));
        return original / compressed;
    }

    std::string info() const {
        return "PQ(dim=" + std::to_string(dim) + ", M=" + std::to_string(M) +
               ", K=" + std::to_string(K) + ", Ds=" + std::to_string(Ds) +
               ", bytes/vec=" + std::to_string(M) +
               ", compression=" + std::to_string(static_cast<int>(compression_ratio())) + "x)";
    }

private:
    // codebooks_[m][k] = k-th centroid of m-th sub-quantizer
    std::vector<std::vector<std::vector<float>>> codebooks_;
    bool trained_;

    int nearest_centroid(const std::vector<float>& sub, int m) const {
        float best_dist = std::numeric_limits<float>::max();
        int   best_k    = 0;
        for (int k = 0; k < K; k++) {
            float d = 0.0f;
            const auto& centroid = codebooks_[m][k];
            for (int i = 0; i < Ds; i++) {
                float diff = sub[i] - centroid[i];
                d += diff * diff;
            }
            if (d < best_dist) { best_dist = d; best_k = k; }
        }
        return best_k;
    }
};

} // namespace ann
} // namespace jamii
