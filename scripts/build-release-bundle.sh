#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
TMP_DIR="$(mktemp -d)"
VERSION="$(cd "$ROOT_DIR" && node -p "require('./package.json').version")"
BUNDLE_NAME="claw-webchat-v${VERSION}-bundle"
ARCHIVE_ROOT="claw-webchat"
STAGE_DIR="$TMP_DIR/$ARCHIVE_ROOT"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

mkdir -p "$DIST_DIR" "$STAGE_DIR"

copy_path() {
  local source="$1"
  if [ -e "$ROOT_DIR/$source" ]; then
    cp -R "$ROOT_DIR/$source" "$STAGE_DIR/$source"
  fi
}

mkdir -p "$STAGE_DIR"

copy_path CHANGELOG.md
copy_path CONTRIBUTING.md
copy_path LICENSE
copy_path README.md
copy_path SECURITY.md
copy_path docs
copy_path package-lock.json
copy_path package.json
copy_path public
copy_path scripts
copy_path src

find "$STAGE_DIR" -name ".DS_Store" -delete
find "$STAGE_DIR" -name "node_modules" -prune -exec rm -rf {} +
find "$STAGE_DIR" -name "data" -prune -exec rm -rf {} +
rm -rf "$DIST_DIR/$BUNDLE_NAME.tar.gz" "$DIST_DIR/$BUNDLE_NAME.sha256"

tar -czf "$DIST_DIR/$BUNDLE_NAME.tar.gz" -C "$TMP_DIR" "$ARCHIVE_ROOT"

if command -v shasum >/dev/null 2>&1; then
  (cd "$DIST_DIR" && shasum -a 256 "$BUNDLE_NAME.tar.gz" > "$BUNDLE_NAME.sha256")
elif command -v sha256sum >/dev/null 2>&1; then
  (cd "$DIST_DIR" && sha256sum "$BUNDLE_NAME.tar.gz" > "$BUNDLE_NAME.sha256")
else
  echo "warning: neither shasum nor sha256sum is available; checksum file not created" >&2
fi

echo "Bundle created:"
echo "  $DIST_DIR/$BUNDLE_NAME.tar.gz"
if [ -f "$DIST_DIR/$BUNDLE_NAME.sha256" ]; then
  echo "Checksum created:"
  echo "  $DIST_DIR/$BUNDLE_NAME.sha256"
fi
