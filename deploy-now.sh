#!/bin/bash

set -e

PROJECT_ID=${PROJECT_ID:-day-planner-london-mvp}

echo "🚀 Deploy Now — selecting best available method"

# Ensure build output exists
if [ ! -d "dist/public" ]; then
  echo "📦 Building project..."
  npm run build
fi

if [ -n "$FIREBASE_TOKEN" ]; then
  echo "🔑 Using FIREBASE_TOKEN with Firebase CLI"
  firebase deploy --non-interactive --project "$PROJECT_ID" --token "$FIREBASE_TOKEN"
  exit $?
fi

if command -v gcloud >/dev/null 2>&1; then
  if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "☁️  Using gcloud + Firebase Hosting REST API"
    bash ./deploy-hosting-rest.sh
    exit $?
  else
    echo "⚠️  gcloud installed but not authenticated. Run: gcloud auth login"
  fi
fi

echo "❌ No non-interactive method available. Options:"
echo "  1) Generate a CI token: 'firebase login:ci' on any machine, then set FIREBASE_TOKEN and retry."
echo "  2) Use GitHub Actions by setting FIREBASE_SERVICE_ACCOUNT secret, then push to main."
echo "  3) Re-auth with device flow: firebase login --reauth --no-localhost"
exit 1
