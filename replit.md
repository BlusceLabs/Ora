# Jamii — Replit Setup

## Project Overview

**Jamii** is a super-app by BlusceLabs — combining messaging, social feed, stories, reels, creator tools, and commerce into one platform. The Android app is built on the [TGX-Android/Telegram-X](https://github.com/TGX-Android/Telegram-X) open-source codebase using [TDLib](https://core.telegram.org/tdlib). The iOS app is a native SwiftUI application. The algorithmic feed is powered by the BlusceLabs x-algorithm (Grok-based transformer recommendation system).

**Super-app pillars:** Messages · Feed · Stories · Spaces · Creator · Commerce · Platform

- **GitHub:** https://github.com/BlusceLabs/Jamii
- **Package ID:** com.bluscelabs.jamii

## Deliverables

### Android APK (built ✅)
- `app/build/outputs/apk/latestArm64/debug/Jamii-0.28.6.1786-arm64-v8a-debug.apk` (69 MB) — real phones
- `app/build/outputs/apk/lollipopX64/debug/Jamii-0.28.6.1786-lollipop-x64-debug.apk` (48 MB) — emulators/x86

**Android Phase 2 — Jamii Feature Controllers (added)**
- `JamiiHubController` — entry hub screen with links to all Jamii features (accessible from Settings → Jamii Features)
- `JamiiFeedController` — Social feed (For You / Following / Trending sections)
- `JamiiReelsController` — Short-form video feed with trending reels
- `JamiiStoriesController` — 24h ephemeral stories (add, highlights, archive, close friends)
- `JamiiLiveController` — Live streaming discovery and go-live entry (categories: Music, Gaming, Education, Shopping, Sports)
- `JamiiSpacesController` — Live audio rooms (live now + scheduled)
- `JamiiCommunitiesController` — Topic-based communities (my communities + discover)
- `JamiiShopController` — Shopping (categories, wishlist, cart, orders, sell)
- `JamiiWalletController` — Wallet (Jamii Coins, Diamonds, earnings, transactions, subscriptions)
- `JamiiCreatorController` — Creator Studio (analytics overview, content, monetization, tools)
- `JamiiCreateController` — Full creation flow (text/photo/video/reel/story/poll/live/space)
- `JamiiBookmarksController` — Bookmarks / saved content by collection
- All new string resources added to `strings.xml` (Feed, Reels, Spaces, Live, Stories, Communities, Shop, Wallet, Creator, Create, Bookmarks)
- All new IDs added to `ids.xml` (controller IDs + all button IDs)
- Navigation: Settings → Jamii Features → all screens reachable

### iOS App (source ready, compile on Mac ✅)
- Source: `ios/` directory — full SwiftUI app
- XcodeGen config: `ios/project.yml`
- Build on Mac: `bash scripts/build-jamii-ios.sh [simulator|device]`

### Web App (built ✅) — Phase 2 complete
- Source: `web/` directory — React + Vite SPA
- **AppShell**: 3-column desktop layout (sidebar + feed + right panel with trending/follow/Live Spaces widget), mobile bottom nav (Home/Reels/Create/Spaces/Msgs)
- **Desktop sidebar NAV**: Home, Search, Reels, Spaces, Alerts, Messages, Create Post; SIDEBAR_EXTRA: Profile, Creator Studio, Shop, Lists, Notifications, Settings
- **Pages (12 total):**
  - Auth (multi-step: welcome → phone → code → feed)
  - Feed — For You / Following / Live tabs, Stories bar, create-post quick bar
  - Search — trending, who-to-follow, live search with filters
  - Notifications — unread badge, filter tabs, mark-all-read
  - Profile — banner, stats, content tabs
  - Chat List — conversation list with last message/time
  - Chat View — two-column desktop layout, message thread
  - Spaces — live audio rooms, schedule, speaker management
  - Reels — TikTok-style vertical video feed
  - Shop — marketplace with categories, search, cart/wishlist, KES pricing, featured banners
  - Lists — Your Lists + Discover tabs, create modal with private toggle, follow toggle
  - Creator Studio — Overview (stats, charts, audience insights), My Content, Monetize (Creator Fund/Subscriptions/Tips/Affiliate toggles), Tools (Analytics/Schedule/Media Kit/Collabs)
  - Settings
- **PostCard:** likes/comments/reposts/saves toggles, hashtag highlighting, thread indicator, inline reply
- **CreatePostModal:** 25K char limit, SVG ring counter, tabs (post/thread/poll), hashtag suggestions, toolbar, audience selector
- **StoriesBar + StoryViewer:** Instagram gradient rings, progress bars, tap navigation, hold-to-pause
- **Routes:** /feed, /search, /notifications, /profile, /chats, /chats/:id, /spaces, /reels, /shop, /lists, /creator, /settings
- Brand: dark theme (#17212b bg, #2AABEE blue), CSS vars `--jamii-*`
- Dev server: `cd web && pnpm run dev` (port 5000)
- Workflow: "Start application" runs Vite dev server

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

The Replit preview shows the **Jamii web app** (React + Vite) on port 5000.

### Workflow

- **Start application** — runs `cd web && pnpm run dev` on port 5000 (webview)

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
| `algorithm/x-algorithm` | BlusceLabs/x-algorithm (Grok-based For You feed, Rust) |

### APK Build Status — WORKING ✅

**Build time:** ~8 minutes (Gradle only, native libs cached)
**Last successful build:** `Jamii-0.28.6.1786-arm64-v8a-debug.apk` (69 MB)
**Variant built:** `latestArm64Debug`

**Build fixes applied (all already in codebase):**
- `scripts/build-jamii.sh` — Skip-if-cached logic for native libs: checks for `libvpx.a` + `libavcodec.a` across all 4 ABIs before running `setup.sh` (saves ~30-60 min per build)
- `app/src/main/other/themes/Blue.tgx-theme` and 8 other themes — Added 7 missing Jamiinge brand color entries (`avatarJamiinge`, `nameJamiinge`, `lineJamiinge`, `wp_catsJamiinge`, `themeJamiinge`, `ledJamiinge`, `avatarJamiinge_big`) with value `#2AABEE`
- `app/src/main/other/themes/colors-and-properties.xml` — Added 8 missing Orange color schema entries (`avatarOrange`, `avatarOrange_big`, `nameOrange`, `lineOrange`, `themeOrange`, `ledOrange`, `wp_catsOrange`)
- `app/src/main/res/values/strings.xml` — Added 3 missing Orange strings: `ThemeOrange`, `LedOrange`, `AccentColorOrange`

**Remaining known issues:**
- `Telegram API credentials`: `local.properties` has placeholder values (`telegram.api_id=0`). Need real credentials from https://core.telegram.org/api/obtaining_api_id for a production build.
- `webrtc_deps`: Chromium submodules uninitialized (~10GB). Build currently works without them for `latestArm64Debug`.

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
bash scripts/build-jamii.sh
```

The APK will appear at:
```
app/build/outputs/apk/latest/universalDebug/app-latest-universal-debug.apk
```

## Building Locally (Outside Replit)

1. Clone with submodules: `git clone --recursive --depth=1 https://github.com/BlusceLabs/Jamii jamii`
2. Install Android Studio with SDK API 36, NDK 23.2.8568313, CMake 3.22.1
3. Obtain Telegram API credentials at https://core.telegram.org/api/obtaining_api_id
4. Copy `local.properties.sample` to `local.properties`, set `sdk.dir`, `telegram.api_id`, and `telegram.api_hash`
5. Build: `./gradlew assembleLatestUniversalDebug`

## Branding Changes from Telegram X

All user-facing and code-level references to "Telegram X" have been replaced with "Jamii":

- `app/src/main/res/values/strings.xml` — all user-facing strings
- `app/src/main/res/values/local_strings.xml`
- All Java/Kotlin source files under `app/src/`
- All native C/C++ JNI files under `app/jni/`
- `app/src/main/AndroidManifest.xml`
- `local.properties.sample` — updated with `com.bluscelabs.jamii` package ID and `Jamii` app name
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
algorithm/              # Jamii recommendation engine
  x-algorithm/          # BlusceLabs/x-algorithm — For You feed (Grok transformer, Rust)
    candidate-pipeline/ # Retrieval & filtering stage
    home-mixerphoenix/  # Ranking & mixing (Phoenix model)
    thunder/            # In-network post fetching
scripts/                # Build helper scripts
  build-jamii.sh          # Convenience build script
  setup.sh              # Original TGX setup script
gradle/                 # Gradle version catalogs (libs.versions.toml)
server.js               # Node.js info server for Replit webview (port 5000)
local.properties        # Build configuration (not committed)
local.properties.sample # Template for local.properties
version.properties      # Version numbers for all SDK/build tool components
.gitmodules             # Submodule URLs (BlusceLabs forks for main libs)
```
