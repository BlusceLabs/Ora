# java/BUILD — Starlark build targets for Java services

package(default_visibility = ["//visibility:public"])

java_library(
    name = "graphjet_lib",
    srcs = glob(["graphjet/*.java"]),
    deps = [
        "//thrift:models_java",
    ],
    javacopts = ["-source 17", "-target 17"],
)

java_binary(
    name = "graphjet_server",
    main_class = "com.blusce.jamii.graphjet.GraphJetServer",
    runtime_deps = [":graphjet_lib"],
)

java_library(
    name = "earlybird_lib",
    srcs = glob(["earlybird/*.java"]),
    deps = [
        "//thrift:models_java",
    ],
    javacopts = ["-source 17", "-target 17"],
)

java_binary(
    name = "earlybird_server",
    main_class = "com.blusce.jamii.earlybird.EarlybirdServer",
    runtime_deps = [":earlybird_lib"],
)

java_test(
    name = "graphjet_test",
    srcs = glob(["graphjet/*Test.java"]),
    deps = [
        ":graphjet_lib",
        "@maven//:junit_junit",
    ],
)
