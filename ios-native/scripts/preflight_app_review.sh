#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORE_MANAGER_FILE="$ROOT_DIR/Sources/Services/StoreManager.swift"
SUBSCRIPTION_VIEW_FILE="$ROOT_DIR/Sources/Views/SubscriptionView.swift"
SCHEME_FILE="$ROOT_DIR/PlanYourPerfectDay.xcodeproj/xcshareddata/xcschemes/PlanYourPerfectDay.xcscheme"
STOREKIT_CONFIG_FILE="$ROOT_DIR/PlanYourPerfectDay.storekit"

EXPECTED_PRODUCT_IDS=(
  "com.londonplanner.premium.monthly"
  "com.londonplanner.premium.annual"
)

TERMS_URL="https://www.planyourperfectday.app/terms"
PRIVACY_URL="https://www.planyourperfectday.app/privacy"

log() {
  echo "[preflight] $*"
}

pass() {
  echo "[preflight] PASS: $*"
}

fail() {
  echo "[preflight] FAIL: $*" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "Missing required file: $path"
}

check_product_ids() {
  log "Checking StoreKit product IDs in source..."

  for product_id in "${EXPECTED_PRODUCT_IDS[@]}"; do
    rg -F "\"$product_id\"" "$STORE_MANAGER_FILE" >/dev/null || fail "Product ID not found in StoreManager: $product_id"
  done

  local found_ids
  found_ids="$(rg -o "com\\.londonplanner\\.premium\\.[a-z]+" "$STORE_MANAGER_FILE" | sort -u || true)"
  [[ -n "$found_ids" ]] || fail "No product IDs found in StoreManager."

  while IFS= read -r found_id; do
    [[ -z "$found_id" ]] && continue

    local known=false
    for expected_id in "${EXPECTED_PRODUCT_IDS[@]}"; do
      if [[ "$found_id" == "$expected_id" ]]; then
        known=true
        break
      fi
    done

    if [[ "$known" == false ]]; then
      fail "Unexpected subscription product ID found: $found_id"
    fi
  done <<< "$found_ids"

  pass "Product IDs are present and match expected values."

  if [[ -f "$STOREKIT_CONFIG_FILE" ]]; then
    log "Checking product IDs in StoreKit configuration file..."
    for product_id in "${EXPECTED_PRODUCT_IDS[@]}"; do
      rg -F "\"$product_id\"" "$STOREKIT_CONFIG_FILE" >/dev/null || fail "Product ID missing from StoreKit config: $product_id"
    done
    pass "StoreKit configuration includes expected product IDs."
  fi
}

check_url_http_200() {
  local url="$1"
  local label="$2"

  log "Checking $label URL: $url"

  local code
  code="$(curl -L --max-redirs 10 --connect-timeout 15 --silent --show-error --output /dev/null --write-out "%{http_code}" "$url")" || fail "$label URL request failed: $url"

  if [[ "$code" != "200" ]]; then
    fail "$label URL did not return HTTP 200 (got $code): $url"
  fi

  pass "$label URL returned HTTP 200."
}

check_release_archive_configuration() {
  log "Checking scheme ArchiveAction build configuration..."

  local archive_config
  archive_config="$(
    tr '\n' ' ' < "$SCHEME_FILE" | sed -n 's/.*<ArchiveAction[^>]*buildConfiguration = "\([^"]*\)".*/\1/p'
  )"

  [[ -n "$archive_config" ]] || fail "Unable to read ArchiveAction build configuration in scheme file."
  [[ "$archive_config" == "Release" ]] || fail "ArchiveAction must use Release configuration (found: $archive_config)."

  pass "ArchiveAction uses Release configuration."
}

check_mock_mode_not_defaulted() {
  log "Checking mock StoreKit path is opt-in only..."

  if rg -n "#if[[:space:]]+targetEnvironment\\(simulator\\)[[:space:]]*\\|\\|[[:space:]]*DEBUG" "$STORE_MANAGER_FILE" >/dev/null; then
    fail "Found simulator/DEBUG force-mock branch in StoreManager."
  fi

  rg -F -- "--use-mock-iap" "$STORE_MANAGER_FILE" >/dev/null || fail "Explicit mock launch argument gate '--use-mock-iap' is missing."

  pass "Mock StoreKit mode is opt-in only."
}

