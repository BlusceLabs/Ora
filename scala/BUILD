# scala/BUILD — Starlark build targets for Scala services

load("@io_bazel_rules_scala//scala:scala.bzl", "scala_library", "scala_binary", "scala_test")

package(default_visibility = ["//visibility:public"])

scala_library(
    name = "simclusters_lib",
    srcs = glob(["simclusters/*.scala"]),
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

scala_library(
    name = "home_mixer_lib",
    srcs = glob(["home_mixer/*.scala"]),
    deps = [
        ":simclusters_lib",
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

scala_library(
    name = "candidate_sourcer_lib",
    srcs = glob(["candidate_sourcer/*.scala"]),
    deps = [
        ":simclusters_lib",
        "//thrift:models_scala",
    ],
    scalacopts = ["-Xfatal-warnings", "-deprecation"],
)

scala_binary(
    name = "candidate_sourcer",
    main_class = "com.blusce.jamii.candidate_sourcer.CandidateSourcerServer",
    deps = [":candidate_sourcer_lib"],
)

scala_test(
    name = "simclusters_test",
    srcs = glob(["simclusters/*Test.scala"]),
    deps = [":simclusters_lib"],
)

scala_test(
    name = "home_mixer_test",
    srcs = glob(["home_mixer/*Test.scala"]),
    deps = [":home_mixer_lib"],
)
