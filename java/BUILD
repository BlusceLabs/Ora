# java/BUILD — Starlark build targets for Java services

load("@rules_java//java:defs.bzl", "java_library", "java_binary", "java_test")

package(default_visibility = ["//visibility:public"])

# ─── GraphJet (InteractionGraph) ─────────────────────────────────────────────

java_library(
    name = "graphjet_lib",
    srcs = glob(["graphjet/*.java"], exclude = ["graphjet/*Test.java"]),
    deps = [
        "//thrift:models_java",
    ],
    javacopts = ["-source", "17", "-target", "17"],
)

java_binary(
    name = "graphjet",
    main_class = "com.blusce.jamii.graphjet.InteractionGraphServer",
    deps = [":graphjet_lib"],
)

java_test(
    name = "graphjet_test",
    srcs  = glob(["graphjet/*Test.java"]),
    deps  = [
        ":graphjet_lib",
        "@maven//:org_junit_jupiter_junit_jupiter_api",
        "@maven//:org_junit_jupiter_junit_jupiter_engine",
    ],
    test_class = "com.blusce.jamii.graphjet.InteractionGraphTest",
)

# ─── Earlybird (Inverted Index) ───────────────────────────────────────────────

java_library(
    name = "earlybird_lib",
    srcs = glob(["earlybird/*.java"], exclude = ["earlybird/*Test.java"]),
    deps = [
        ":graphjet_lib",
        "//thrift:models_java",
    ],
    javacopts = ["-source", "17", "-target", "17"],
)

java_binary(
    name = "earlybird",
    main_class = "com.blusce.jamii.earlybird.EarlybirdServer",
    deps = [":earlybird_lib"],
)

# ─── Topic Social Proof ───────────────────────────────────────────────────────

java_library(
    name = "topic_social_proof_lib",
    srcs = glob(["topic_social_proof/*.java"], exclude = ["topic_social_proof/*Test.java"]),
    deps = [
        "//thrift:models_java",
    ],
    javacopts = ["-source", "17", "-target", "17"],
)

java_binary(
    name = "topic_social_proof",
    main_class = "com.blusce.jamii.topic_social_proof.TopicSocialProofServer",
    deps = [":topic_social_proof_lib"],
)

java_test(
    name = "topic_social_proof_test",
    srcs  = glob(["topic_social_proof/*Test.java"]),
    deps  = [
        ":topic_social_proof_lib",
        "@maven//:org_junit_jupiter_junit_jupiter_api",
        "@maven//:org_junit_jupiter_junit_jupiter_engine",
    ],
    test_class = "com.blusce.jamii.topic_social_proof.TopicSocialProofTest",
)

# ─── All Java Tests ───────────────────────────────────────────────────────────

test_suite(
    name = "all_java_tests",
    tests = [
        ":graphjet_test",
        ":topic_social_proof_test",
    ],
)
