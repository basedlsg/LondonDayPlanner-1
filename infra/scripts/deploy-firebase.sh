#!/bin/bash
set -e

echo "Building the application..."
npm run build

echo "Deploying to Firebase..."
firebase deploy