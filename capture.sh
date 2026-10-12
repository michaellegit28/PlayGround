#!/usr/bin/env bash
set -euo pipefail
time -p cd "$(dirname "$0")"
if time -p test -z "${CAPTURE_URL:-}"; then
  echo "CAPTURE_URL is required" >&2
  exit 1
fi
if time -p test -z "${CAPTURE_DIR:-}"; then
  echo "CAPTURE_DIR is required" >&2
  exit 1
fi
time -p mkdir -p "$CAPTURE_DIR"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
echo "Capturing $CAPTURE_URL into $CAPTURE_DIR (runtime: $RUNTIME_DIR)"
set +e
time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
status=$?
set -e
if time -p test "$status" -eq 75; then
  echo "Transient navigation/browser infrastructure failure (exit 75)" >&2
  exit 75
fi
if time -p test "$status" -ne 0; then
  echo "Capture script failed with status $status" >&2
  exit 1
fi
if ! time -p test -f "$CAPTURE_DIR/final-desktop.png"; then
  echo "Missing $CAPTURE_DIR/final-desktop.png (rendering defect)" >&2
  exit 1
fi
if ! time -p test -f "$CAPTURE_DIR/final-mobile.png"; then
  echo "Missing $CAPTURE_DIR/final-mobile.png (rendering defect)" >&2
  exit 1
fi
if ! time -p test -s "$CAPTURE_DIR/final-desktop.png"; then
  echo "Empty desktop screenshot (rendering defect)" >&2
  exit 1
fi
if ! time -p test -s "$CAPTURE_DIR/final-mobile.png"; then
  echo "Empty mobile screenshot (rendering defect)" >&2
  exit 1
fi
time -p ls -l "$CAPTURE_DIR/final-desktop.png" "$CAPTURE_DIR/final-mobile.png"
echo "Capture complete. App left running."
