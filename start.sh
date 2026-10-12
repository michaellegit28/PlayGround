#!/usr/bin/env bash
set -euo pipefail
time -p cd "$(dirname "$0")"
time -p pwd
PORT="${PORT:-3000}"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
time -p mkdir -p "$OPENCODE_WEB_DIR"
time -p mkdir -p dist
if time -p test -f package.json; then
  if time -p test -f package-lock.json; then
    time -p npm ci --no-audit --no-fund
  else
    time -p npm install --no-audit --no-fund
  fi
  if time -p npm run --silent build --if-present; then
    :
  fi
fi
if ! time -p test -f dist/index.html; then
  echo "dist/index.html missing and no build produced it" >&2
  exit 1
fi
PROJECT_ROOT="$(pwd)"
time -p bash -c 'echo "$0"' "$PROJECT_ROOT"
DIR_ABS="$PROJECT_ROOT/dist"
time -p bash -c 'printf "{\"project\": \"%s\", \"directory\": \"%s\"}\n" "$0" "$1" > "$2"' "$PROJECT_ROOT" "$DIR_ABS" "$OPENCODE_WEB_DIR/deployment-output.json"
time -p cat "$OPENCODE_WEB_DIR/deployment-output.json"
echo "Serving $DIR_ABS on port $PORT"
exec /usr/bin/time -p python3 -m http.server "$PORT" --directory dist --bind 0.0.0.0
