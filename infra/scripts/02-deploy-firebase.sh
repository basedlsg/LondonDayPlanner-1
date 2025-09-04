#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Build the application
echo "Building the application..."
npm run build

# Install Firebase Functions dependencies (if present)
if [ -d "functions" ]; then
  echo "Installing Firebase Functions dependencies..."
  (cd functions && npm install)
fi

# Deploy to Firebase
echo "Deploying to Firebase..."

PROJECT_ID=${PROJECT_ID:-day-planner-london-mvp}

if [ -n "$FIREBASE_TOKEN" ]; then
  echo "Using FIREBASE_TOKEN for non-interactive deploy"
  firebase deploy --non-interactive --project "$PROJECT_ID" --token "$FIREBASE_TOKEN"
else
  firebase deploy --project "$PROJECT_ID"
fi
