# python/phoenix/BUILD — Starlark Python build targets

load("@rules_python//python:defs.bzl", "py_library", "py_binary", "py_test")

package(default_visibility = ["//visibility:public"])

py_library(
    name = "phoenix_model",
    srcs = ["model.py"],
    deps = [
        "//python/jamii:pipeline",
        "//python/jamii/embeddings:sim_clusters",
    ],
)

py_binary(
    name = "train",
    srcs = ["train.py"],
    deps = [":phoenix_model"],
    python_version = "PY3",
)

py_binary(
    name = "serve",
    srcs = ["serve.py"],
    deps = [":phoenix_model"],
    python_version = "PY3",
)

py_test(
    name = "phoenix_test",
    srcs = ["test_model.py"],
    deps = [":phoenix_model"],
    python_version = "PY3",
)
