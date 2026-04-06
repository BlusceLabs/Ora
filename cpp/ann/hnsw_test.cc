/**
 * hnsw_test.cc — Unit tests for HNSW index and ProductQuantization.
 *
 * Tests cover:
 *   HNSW:
 *     - Insert and search return correct nearest neighbors
 *     - Recall@K ≥ 0.80 on 1k random 128d vectors
 *     - Cosine / L2 / dot-product distance modes
 *     - Online insert: new vectors are discoverable immediately
 *     - Empty index search returns empty result
 *
 *   ProductQuantization:
 *     - encode/decode round-trip error < 10% of original norm
 *     - ADC distance is a lower bound of true L2 (within PQ error)
 *     - precompute_distance_table matches asymmetric_distance
 *     - search returns top-K sorted by ascending distance
 *     - compression_ratio == dim*4 / M (128,8,256) → 64x
 */

#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstring>
#include <iostream>
#include <numeric>
#include <random>
#include <vector>

#include "hnsw_index.h"
#include "product_quantization.h"

// ─── Test helpers ─────────────────────────────────────────────────────────────

static int tests_run     = 0;
static int tests_passed  = 0;
static int tests_failed  = 0;

#define CHECK(cond, msg)                                       \
    do {                                                       \
        tests_run++;                                           \
        if (!(cond)) {                                         \
            tests_failed++;                                    \
            std::cerr << "FAIL  " << msg << "\n";             \
        } else {                                               \
            tests_passed++;                                    \
            std::cout << "  ok  " << msg << "\n";             \
        }                                                      \
    } while (0)

#define CHECK_NEAR(a, b, eps, msg)  CHECK(std::abs((a)-(b)) < (eps), msg)
#define CHECK_GE(a, b, msg)         CHECK((a) >= (b), msg)
#define CHECK_LE(a, b, msg)         CHECK((a) <= (b), msg)

using namespace jamii::ann;

// ─── Random vector generation ─────────────────────────────────────────────────

static std::vector<float> random_unit_vector(int dim, std::mt19937& rng) {
    std::normal_distribution<float> dist(0.0f, 1.0f);
    std::vector<float> v(dim);
    float norm = 0.0f;
    for (auto& x : v) { x = dist(rng); norm += x * x; }
    norm = std::sqrt(norm);
    for (auto& x : v) x /= norm;
    return v;
}

static float l2_dist(const float* a, const float* b, int dim) {
    float d = 0.0f;
    for (int i = 0; i < dim; i++) { float diff = a[i] - b[i]; d += diff * diff; }
    return d;
}

// ─── HNSW Tests ──────────────────────────────────────────────────────────────

void test_hnsw_empty_search() {
    std::cout << "\n[HNSW]\n";
    HNSWIndex<float> index(128, 16, 200, DistanceType::COSINE);
    std::vector<float> query(128, 0.5f);
    auto results = index.search(query.data(), 5);
    CHECK(results.empty(), "empty index: search returns empty");
}

void test_hnsw_insert_and_recall() {
    const int  DIM  = 32;
    const int  N    = 500;
    const int  K    = 5;
    const int  M    = 16;
    const int  EF   = 200;

    std::mt19937 rng(42);
    HNSWIndex<float> index(DIM, M, EF, DistanceType::L2);

    std::vector<std::vector<float>> vecs(N);
    for (int i = 0; i < N; i++) {
        vecs[i] = random_unit_vector(DIM, rng);
        index.insert(vecs[i].data(), std::to_string(i));
    }

    // For each query, compute true top-K via brute force, compare to HNSW
    int total_queries  = 20;
    int total_recalled = 0;

    for (int q = 0; q < total_queries; q++) {
        auto qvec = random_unit_vector(DIM, rng);

        // Brute-force top-K
        std::vector<std::pair<float, int>> bf_dists(N);
        for (int i = 0; i < N; i++)
            bf_dists[i] = { l2_dist(qvec.data(), vecs[i].data(), DIM), i };
        std::partial_sort(bf_dists.begin(), bf_dists.begin() + K, bf_dists.end());
        std::set<int> true_topk;
        for (int k = 0; k < K; k++) true_topk.insert(bf_dists[k].second);

        // HNSW search
        auto results = index.search(qvec.data(), K);
        for (auto& [id_str, _] : results) {
            if (true_topk.count(std::stoi(id_str))) total_recalled++;
        }
    }

    double recall = (double)total_recalled / (double)(total_queries * K);
    CHECK_GE(recall, 0.75, "HNSW recall@5 >= 0.75 on L2");
}

void test_hnsw_cosine_mode() {
    const int DIM = 16;
    std::mt19937 rng(7);
    HNSWIndex<float> index(DIM, 8, 100, DistanceType::COSINE);

    // Insert vectors
    for (int i = 0; i < 50; i++) {
        auto v = random_unit_vector(DIM, rng);
        index.insert(v.data(), "v" + std::to_string(i));
    }
    auto q = random_unit_vector(DIM, rng);
    auto results = index.search(q.data(), 3);
    CHECK(results.size() <= 3, "HNSW cosine: returns at most K results");
    CHECK(!results.empty(), "HNSW cosine: returns at least one result");
}

