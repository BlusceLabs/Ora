# scala/BUILD — Starlark build targets for Scala services

load("@io_bazel_rules_scala//scala:scala.bzl", "scala_library", "scala_binary", "scala_test")

package(default_visibility = ["//visibility:public"])

# ─── SimClusters ──────────────────────────────────────────────────────────────

scala_library(
    name = "simclusters_lib",
    srcs = glob(["simclusters/*.scala"], exclude = ["simclusters/*Test.scala"]),
    deps = [
        "//thrift:models_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "simclusters",
    main_class = "com.blusce.jamii.simclusters.SimClustersApp",
    deps = [":simclusters_lib"],
)

scala_test(
    name = "simclusters_test",
    srcs  = glob(["simclusters/*Test.scala"]),
    deps  = [":simclusters_lib"],
)

# ─── Tweepcred (PageRank) ─────────────────────────────────────────────────────

scala_library(
    name = "tweepcred_lib",
    srcs = glob(["tweepcred/*.scala"], exclude = ["tweepcred/*Test.scala"]),
    deps = [
        "//thrift:models_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "tweepcred",
    main_class = "com.blusce.jamii.tweepcred.TweepcredJob",
    deps = [":tweepcred_lib"],
)

scala_test(
    name = "tweepcred_test",
    srcs  = glob(["tweepcred/*Test.scala"]),
    deps  = [":tweepcred_lib"],
)

# ─── Real Graph ───────────────────────────────────────────────────────────────

scala_library(
    name = "real_graph_lib",
    srcs = glob(["real_graph/*.scala"], exclude = ["real_graph/*Test.scala"]),
    deps = [
        "//thrift:models_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "real_graph",
    main_class = "com.blusce.jamii.real_graph.RealGraphBatchJob",
    deps = [":real_graph_lib"],
)

# ─── User Signal Service ──────────────────────────────────────────────────────

scala_library(
    name = "uss_lib",
    srcs = glob(["user_signal_service/*.scala"], exclude = ["user_signal_service/*Test.scala"]),
    deps = [
        "//thrift:models_scala",
        "//thrift:services_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "user_signal_service",
    main_class = "com.blusce.jamii.user_signal_service.UserSignalServer",
    deps = [":uss_lib"],
)

# ─── Home Mixer ──────────────────────────────────────────────────────────────

scala_library(
    name = "home_mixer_lib",
    srcs = glob(["home_mixer/*.scala"], exclude = ["home_mixer/*Test.scala"]),
    deps = [
        ":simclusters_lib",
        ":real_graph_lib",
        ":tweepcred_lib",
        ":uss_lib",
        "//thrift:models_scala",
        "//thrift:services_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "home_mixer",
    main_class = "com.blusce.jamii.home_mixer.HomeMixerServer",
    deps = [":home_mixer_lib"],
)

scala_test(
    name = "home_mixer_test",
    srcs  = glob(["home_mixer/*Test.scala"]),
    deps  = [":home_mixer_lib"],
)

# ─── Candidate Sourcer ───────────────────────────────────────────────────────

scala_library(
    name = "candidate_sourcer_lib",
    srcs = glob(["candidate_sourcer/*.scala"], exclude = ["candidate_sourcer/*Test.scala"]),
    deps = [
        ":simclusters_lib",
        ":real_graph_lib",
        ":uss_lib",
        "//thrift:models_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "candidate_sourcer",
    main_class = "com.blusce.jamii.candidate_sourcer.CandidateSourcerServer",
    deps = [":candidate_sourcer_lib"],
)

# ─── Social Graph ────────────────────────────────────────────────────────────

scala_library(
    name = "social_graph_lib",
    srcs = glob(["social_graph/*.scala"], exclude = ["social_graph/*Test.scala"]),
    deps = [
        "//thrift:models_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "social_graph",
    main_class = "com.blusce.jamii.social_graph.SocialGraphServer",
    deps = [":social_graph_lib"],
)

# ─── MagicRecs (Who To Follow + Push Notifications) ──────────────────────────

scala_library(
    name = "magic_recs_lib",
    srcs = glob(["magic_recs/*.scala"], exclude = ["magic_recs/*Test.scala"]),
    deps = [
        ":social_graph_lib",
        ":real_graph_lib",
        ":simclusters_lib",
        ":uss_lib",
        "//thrift:models_scala",
        "//thrift:notification_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "magic_recs",
    main_class = "com.blusce.jamii.magic_recs.MagicRecsServer",
    deps = [":magic_recs_lib"],
)

# ─── All Scala Tests ─────────────────────────────────────────────────────────

test_suite(
    name = "all_scala_tests",
    tests = [
        ":simclusters_test",
        ":tweepcred_test",
        ":home_mixer_test",
    ],
)
