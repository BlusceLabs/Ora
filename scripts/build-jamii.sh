#!/bin/bash
set -e

# Jamii Build Script
# Usage: bash scripts/build-jamii.sh [variant]
#   variant: lollipopX64Debug (default), latestUniversalDebug
#
# Optional env vars (placeholders accepted; app will build without real connectivity):
#   TELEGRAM_API_ID     — your Telegram API ID         (default: 0)
#   TELEGRAM_API_HASH   — your Telegram API hash       (default: 00000000000000000000000000000000)
#   APP_ID              — package name                 (default: com.bluscelabs.jamii)
#   APP_NAME            — app label                   (default: Jamii)
#   APP_DOWNLOAD_URL    — download/release URL         (default: https://github.com/BlusceLabs/Jamii)

VARIANT="${1:-lollipopX64Debug}"
WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE"

echo "=== Jamii Build Script ==="
echo "Workspace: $WORKSPACE"
echo "Variant:   $VARIANT"

# ── 1. Git submodules ─────────────────────────────────────────────────────────
echo ""
echo "--- Step 1: Git submodules ---"
# Run update; ignore clone errors for submodules already on disk from a prior build
git submodule update --init --recursive --depth=1 2>&1 || {
  echo "Some submodule clones failed (likely already present) — continuing..."
  # Ensure each registered submodule path exists and is non-empty
  MISSING=0
  while IFS= read -r line; do
    path=$(echo "$line" | awk '{print $2}')
    if [ -n "$path" ] && [ ! -d "$WORKSPACE/$path" ]; then
      echo "ERROR: Submodule path missing: $path" >&2
      MISSING=1
    fi
  done < <(git submodule status 2>/dev/null)
  if [ "$MISSING" -eq 1 ]; then
    echo "ERROR: One or more required submodule paths are missing." >&2
    exit 1
  fi
}
SUBMODULE_COUNT=$(git submodule status | wc -l)
echo "Submodules ready: $SUBMODULE_COUNT"

# ── 2. Java 21 ────────────────────────────────────────────────────────────────
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
java -version

# ── 3. Android SDK / NDK / CMake ─────────────────────────────────────────────
echo ""
echo "--- Step 3: Android SDK / NDK / CMake ---"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}"
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

# ── 4. local.properties ───────────────────────────────────────────────────────
echo ""
echo "--- Step 4: local.properties ---"
CPU_COUNT=$(nproc --all 2>/dev/null || echo 4)

write_local_properties() {
  cat > local.properties << EOF
sdk.dir=$ANDROID_SDK_ROOT
org.gradle.workers.max=$CPU_COUNT
keystore.file=
app.id=${APP_ID:-com.bluscelabs.jamii}
app.name=${APP_NAME:-Jamii}
app.download_url=${APP_DOWNLOAD_URL:-https://github.com/BlusceLabs/Jamii}
app.sources_url=${APP_SOURCES_URL:-https://github.com/BlusceLabs/Jamii}
telegram.api_id=${TELEGRAM_API_ID:-0}
telegram.api_hash=${TELEGRAM_API_HASH:-00000000000000000000000000000000}
EOF
}

REQUIRED_KEYS=(sdk.dir app.id app.name telegram.api_id telegram.api_hash)
if [ ! -f local.properties ]; then
  write_local_properties
  echo "local.properties created (telegram.api_id=${TELEGRAM_API_ID:-0})"
else
  # Validate that all required keys are present
  MISSING=()
  for key in "${REQUIRED_KEYS[@]}"; do
    grep -q "^${key}=" local.properties || MISSING+=("$key")
  done
  if [ ${#MISSING[@]} -gt 0 ]; then
    echo "local.properties missing required keys: ${MISSING[*]} — regenerating..."
    write_local_properties
    echo "local.properties regenerated"
  else
    echo "local.properties already exists and valid — skipping"
  fi
fi

# ── 5. Native dependency setup ────────────────────────────────────────────────
echo ""
echo "--- Step 5: Native dependencies (setup.sh --skip-sdk-setup) ---"
# Export required vars for setup.sh / set-env.sh
export ANDROID_SDK_ROOT ANDROID_HOME
if bash scripts/setup.sh --skip-sdk-setup 2>&1; then
  echo "setup.sh completed successfully"
else
  EXIT_CODE=$?
  if [ "${SKIP_SETUP_ERRORS:-0}" = "1" ]; then
    echo "WARNING: setup.sh failed (exit $EXIT_CODE). SKIP_SETUP_ERRORS=1 — continuing with pre-built deps."
  else
    echo "ERROR: setup.sh --skip-sdk-setup failed (exit $EXIT_CODE). Set SKIP_SETUP_ERRORS=1 to override." >&2
    exit $EXIT_CODE
  fi
fi

# ── 6. Gradle build ───────────────────────────────────────────────────────────
echo ""
echo "--- Step 6: Gradle build — :app:assemble${VARIANT} ---"
./gradlew --no-daemon ":app:assemble${VARIANT}" 2>&1

echo ""
echo "=== Build complete! APK: ==="
find app/build/outputs/apk -name "*.apk" 2>/dev/null | while read -r apk; do
  size=$(du -sh "$apk" 2>/dev/null | cut -f1)
  echo "  $apk  ($size)"
done
