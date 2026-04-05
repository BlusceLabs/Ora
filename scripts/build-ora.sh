#!/bin/bash
set -e

# Ora Build Script
# Usage: bash scripts/build-ora.sh [variant]
#   variant: lollipopX64Debug (default), latestUniversalDebug
#
# Required env vars for connectivity (placeholders accepted for APK build):
#   TELEGRAM_API_ID    — your Telegram API ID
#   TELEGRAM_API_HASH  — your Telegram API hash

VARIANT="${1:-lollipopX64Debug}"
WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE"

echo "=== Ora Build Script ==="
echo "Workspace: $WORKSPACE"
echo "Variant:   $VARIANT"

# ── 1. Submodules ────────────────────────────────────────────────────────────
echo ""
echo "--- Step 1: Initialize git submodules ---"
git submodule update --init --recursive 2>&1 || {
  echo "WARNING: Some submodules could not be fetched (network or permissions)."
  echo "Continuing — pre-built .a/.so files may already be present."
}

# ── 2. Java 21 ───────────────────────────────────────────────────────────────
echo ""
echo "--- Step 2: Java 21 ---"
JAVA21="$HOME/jdk21"
if [ -d "$JAVA21/bin" ]; then
  echo "Java 21 already at $JAVA21"
else
  echo "Downloading OpenJDK 21 Temurin..."
  wget -q -O /tmp/jdk21.tar.gz \
    "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.6%2B7/OpenJDK21U-jdk_x64_linux_hotspot_21.0.6_7.tar.gz"
  mkdir -p "$JAVA21"
  tar -xzf /tmp/jdk21.tar.gz -C "$JAVA21" --strip-components=1
fi
export JAVA_HOME="$JAVA21"
export PATH="$JAVA_HOME/bin:$PATH"
echo "JAVA_HOME=$JAVA_HOME"
java -version

# ── 3. Android SDK ───────────────────────────────────────────────────────────
echo ""
echo "--- Step 3: Android SDK / NDK / CMake ---"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"

if [ ! -d "$ANDROID_SDK_ROOT/cmdline-tools/latest" ]; then
  echo "Downloading Android SDK cmdline-tools..."
  mkdir -p "$ANDROID_SDK_ROOT"
  wget -q -O /tmp/cmdline-tools.zip \
    "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
  unzip -q /tmp/cmdline-tools.zip -d "$ANDROID_SDK_ROOT/cmdline-tools"
  mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" \
     "$ANDROID_SDK_ROOT/cmdline-tools/latest"
fi

SDKMANAGER="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
yes | "$SDKMANAGER" --licenses > /dev/null 2>&1 || true
[ ! -d "$ANDROID_SDK_ROOT/platforms/android-36" ] && \
  yes | "$SDKMANAGER" "platforms;android-36"
[ ! -d "$ANDROID_SDK_ROOT/build-tools/36.0.0" ] && \
  yes | "$SDKMANAGER" "build-tools;36.0.0"
[ ! -d "$ANDROID_SDK_ROOT/ndk/23.2.8568313" ] && \
  yes | "$SDKMANAGER" "ndk;23.2.8568313"
[ ! -d "$ANDROID_SDK_ROOT/cmake/3.22.1" ] && \
  yes | "$SDKMANAGER" "cmake;3.22.1"
echo "SDK ready at $ANDROID_SDK_ROOT"

# ── 4. local.properties ──────────────────────────────────────────────────────
echo ""
echo "--- Step 4: local.properties ---"
API_ID="${TELEGRAM_API_ID:-0}"
API_HASH="${TELEGRAM_API_HASH:-00000000000000000000000000000000}"

cat > local.properties << EOF
sdk.dir=$ANDROID_SDK_ROOT
APP_ID=$API_ID
APP_HASH=$API_HASH
EOF
echo "local.properties written (API_ID=$API_ID)"

# ── 5. Gradle build ──────────────────────────────────────────────────────────
echo ""
echo "--- Step 5: Gradle build — :app:assemble${VARIANT} ---"
./gradlew --no-daemon ":app:assemble${VARIANT}" 2>&1

echo ""
echo "=== Build complete! APK: ==="
find app/build/outputs/apk -name "*.apk" 2>/dev/null | while read apk; do
  size=$(du -sh "$apk" 2>/dev/null | cut -f1)
  echo "  $apk  ($size)"
done || echo "No APK found — check build output above."
