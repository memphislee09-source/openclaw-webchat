#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

export HOME="${HOME:-$(cd ~ && pwd)}"
export PATH="${PATH:-/usr/bin:/bin}"

for EXTRA_PATH in \
  "$HOME/.local/bin" \
  "$HOME/.npm-global/bin" \
  "$HOME/bin" \
  "$HOME/.volta/bin" \
  "$HOME/.asdf/shims" \
  "$HOME/.bun/bin" \
  "$HOME/Library/Application Support/fnm/aliases/default/bin" \
  "$HOME/.fnm/aliases/default/bin" \
  "$HOME/Library/pnpm" \
  "$HOME/.local/share/pnpm" \
  "/opt/homebrew/bin" \
  "/usr/local/bin"
do
  if [[ -d "$EXTRA_PATH" ]]; then
    export PATH="$EXTRA_PATH:$PATH"
  fi
done

export NODE_USE_SYSTEM_CA="${NODE_USE_SYSTEM_CA:-1}"
if [[ -f /etc/ssl/cert.pem ]]; then
  export NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-/etc/ssl/cert.pem}"
fi

if [[ -z "${OPENCLAW_BIN:-}" ]] && command -v openclaw >/dev/null 2>&1; then
  export OPENCLAW_BIN="$(command -v openclaw)"
fi

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [[ -z "$NODE_BIN" ]]; then
  echo "openclaw-webchat: node was not found on PATH" >&2
  exit 1
fi

mkdir -p "${OPENCLAW_WEBCHAT_LOG_DIR:-$HOME/.openclaw/logs}"
cd "$PROJECT_DIR"

exec "$NODE_BIN" "$PROJECT_DIR/src/server.js"
