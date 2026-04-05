# Ora — Replit Setup

## Project Overview

**Ora** is a messaging app for Android and iOS by BlusceLabs. The Android app is built on the [TGX-Android/Telegram-X](https://github.com/TGX-Android/Telegram-X) open-source codebase using [TDLib](https://core.telegram.org/tdlib). The iOS app is a native SwiftUI application.

- **GitHub:** https://github.com/BlusceLabs/Ora
- **Package ID:** com.bluscelabs.ora

## Deliverables

### Android APK (built ✅)
- `app/build/outputs/apk/latestArm64/debug/Ora-0.28.6.1786-arm64-v8a-debug.apk` (69 MB) — real phones
- `app/build/outputs/apk/lollipopX64/debug/Ora-0.28.6.1786-lollipop-x64-debug.apk` (48 MB) — emulators/x86

### iOS App (source ready, compile on Mac ✅)
- Source: `ios/` directory — full SwiftUI app
- XcodeGen config: `ios/project.yml`
- Build on Mac: `bash scripts/build-ora-ios.sh [simulator|device]`

### Web App (next)

## Android Tech Stack

- **Languages:** Java, Kotlin, C/C++
- **Build System:** Gradle 9.2.1 (Kotlin DSL) + CMake 3.22.1 + Ninja
- **Android SDK:** Compile/Target SDK 36, Min SDK 21 (Android 5.0)
- **NDK:** 23.2.8568313
- **Java:** 21 (OpenJDK Temurin) — required; installed at `~/jdk21`
- **Core Library:** TDLib via TGX-Android/tdlib wrapper
- **Native Libraries:** TDLib, tgcalls/WebRTC, FFmpeg, libvpx, libopus, libwebp, libyuv, lz4, FLAC

## iOS Tech Stack

- **Language:** Swift 5.9
- **UI Framework:** SwiftUI
- **Min iOS:** 16.0
- **Project Generator:** XcodeGen (`ios/project.yml`)
- **Messaging backend:** TDLib (stub wired — add credentials to connect)

## Replit Environment

This is a native Android app and **cannot run as a web application**. A Node.js info server (`server.js`) provides project information in the Replit preview on port 5000.

### Workflow

- **Start application** — runs `node server.js` on port 5000 (webview)

### Deployment

- Target: autoscale
- Run command: `node server.js`

## Build Status in Replit

The Android build environment has been fully configured in Replit. All components are installed:

- Android SDK API 36 (`~/Android/Sdk/platforms/android-36`)
- Build Tools 36.0.0 (`~/Android/Sdk/build-tools/36.0.0`)
- NDK 23.2.8568313 (`~/Android/Sdk/ndk/23.2.8568313`)
- CMake 3.22.1 (`~/Android/Sdk/cmake/3.22.1`)
- OpenJDK 21 Temurin (`~/jdk21`)
- All Git submodules initialized (see below)
- `local.properties` created with SDK path and placeholder API credentials

### Submodule Status

All standard submodules are initialized. BlusceLabs forks are cloned directly:

| Submodule | Source |
|-----------|--------|
| `tdlib/` | TGX-Android/tdlib (Gradle wrapper with pre-built libs) |
| `app/jni/third_party/webp` | BlusceLabs/libwebp |
| `app/jni/third_party/ffmpeg` | BlusceLabs/FFmpeg |
| `app/jni/tgvoip/third_party/webrtc` | BlusceLabs/webrtc |
| `app/jni/tgvoip/third_party/tgcalls` | BlusceLabs/tgcalls |
| `tdlib/source/openssl` | openssl/openssl (OpenSSL_1_1_1-stable) |
| `tdlib/source/td` | tdlib/td (TDLib C++ source, for version info) |
| `vkryl/leveldb/jni/leveldb` | google/leveldb |
| `vkryl/leveldb/jni/jni-utils` | TGX-Android/jni-utils |

### Blockers for Full Build

1. **Telegram API credentials**: `local.properties` has placeholder values (`telegram.api_id=0`). Get real credentials at https://core.telegram.org/api/obtaining_api_id and update `local.properties`.

2. **Build time**: The full NDK compilation takes ~30-60 minutes. Run `bash scripts/build-ora.sh` in a shell to trigger it.

3. **webrtc_deps**: `app/jni/tgvoip/third_party/webrtc_deps/base` and `webrtc_deps/third_party` are uninitialized (Chromium submodules, ~10GB each). The build may or may not require them depending on which code paths BlusceLabs/webrtc and BlusceLabs/tgcalls use.

## Building the APK in Replit

Run the build script in the Replit shell:

```bash
export JAVA_HOME=~/jdk21
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_SDK_ROOT=~/Android/Sdk
export ANDROID_HOME=~/Android/Sdk
./gradlew --no-daemon :app:assembleLatestUniversalDebug
```

Or use the convenience script:

```bash
bash scripts/build-ora.sh
```

The APK will appear at:
```
app/build/outputs/apk/latest/universalDebug/app-latest-universal-debug.apk
```

## Building Locally (Outside Replit)

1. Clone with submodules: `git clone --recursive --depth=1 https://github.com/BlusceLabs/Ora ora`
2. Install Android Studio with SDK API 36, NDK 23.2.8568313, CMake 3.22.1
3. Obtain Telegram API credentials at https://core.telegram.org/api/obtaining_api_id
4. Copy `local.properties.sample` to `local.properties`, set `sdk.dir`, `telegram.api_id`, and `telegram.api_hash`
5. Build: `./gradlew assembleLatestUniversalDebug`

## Branding Changes from Telegram X

All user-facing and code-level references to "Telegram X" have been replaced with "Ora":

- `app/src/main/res/values/strings.xml` — all user-facing strings
- `app/src/main/res/values/local_strings.xml`
- All Java/Kotlin source files under `app/src/`
- All native C/C++ JNI files under `app/jni/`
- `app/src/main/AndroidManifest.xml`
- `local.properties.sample` — updated with `com.bluscelabs.ora` package ID and `Ora` app name
- `buildSrc/build.gradle.kts` — JVM toolchain set to Java 21

## Project Structure

```
app/                    # Main Android app module
  src/main/
    java/               # Java source (UI, navigation, TDLib integration)
    kotlin/             # Kotlin source
    jni/                # Native C/C++ code (CMakeLists.txt, tgvoip, third_party)
    res/                # Android resources
  build.gradle.kts
buildSrc/               # Custom Gradle plugins (tgx-config, tgx-module)
tdlib/                  # TGX-Android/tdlib: Gradle wrapper with pre-built TDLib .so files
vkryl/                  # Utility libraries (android, core, leveldb, td)
extension/              # Extension module bridge
scripts/                # Build helper scripts
  build-ora.sh          # Convenience build script
  setup.sh              # Original TGX setup script
gradle/                 # Gradle version catalogs (libs.versions.toml)
server.js               # Node.js info server for Replit webview (port 5000)
local.properties        # Build configuration (not committed)
local.properties.sample # Template for local.properties
version.properties      # Version numbers for all SDK/build tool components
.gitmodules             # Submodule URLs (BlusceLabs forks for main libs)
```
