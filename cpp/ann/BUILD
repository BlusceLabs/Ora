# cpp/ann/BUILD — Starlark C++ build targets

package(default_visibility = ["//visibility:public"])

cc_library(
    name = "hnsw_index",
    hdrs = ["hnsw_index.h"],
    copts = [
        "-std=c++17",
        "-O3",
        "-march=native",
        "-fopenmp",
        "-Wall",
        "-Wextra",
    ],
    linkopts = ["-lpthread"],
)

cc_binary(
    name = "ann_server",
    srcs = ["ann_server.cc"],
    deps = [":hnsw_index"],
    copts = [
        "-std=c++17",
        "-O3",
        "-march=native",
        "-Wall",
    ],
    linkopts = ["-lpthread"],
)

cc_test(
    name = "hnsw_test",
    srcs = ["hnsw_test.cc"],
    deps = [
        ":hnsw_index",
        "@com_google_googletest//:gtest_main",
    ],
    copts = ["-std=c++17"],
)
