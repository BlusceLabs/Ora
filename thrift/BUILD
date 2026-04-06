# thrift/BUILD — Starlark targets for Thrift IDL compilation

load("@rules_thrift//:defs.bzl", "thrift_library")

package(default_visibility = ["//visibility:public"])

thrift_library(
    name = "models",
    srcs = ["models.thrift"],
    languages = ["java", "scala", "py"],
    gen_args = {
        "java": "beans:private-members",
        "py":   "new_style",
    },
)

thrift_library(
    name = "services",
    srcs = ["services.thrift"],
    deps  = [":models"],
    languages = ["java", "scala", "py"],
    gen_args = {
        "java": "beans:private-members",
        "py":   "new_style",
    },
)

# Language-specific aliases used by BUILD targets above
alias(name = "models_java",  actual = ":models")
alias(name = "models_scala", actual = ":models")
alias(name = "models_py",    actual = ":models")
