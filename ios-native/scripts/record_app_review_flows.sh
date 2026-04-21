#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_PATH="$ROOT_DIR/PlanYourPerfectDay.xcodeproj"
SCHEME="PlanYourPerfectDay"
BUNDLE_ID="com.londonplanner.app"
DERIVED_DATA_PATH="$ROOT_DIR/.build-recordings"
OUTPUT_DIR="${1:-$ROOT_DIR/artifacts/review-recordings}"

IPHONE_NAME="${IPHONE_NAME:-iPhone 17 Pro Max}"
IPAD_NAME="${IPAD_NAME:-iPad Air 11-inch (M3)}"
PREFERRED_RUNTIME="${PREFERRED_RUNTIME:-iOS 26.2}"
NORMAL_DURATION_SECONDS="${NORMAL_DURATION_SECONDS:-18}"
RECOVERY_DURATION_SECONDS="${RECOVERY_DURATION_SECONDS:-24}"

APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphonesimulator/PlanYourPerfectDay.app"

info() {
  echo "[record] $*"
}

run_with_timeout() {
  local timeout_seconds="$1"
  shift

  "$@" &
  local cmd_pid=$!
  local elapsed=0

  while kill -0 "$cmd_pid" >/dev/null 2>&1; do
    if (( elapsed >= timeout_seconds )); then
      kill -TERM "$cmd_pid" >/dev/null 2>&1 || true
      sleep 1
      kill -KILL "$cmd_pid" >/dev/null 2>&1 || true
      wait "$cmd_pid" >/dev/null 2>&1 || true
      return 124
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  wait "$cmd_pid"
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    exit 1
  fi
}

resolve_udid() {
  local device_name="$1"
  local preferred_runtime="$2"
  local line

  line="$(xcrun simctl list devices available | awk -v runtime="$preferred_runtime" -v name="$device_name" '
    /^-- / {
      section = $0
      sub(/^-- /, "", section)
      sub(/ --$/, "", section)
      next
    }
    section == runtime && index($0, name " (") {
      print
      exit
    }
  ')"

  if [[ -z "$line" ]]; then
    line="$(xcrun simctl list devices available | grep -F "$device_name (" | head -n1 || true)"
  fi

  if [[ -z "$line" ]]; then
    echo "Unable to find available simulator device: $device_name" >&2
    exit 1
  fi
  echo "$line" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/'
}

boot_device() {
  local udid="$1"
  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$udid" -b
}

build_app_for_udid() {
  local udid="$1"
  info "Building app for simulator $udid"
  xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme "$SCHEME" \
    -configuration Debug \
    -destination "id=$udid" \
    -derivedDataPath "$DERIVED_DATA_PATH" \
    build >/tmp/record_build_"$udid".log
}

install_app() {
  local udid="$1"
  info "Preparing install on $udid"
  run_with_timeout 45 xcrun simctl uninstall "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
  if ! run_with_timeout 180 xcrun simctl install "$udid" "$APP_PATH"; then
    echo "Failed to install app on simulator $udid" >&2
    exit 1
  fi
}

record_flow() {
  local udid="$1"
  local output_file="$2"
  local duration_seconds="$3"
  shift 3
  local launch_args=("$@")

  rm -f "$output_file"
  info "Preparing app launch for $(basename "$output_file")"
  run_with_timeout 10 xcrun simctl terminate "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
  sleep 1

  info "Recording: $(basename "$output_file")"
  xcrun simctl io "$udid" recordVideo --codec=h264 "$output_file" >/tmp/record_video_"$udid".log 2>&1 &
  local recorder_pid=$!

  sleep 1
  if ! run_with_timeout 45 xcrun simctl launch "$udid" "$BUNDLE_ID" "${launch_args[@]}" >/tmp/record_launch_"$udid".log; then
    echo "Failed to launch app for recording on simulator $udid" >&2
    exit 1
  fi

  sleep "$duration_seconds"
  kill -INT "$recorder_pid" >/dev/null 2>&1 || true
  wait "$recorder_pid" >/dev/null 2>&1 || true
  run_with_timeout 10 xcrun simctl terminate "$udid" "$BUNDLE_ID" >/dev/null 2>&1 || true
}

record_device_flows() {
  local device_label="$1"
  local udid="$2"

  local safe_label
  safe_label="$(echo "$device_label" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd 'a-z0-9_')"

  record_flow "$udid" "$OUTPUT_DIR/${safe_label}_paywall_normal.mp4" "$NORMAL_DURATION_SECONDS" \
    --record-open-subscription

  record_flow "$udid" "$OUTPUT_DIR/${safe_label}_paywall_failure_recovery.mp4" "$RECOVERY_DURATION_SECONDS" \
    --record-open-subscription \
    --simulate-iap-load-failure-once \
    --record-auto-retry
}

main() {
  require_command xcrun
  require_command xcodebuild

  mkdir -p "$OUTPUT_DIR"
  mkdir -p "$DERIVED_DATA_PATH"

  local iphone_udid
  local ipad_udid
  iphone_udid="$(resolve_udid "$IPHONE_NAME" "$PREFERRED_RUNTIME")"
  ipad_udid="$(resolve_udid "$IPAD_NAME" "$PREFERRED_RUNTIME")"

  info "Resolved $IPHONE_NAME ($PREFERRED_RUNTIME preferred) -> $iphone_udid"
  info "Resolved $IPAD_NAME ($PREFERRED_RUNTIME preferred) -> $ipad_udid"

  boot_device "$iphone_udid"
  boot_device "$ipad_udid"

  open -a Simulator >/dev/null 2>&1 || true

  build_app_for_udid "$iphone_udid"
  install_app "$iphone_udid"
  install_app "$ipad_udid"

  record_device_flows "$IPHONE_NAME" "$iphone_udid"
  record_device_flows "$IPAD_NAME" "$ipad_udid"

  info "Finished recordings in: $OUTPUT_DIR"
  ls -lh "$OUTPUT_DIR"
}

main "$@"
