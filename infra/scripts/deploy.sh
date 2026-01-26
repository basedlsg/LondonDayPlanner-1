#!/bin/bash
set -e

echo "Packaging source code..."
tar -czf source.tar.gz \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="*.log" \
  --exclude="*.pdf" \
  --exclude="attached_assets" \
  --exclude=".claude" \
  --exclude="e2e" \
  --exclude=".DS_Store" \
  --exclude="dist" \
  --exclude="source.tar.gz" \
  .

echo "Submitting build to Google Cloud..."
gcloud builds submit --config cloudbuild.yaml source.tar.gz