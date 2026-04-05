# Telegram X — Replit Setup

## Project Overview

**Telegram X** is an official alternative Android client for Telegram, based on [TDLib](https://core.telegram.org/tdlib). This is a native Android mobile application written in Java, Kotlin, and C/C++.

- **Google Play:** https://play.google.com/store/apps/details?id=org.thunderdog.challegram
- **GitHub:** https://github.com/TGX-Android/Telegram-X
- **Package ID:** org.thunderdog.challegram

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

To actually build Telegram X, you need:

1. macOS or Linux with Android Studio
2. Git LFS installed
3. Clone with submodules: `git clone --recursive --depth=1 https://github.com/TGX-Android/Telegram-X tgx`
4. Telegram API credentials from https://core.telegram.org/api/obtaining_api_id
5. Create `local.properties` with `sdk.dir`, `telegram.api_id`, and `telegram.api_hash`
6. Run `scripts/setup.sh` to download SDK packages and build native dependencies
7. Build: `./gradlew assembleUniversalRelease`

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
