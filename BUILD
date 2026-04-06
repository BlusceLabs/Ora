# Jamii Algorithm — Root Bazel BUILD file (Starlark)
# Defines top-level build targets and exports.

package(default_visibility = ["//visibility:public"])

# ─── Top-level alias targets ─────────────────────────────────────────────────

alias(
    name = "api",
    actual = "//python/api:server",
)

alias(
    name = "home_mixer",
    actual = "//scala/home_mixer:home_mixer_deploy.jar",
)

alias(
    name = "candidate_pipeline",
    actual = "//rust/candidate_pipeline:candidate_pipeline",
)

alias(
    name = "thunder",
    actual = "//rust/thunder:thunder",
)

alias(
    name = "ann_server",
    actual = "//cpp/ann:ann_server",
)

alias(
    name = "simclusters",
    actual = "//scala/simclusters:simclusters_deploy.jar",
)

alias(
    name = "graphjet",
    actual = "//java/graphjet:graphjet_server",
)
