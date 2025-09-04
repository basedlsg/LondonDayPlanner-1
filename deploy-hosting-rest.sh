#!/bin/bash

set -euo pipefail

PROJECT_ID=${PROJECT_ID:-day-planner-london-mvp}
SITE_ID=${SITE_ID:-day-planner-london-mvp}
PUBLIC_DIR=${PUBLIC_DIR:-dist/public}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

say_ok()    { echo -e "${GREEN}✅ $1${NC}"; }
say_warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
say_err()   { echo -e "${RED}❌ $1${NC}"; }

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

echo "🔥 Firebase Hosting REST deploy (via gcloud token)"

if [ ! -d "$PUBLIC_DIR" ]; then
  say_warn "Build directory not found. Building project..."
  npm run build
fi

if ! command -v gcloud >/dev/null 2>&1; then
  say_err "gcloud is required. Install from https://cloud.google.com/sdk"
  exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q .; then
  say_err "Not authenticated with gcloud. Run: gcloud auth login && gcloud config set project $PROJECT_ID"
  exit 1
fi

say_ok "Using project: $PROJECT_ID (site: $SITE_ID)"
gcloud config set project "$PROJECT_ID" >/dev/null

say_ok "Ensuring Firebase Hosting API is enabled"
gcloud services enable firebasehosting.googleapis.com >/dev/null 2>&1 || true

ACCESS_TOKEN=$(gcloud auth print-access-token)
if [ -z "$ACCESS_TOKEN" ]; then
  say_err "Failed to obtain access token"
  exit 1
fi

say_ok "Assuming Hosting site exists: $SITE_ID (skipping site check)"

# Create new version
say_ok "Creating version"
VERSION_JSON=$(curl -sS --connect-timeout 15 --max-time 120 --retry 3 --retry-all-errors \
  -X POST -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"CREATED"}' \
  "https://firebasehosting.googleapis.com/v1/sites/$SITE_ID/versions")

VERSION_NAME=$(node -e "const r=JSON.parse(process.argv[1]);if(!r.name)process.exit(2);console.log(r.name)" "$VERSION_JSON") || { say_err "Failed to parse version: $VERSION_JSON"; exit 1; }
VERSION_ID=${VERSION_NAME##*/}
say_ok "Version: $VERSION_ID"

# Build manifest lines: path|hash
TMP_MANIFEST=$(mktemp)
FILES_COUNT=0
while IFS= read -r -d '' file; do
  rel="${file#${PUBLIC_DIR}/}"
  hash=$(hash_file "$file")
  printf "%s|%s\n" "/$rel" "$hash" >> "$TMP_MANIFEST"
  FILES_COUNT=$((FILES_COUNT+1))
done < <(find "$PUBLIC_DIR" -type f -print0)

say_ok "Prepared $FILES_COUNT files"

# Create JSON body for populateFiles using Node (avoids jq dependency)
POPULATE_REQ=$(node <<'NODE'
const fs = require('fs');
const lines = fs.readFileSync(process.env.MANIFEST, 'utf8').trim().split('\n').filter(Boolean);
const files = {};
for (const line of lines) {
  const [path, hash] = line.split('|');
  files[path] = hash;
}
process.stdout.write(JSON.stringify({ files }));
NODE
)

export MANIFEST="$TMP_MANIFEST"

say_ok "Populate files"
POPULATE_JSON=$(curl -sS --connect-timeout 15 --max-time 300 --retry 3 --retry-all-errors \
  -X POST -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$POPULATE_REQ" \
  "https://firebasehosting.googleapis.com/v1/sites/$SITE_ID/versions/$VERSION_ID:populateFiles")

# Parse uploadUrl and uploadRequiredHashes
UPLOAD_URL=$(node -e "const r=JSON.parse(process.argv[1]);if(!r.uploadUrl)process.exit(2);console.log(r.uploadUrl)" "$POPULATE_JSON") || { say_err "Failed to parse populateFiles: $POPULATE_JSON"; exit 1; }
REQUIRED_HASHES=$(node -e "const r=JSON.parse(process.argv[1]);console.log((r.uploadRequiredHashes||[]).join('\n'))" "$POPULATE_JSON")

REQ_COUNT=$(echo "$REQUIRED_HASHES" | grep -c . || true)
say_ok "Files to upload by hash: $REQ_COUNT"

# Map hash -> file path for upload (first occurrence is fine)
declare -A HASH_TO_FILE
while IFS= read -r line; do
  [ -z "$line" ] && continue
  p=${line%%|*}
  h=${line##*|}
  if [ -z "${HASH_TO_FILE[$h]:-}" ]; then
    # Resolve absolute path from public dir and relative path (strip leading /)
    f="$PUBLIC_DIR/${p#/}"
    HASH_TO_FILE[$h]="$f"
  fi
done < "$TMP_MANIFEST"

# Upload required hashes
UPLOADED=0
while IFS= read -r h; do
  [ -z "$h" ] && continue
  f="${HASH_TO_FILE[$h]:-}"
  if [ -z "$f" ] || [ ! -f "$f" ]; then
    say_warn "Missing file for hash $h; skipping"
    continue
  fi
  echo "   Uploading: $f"
  curl -sS --connect-timeout 15 --max-time 300 --retry 3 --retry-all-errors -X PUT -H "Content-Type: application/octet-stream" \
    --data-binary "@$f" \
    "$UPLOAD_URL/$h" >/dev/null
  UPLOADED=$((UPLOADED+1))
done <<< "$REQUIRED_HASHES"

say_ok "Uploaded $UPLOADED blobs"

# Finalize version
say_ok "Finalizing version"
FINALIZE=$(curl -sS --connect-timeout 15 --max-time 120 --retry 3 --retry-all-errors \
  -X PATCH -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"FINALIZED"}' \
  "https://firebasehosting.googleapis.com/v1/sites/$SITE_ID/versions/$VERSION_ID")
echo "$FINALIZE" | grep -q '"status": "FINALIZED"' || say_warn "Finalize response: $FINALIZE"

# Release version
say_ok "Releasing version"
RELEASE=$(curl -sS --connect-timeout 15 --max-time 120 --retry 3 --retry-all-errors \
  -X POST -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"versionName\":\"sites/$SITE_ID/versions/$VERSION_ID\"}" \
  "https://firebasehosting.googleapis.com/v1/sites/$SITE_ID/releases")
echo "$RELEASE" | grep -q '"type": "DEPLOY"' || say_warn "Release response: $RELEASE"

say_ok "Deployment complete"
echo "🌐 https://$SITE_ID.web.app"
