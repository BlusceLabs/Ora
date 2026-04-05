#!/bin/bash
set -e

# Ora Build Script — builds the debug APK
# Usage: bash scripts/build-ora.sh [variant]
#   variant: latestUniversalDebug (default), legacyDebug, lollipopDebug

VARIANT="${1:-latestUniversalDebug}"
WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE"

# -- Java 21 --
JAVA21="$HOME/jdk21"
if [ ! -d "$JAVA21" ]; then
  echo "Downloading OpenJDK 21 Temurin..."
  wget -q -O /tmp/jdk21.tar.gz \
    "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.6%2B7/OpenJDK21U-jdk_x64_linux_hotspot_21.0.6_7.tar.gz"
  mkdir -p "$JAVA21"
  tar -xzf /tmp/jdk21.tar.gz -C "$JAVA21" --strip-components=1
fi
export JAVA_HOME="$JAVA21"
export PATH="$JAVA_HOME/bin:$PATH"

# -- Android SDK --
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"

if [ ! -d "$ANDROID_SDK_ROOT/cmdline-tools/latest" ]; then
  echo "Downloading Android SDK cmdline-tools..."
  mkdir -p "$ANDROID_SDK_ROOT"
  wget -q -O /tmp/cmdline-tools.zip \
    "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
  unzip -q /tmp/cmdline-tools.zip -d "$ANDROID_SDK_ROOT/cmdline-tools"
  mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest"
fi

SDKMANAGER="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
yes | "$SDKMANAGER" --licenses > /dev/null 2>&1
[ ! -d "$ANDROID_SDK_ROOT/platforms/android-36" ] && yes | "$SDKMANAGER" "platforms;android-36"
[ ! -d "$ANDROID_SDK_ROOT/build-tools/36.0.0" ] && yes | "$SDKMANAGER" "build-tools;36.0.0"
[ ! -d "$ANDROID_SDK_ROOT/ndk/23.2.8568313" ] && yes | "$SDKMANAGER" "ndk;23.2.8568313"
[ ! -d "$ANDROID_SDK_ROOT/cmake/3.22.1" ] && yes | "$SDKMANAGER" "cmake;3.22.1"

echo "=== Building Ora — variant: assemble${VARIANT^} ==="
./gradlew --no-daemon ":app:assemble${VARIANT^}" 2>&1

echo ""
echo "=== Build complete! APK location: ==="
find app/build/outputs/apk -name "*.apk" 2>/dev/null && echo "Done." || echo "No APK found — check build output above."