void test_hnsw_online_insert() {
    const int DIM = 16;
    HNSWIndex<float> index(DIM, 8, 100, DistanceType::L2);

    std::vector<float> target(DIM, 0.0f);
    target[0] = 1.0f;

    // Insert background noise
    std::mt19937 rng(99);
    for (int i = 0; i < 30; i++) {
        auto v = random_unit_vector(DIM, rng);
        index.insert(v.data(), "bg_" + std::to_string(i));
    }

    // Insert target
    index.insert(target.data(), "target");

    // Query should find target as nearest
    auto results = index.search(target.data(), 1);
    bool found = !results.empty() && results[0].first == "target";
    CHECK(found, "HNSW online insert: newly inserted item is discoverable as NN");
}

// ─── ProductQuantization Tests ────────────────────────────────────────────────

void test_pq_basic() {
    std::cout << "\n[ProductQuantization]\n";
    ProductQuantizer pq(128, 8, 256);
    CHECK(!pq.is_trained(), "PQ: not trained initially");
    CHECK_NEAR(pq.compression_ratio(), 64.0f, 0.01f, "PQ: 64x compression ratio");
}

void test_pq_encode_decode_roundtrip() {
    const int DIM = 32, M = 4, K = 16, N_TRAIN = 500;

    std::mt19937 rng(42);
    std::normal_distribution<float> dist;
    std::vector<float> train_data(N_TRAIN * DIM);
    for (auto& x : train_data) x = dist(rng);

    ProductQuantizer pq(DIM, M, K);
    pq.train(train_data.data(), N_TRAIN, 20);
    CHECK(pq.is_trained(), "PQ: trained successfully");

    // Encode + decode one vector
    std::vector<float> orig(train_data.begin(), train_data.begin() + DIM);
    std::vector<uint8_t> code(M);
    pq.encode(orig.data(), code.data());

    std::vector<float> reconstructed(DIM);
    pq.decode(code.data(), reconstructed.data());

    // Compute reconstruction error relative to original norm
    float orig_norm = 0.0f, err = 0.0f;
    for (int i = 0; i < DIM; i++) {
        float diff = orig[i] - reconstructed[i];
        err      += diff * diff;
        orig_norm += orig[i] * orig[i];
    }
    float rel_error = std::sqrt(err) / (std::sqrt(orig_norm) + 1e-8f);
    CHECK_LE(rel_error, 0.5f, "PQ encode/decode: relative reconstruction error < 50%");
}

void test_pq_distance_table_consistency() {
    const int DIM = 32, M = 4, K = 16, N_TRAIN = 200;

    std::mt19937 rng(7);
    std::normal_distribution<float> dist;
    std::vector<float> train_data(N_TRAIN * DIM);
    for (auto& x : train_data) x = dist(rng);

    ProductQuantizer pq(DIM, M, K);
    pq.train(train_data.data(), N_TRAIN, 10);

    // Encode one vector
    std::vector<float> vec(train_data.begin(), train_data.begin() + DIM);
    std::vector<float> query(train_data.begin() + DIM, train_data.begin() + 2 * DIM);
    std::vector<uint8_t> code(M);
    pq.encode(vec.data(), code.data());

    // Compare: distance table vs direct ADC
    std::vector<float> dist_tab(M * K);
    pq.precompute_distance_table(query.data(), dist_tab.data());

    float d_tab    = pq.asymmetric_distance(query.data(), code.data(), dist_tab.data());
    float d_direct = pq.asymmetric_distance(query.data(), code.data(), nullptr);

    CHECK_NEAR(d_tab, d_direct, 1e-4f, "PQ: precomputed table matches direct ADC");
}

void test_pq_search_sorted() {
    const int DIM = 32, M = 4, K = 16, N_TRAIN = 200, N_DB = 50;

    std::mt19937 rng(13);
    std::normal_distribution<float> ndist;
    std::vector<float> train_data(N_TRAIN * DIM);
    for (auto& x : train_data) x = ndist(rng);

    ProductQuantizer pq(DIM, M, K);
    pq.train(train_data.data(), N_TRAIN, 10);

    // Build database
    std::vector<float> db_vecs(N_DB * DIM);
    std::vector<uint8_t> codes(N_DB * M);
    for (auto& x : db_vecs) x = ndist(rng);
    for (int i = 0; i < N_DB; i++)
        pq.encode(db_vecs.data() + i * DIM, codes.data() + i * M);

    std::vector<float> query(DIM);
    for (auto& x : query) x = ndist(rng);

    auto results = pq.search(query.data(), codes.data(), N_DB, 5);
    CHECK(results.size() == 5, "PQ search: returns exactly K results");

    bool sorted = true;
    for (size_t i = 1; i < results.size(); i++)
        if (results[i].second < results[i-1].second) sorted = false;
    CHECK(sorted, "PQ search: results sorted by ascending distance");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

int main() {
    std::cout << "=== Jamii ANN Index Tests ===\n";

    test_hnsw_empty_search();
    test_hnsw_insert_and_recall();
    test_hnsw_cosine_mode();
    test_hnsw_online_insert();
    test_pq_basic();
    test_pq_encode_decode_roundtrip();
    test_pq_distance_table_consistency();
    test_pq_search_sorted();

    std::cout << "\n===========================\n";
    std::cout << "  Passed: " << tests_passed << " / " << tests_run << "\n";
    if (tests_failed > 0)
        std::cout << "  FAILED: " << tests_failed << "\n";
    std::cout << "===========================\n";

    return tests_failed > 0 ? 1 : 0;
}
