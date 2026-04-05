#!/bin/bash
set -e

# Ora iOS Build Script
# Run this on a Mac with Xcode installed.
#
# Requirements:
#   - macOS 13+ with Xcode 15+
#   - Homebrew: https://brew.sh
#
# Usage:
#   bash scripts/build-ora-ios.sh [simulator|device]
#
# For App Store / TestFlight:
#   1. Set your Apple Team ID in ios/project.yml (DEVELOPMENT_TEAM)
#   2. Run: bash scripts/build-ora-ios.sh device

TARGET="${1:-simulator}"
WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE/ios"

echo "=== Ora iOS Build ==="
echo "Target: $TARGET"

# ── 1. Install XcodeGen if needed ────────────────────────────────────────────
if ! command -v xcodegen &> /dev/null; then
  echo "Installing XcodeGen..."
  brew install xcodegen
fi

# ── 2. Generate Xcode project ────────────────────────────────────────────────
echo "Generating Ora.xcodeproj..."
xcodegen generate --spec project.yml
echo "Xcode project generated."

# ── 3. Build ─────────────────────────────────────────────────────────────────
if [ "$TARGET" = "simulator" ]; then
  echo "Building for simulator..."
  xcodebuild \
    -project Ora.xcodeproj \
    -scheme Ora \
    -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=latest' \
    -configuration Debug \
    build | xcpretty --color || true

  echo ""
  echo "Done! Open Ora.xcodeproj in Xcode to run on the simulator."

elif [ "$TARGET" = "device" ]; then
  echo "Building for device (requires signing)..."
  xcodebuild \
    -project Ora.xcodeproj \
    -scheme Ora \
    -destination 'generic/platform=iOS' \
    -configuration Release \
    archive \
    -archivePath build/Ora.xcarchive | xcpretty --color || true

  echo ""
  echo "Archive at: ios/build/Ora.xcarchive"
  echo "Open in Xcode Organizer to export for TestFlight or Ad Hoc."

else
  echo "Usage: $0 [simulator|device]"
  exit 1
fi

echo ""
echo "=== iOS Build complete ==="
