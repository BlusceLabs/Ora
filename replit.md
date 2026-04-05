# Ora — Replit Setup

## Project Overview

**Ora** is a Telegram client for Android, built on top of the [Telegram X](https://github.com/TGX-Android/Telegram-X) open-source codebase and [TDLib](https://core.telegram.org/tdlib). It is developed by BlusceLabs and aims to deliver the same features as Telegram X under the Ora brand.

- **GitHub:** https://github.com/BlusceLabs/Ora
- **Package ID:** com.bluscelabs.ora

## Tech Stack

- **Languages:** Java, Kotlin, C/C++
- **Build System:** Gradle 9.2.1 (Kotlin DSL) + CMake 3.22
- **Android SDK:** Compile/Target SDK 36, Min SDK 21 (Android 5.0)
- **NDK:** 23.2.8568313
- **Core Library:** TDLib (Telegram Database Library)
- **Native Libraries:** TDLib, tgcalls/WebRTC, FFmpeg 6.1, libvpx, libopus, libwebp, libyuv, lz4, FLAC

## Replit Environment Notes

This is a native Android app and **cannot run as a web application**. A simple Node.js info server (`server.js`) is configured to provide project information in the Replit preview at port 5000.

### Workflow

- **Start application** — runs `node server.js` on port 5000 (webview)

### Deployment

- Target: autoscale
- Run command: `node server.js`

## Building the Android App

To actually build Ora, you need:

1. macOS or Linux with Android Studio
2. Git LFS installed
3. Clone with submodules: `git clone --recursive --depth=1 https://github.com/BlusceLabs/Ora ora`
4. Telegram API credentials from https://core.telegram.org/api/obtaining_api_id
5. Create `local.properties` based on `local.properties.sample` — set `sdk.dir`, `telegram.api_id`, and `telegram.api_hash`. The `app.id` is `com.bluscelabs.ora` and `app.name` is `Ora`.
6. Run `scripts/setup.sh` to download SDK packages and build native dependencies
7. Build: `./gradlew assembleUniversalRelease`

## Branding Changes from Telegram X

All user-facing and code-level references to "Telegram X" have been replaced with "Ora":

- `app/src/main/res/values/strings.xml` — all user-facing strings
- `app/src/main/res/values/local_strings.xml`
- All Java/Kotlin source files under `app/src/`
- All native C/C++ JNI files under `app/jni/`
- `app/src/main/AndroidManifest.xml`
- `local.properties.sample` — updated with `com.bluscelabs.ora` package ID and `Ora` app name

## Project Structure

```
app/                    # Main Android app module
  src/main/
    java/               # Java source (UI, navigation, TDLib integration)
    kotlin/             # Kotlin source
    jni/                # Native C/C++ code (CMakeLists.txt)
    res/                # Android resources
  build.gradle.kts
buildSrc/               # Custom Gradle plugins
tdlib/                  # TDLib submodule
tgcalls/                # Voice/video calls submodule
vkryl/                  # Core utilities submodule (android, core, leveldb, td)
extension/              # Extension module bridge
scripts/                # Build helper scripts
docs/                   # Documentation
```