check_paywall_default_selection_codepath() {
  log "Checking paywall non-blocking path and deterministic load hooks..."

  rg -F "await loadPaywall(force: true)" "$SUBSCRIPTION_VIEW_FILE" >/dev/null || fail "SubscriptionView does not force-load paywall on open."
  rg -F "selectedOption = store.defaultSelectableOption" "$SUBSCRIPTION_VIEW_FILE" >/dev/null || fail "SubscriptionView does not apply fallback default selection."
  rg -F "subscription.continueFree" "$SUBSCRIPTION_VIEW_FILE" >/dev/null || fail "SubscriptionView is missing an explicit Continue with Free path."
  rg -F "annualOption ?? monthlyOption ?? options.first" "$STORE_MANAGER_FILE" >/dev/null || fail "StoreManager default selection fallback chain is missing."
  rg -F "stagedRetryDelaysNanoseconds: [UInt64] = [0, 1_500_000_000, 3_000_000_000, 6_000_000_000]" "$STORE_MANAGER_FILE" >/dev/null || fail "StoreManager staged retry schedule is not set to 0/1.5/3/6 seconds."

  pass "Paywall non-blocking + default selection codepaths are present."
}

resolve_simulator_name() {
  local requested_name="${SIMULATOR_NAME:-iPhone 17 Pro Max}"

  if xcrun simctl list devices available | rg -F "$requested_name" >/dev/null; then
    echo "$requested_name"
    return 0
  fi

  local fallback_name
  fallback_name="$(xcrun simctl list devices available | rg -o "iPhone[^\(]+" | sed 's/[[:space:]]*$//' | head -n 1)"
  [[ -n "$fallback_name" ]] || fail "No available iPhone simulator found. Set SIMULATOR_NAME explicitly."

  log "Requested simulator '$requested_name' unavailable. Falling back to '$fallback_name'."
  echo "$fallback_name"
}

run_storemanager_tests() {
  local simulator_name
  simulator_name="$(resolve_simulator_name)"

  log "Running targeted StoreManager tests on simulator: $simulator_name"

  xcodebuild test \
    -workspace "$ROOT_DIR/.swiftpm/xcode/package.xcworkspace" \
    -scheme PlanYourPerfectDay \
    -destination "platform=iOS Simulator,name=$simulator_name" \
    -only-testing:PlanYourPerfectDayTests/StoreManagerTests/testProductLoadSuccessOnFirstAttempt \
    -only-testing:PlanYourPerfectDayTests/StoreManagerTests/testTransientFailureRecoversWithinRetryWindow \
    -only-testing:PlanYourPerfectDayTests/StoreManagerTests/testEmptyProductResponseRetriesThenDegradesWithoutUserFacingError \
    -only-testing:PlanYourPerfectDayTests/StoreManagerTests/testNoUserFacingErrorBeforeLoadingWindowExpires \
    -only-testing:PlanYourPerfectDayTests/StoreManagerTests/testBackgroundRecoveryContinuesAfterDegradedState

  pass "Targeted StoreManager tests passed."
}

main() {
  require_file "$STORE_MANAGER_FILE"
  require_file "$SUBSCRIPTION_VIEW_FILE"
  require_file "$SCHEME_FILE"

  check_product_ids
  check_url_http_200 "$TERMS_URL" "Terms"
  check_url_http_200 "$PRIVACY_URL" "Privacy"
  check_release_archive_configuration
  check_mock_mode_not_defaulted
  check_paywall_default_selection_codepath
  run_storemanager_tests

  pass "App Review preflight completed successfully."
  log "Manual metadata checks still required in App Store Connect:"
  log "- EULA link in App Description or EULA field"
  log "- Privacy Policy field populated"
  log "- Subscription IAPs attached to the app version"
}

main "$@"
