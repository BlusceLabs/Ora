# rust/BUILD — Starlark build targets for Rust services

load("@rules_rust//rust:defs.bzl", "rust_library", "rust_binary", "rust_test")

package(default_visibility = ["//visibility:public"])

rust_library(
    name = "candidate_pipeline",
    srcs = glob(["candidate_pipeline/src/*.rs"]),
    edition = "2021",
    deps = [
        "@crates//:async-trait",
        "@crates//:tokio",
        "@crates//:serde",
        "@crates//:serde_json",
        "@crates//:thiserror",
        "@crates//:tracing",
        "@crates//:chrono",
    ],
)

rust_binary(
    name = "thunder",
    srcs = glob(["thunder/src/*.rs"]),
    edition = "2021",
    deps = [
        ":candidate_pipeline",
        "@crates//:axum",
        "@crates//:tokio",
        "@crates//:tower",
        "@crates//:tracing",
        "@crates//:tracing-subscriber",
        "@crates//:serde",
        "@crates//:serde_json",
    ],
)

rust_test(
    name = "candidate_pipeline_test",
    crate = ":candidate_pipeline",
)
