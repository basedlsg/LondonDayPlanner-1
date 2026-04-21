#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRECHECK_SCRIPT="$ROOT_DIR/scripts/preflight_app_review.sh"

required_asc_flags=(
  "ASC_BUILD_SELECTED_FOR_VERSION"
  "ASC_IAPS_ATTACHED_TO_EXACT_BINARY"
  "ASC_SUBSCRIPTIONS_ATTACHED_TO_VERSION"
  "ASC_IAP_REVIEW_SCREENSHOTS_PRESENT"
  "ASC_PRODUCTS_CLEARED_FOR_SALE"
  "ASC_PAID_APPS_ACTIVE"
  "ASC_TERMS_LINK_IN_METADATA"
  "ASC_PRIVACY_POLICY_FIELD_VALID"
)

log() {
  echo "[release-gate] $*"
}

pass() {
  echo "[release-gate] PASS: $*"
}

fail() {
  echo "[release-gate] FAIL: $*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "Missing required file: $path"
}

latest_archive_path() {
  local archive

  archive="$(ls -1dt "$ROOT_DIR"/build/archives/*.xcarchive 2>/dev/null | head -n 1 || true)"
  if [[ -n "$archive" ]]; then
    echo "$archive"
    return 0
  fi

  archive="$(ls -1dt "$ROOT_DIR"/build/*.xcarchive 2>/dev/null | head -n 1 || true)"
  if [[ -n "$archive" ]]; then
    echo "$archive"
    return 0
  fi

  archive="$(ls -1dt "$ROOT_DIR"/*.xcarchive 2>/dev/null | head -n 1 || true)"
  if [[ -n "$archive" ]]; then
    echo "$archive"
    return 0
  fi

  return 1
}

check_latest_archive_device_family() {
  local archive="$1"
  local plist="$archive/Products/Applications/PlanYourPerfectDay.app/Info.plist"

  require_file "$plist"

  local families_raw
  families_raw="$(/usr/libexec/PlistBuddy -c 'Print :UIDeviceFamily' "$plist" 2>/dev/null || true)"
  [[ -n "$families_raw" ]] || fail "Unable to read UIDeviceFamily from archive: $plist"

  local compact
  compact="$(echo "$families_raw" | tr -d '[:space:]')"

  if [[ "$compact" != "Array{1}" ]]; then
    fail "Latest archive is not iPhone-only. UIDeviceFamily=$families_raw"
  fi

  pass "Latest archive is iPhone-only (UIDeviceFamily = [1])."
}

check_latest_archive_metadata() {
  local archive="$1"
  local archive_info="$archive/Info.plist"
  local app_info="$archive/Products/Applications/PlanYourPerfectDay.app/Info.plist"

  require_file "$archive_info"
  require_file "$app_info"

  local bundle_id
  local build
  local version
  local created

  bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_info" 2>/dev/null || true)"
  build="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$app_info" 2>/dev/null || true)"
  version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app_info" 2>/dev/null || true)"
  created="$(/usr/libexec/PlistBuddy -c 'Print :CreationDate' "$archive_info" 2>/dev/null || true)"

  [[ -n "$bundle_id" ]] || fail "Missing CFBundleIdentifier in archive app Info.plist"
  [[ -n "$build" ]] || fail "Missing CFBundleVersion in archive app Info.plist"
  [[ -n "$version" ]] || fail "Missing CFBundleShortVersionString in archive app Info.plist"

  log "Archive selected: $archive"
  log "Bundle ID: $bundle_id"
  log "Version/Build: $version ($build)"
  [[ -n "$created" ]] && log "Archive created: $created"

  pass "Archive metadata is readable."
}

check_asc_confirmation_flags() {
  log "Checking required App Store Connect confirmation flags..."

  local missing=0
  for var_name in "${required_asc_flags[@]}"; do
    local value="${!var_name:-}"
    if [[ "$value" != "YES" ]]; then
      echo "[release-gate] MISSING: set $var_name=YES after manual confirmation in App Store Connect" >&2
      missing=1
    fi
  done

  if [[ "$missing" -ne 0 ]]; then
    fail "Manual App Store Connect confirmations are incomplete."
  fi

  pass "Manual App Store Connect confirmations provided."
}

main() {
  require_file "$PRECHECK_SCRIPT"

  log "Running preflight code checks..."
  "$PRECHECK_SCRIPT"

  local archive
  archive="$(latest_archive_path || true)"
  [[ -n "$archive" ]] || fail "No .xcarchive found. Build and archive first."

  check_latest_archive_metadata "$archive"
  check_latest_archive_device_family "$archive"
  check_asc_confirmation_flags

  pass "Release readiness gate passed."
}

main "$@"
