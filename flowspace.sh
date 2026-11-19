#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 未在 PATH 中找到 node，请先安装 Node.js >= 24.9.0。" >&2
  exit 1
fi

exec node "$SCRIPT_DIR/scripts/launcher.mjs" "$@"
