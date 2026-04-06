"""
Jamii Algorithm — Bazel WORKSPACE
Defines all external dependencies for the polyglot monorepo.

Languages: Python, Scala, Java, Rust, C++
Build system: Bazel (with Starlark rules)
"""

workspace(name = "jamii_algorithm")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# ─── Python ──────────────────────────────────────────────────────────────────
http_archive(
    name = "rules_python",
    sha256 = "9d04041ac92a0985e344235f5d946f71ac543f1b1565f2cdbc9a2aaee8adf55b",
    strip_prefix = "rules_python-0.26.0",
    url = "https://github.com/bazelbuild/rules_python/releases/download/0.26.0/rules_python-0.26.0.tar.gz",
)

load("@rules_python//python:repositories.bzl", "py_repositories")
py_repositories()

# ─── Scala ───────────────────────────────────────────────────────────────────
http_archive(
    name = "io_bazel_rules_scala",
    sha256 = "77a3b9308a8780fff3f10cdbbe36d55d8606a2b17b5e4c4e7f9e0a19fa9a8f7f",
    strip_prefix = "rules_scala-6.0.0",
    url = "https://github.com/bazelbuild/rules_scala/releases/download/v6.0.0/rules_scala-v6.0.0.tar.gz",
)

load("@io_bazel_rules_scala//:scala_config.bzl", "scala_config")
scala_config(scala_version = "2.13.12")

load("@io_bazel_rules_scala//scala:scala.bzl", "scala_repositories")
scala_repositories()

# ─── Java ────────────────────────────────────────────────────────────────────
# Java uses standard Bazel java_library / java_binary rules (built-in).

# ─── Rust ────────────────────────────────────────────────────────────────────
http_archive(
    name = "rules_rust",
    sha256 = "6501960c3e4da32495d1e1007ded0769a534cb195c30dea36aa54f9d8a3f0361",
    urls = ["https://github.com/bazelbuild/rules_rust/releases/download/0.33.0/rules_rust-v0.33.0.tar.gz"],
)

load("@rules_rust//rust:repositories.bzl", "rules_rust_dependencies", "rust_register_toolchains")
rules_rust_dependencies()
rust_register_toolchains(edition = "2021")

# ─── C++ ─────────────────────────────────────────────────────────────────────
# C++ uses standard Bazel cc_library / cc_binary rules (built-in).

# ─── Thrift ──────────────────────────────────────────────────────────────────
http_archive(
    name = "rules_thrift",
    sha256 = "e98e081cde4ec6ad56e08cf9a04b1e396fbb5c19b3bfc32e93b9a5b7cec6a7f3",
    strip_prefix = "rules_thrift-0.2.1",
    url = "https://github.com/apache/thrift/archive/refs/tags/0.19.0.tar.gz",
)

# ─── Protobuf (for gRPC interop) ─────────────────────────────────────────────
http_archive(
    name = "com_google_protobuf",
    sha256 = "9b4ee22c250fe31b16f1a24d61467e40a6e85ca7aea73e1b5f5e27c3e9d4a29b",
    strip_prefix = "protobuf-24.4",
    url = "https://github.com/protocolbuffers/protobuf/releases/download/v24.4/protobuf-24.4.tar.gz",
)
