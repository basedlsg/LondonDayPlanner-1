#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Build the application
echo "Building the application..."
npm run build

# Install Firebase Functions dependencies
echo "Installing Firebase Functions dependencies..."
cd functions && npm install && cd ..

# Deploy to Firebase (both hosting and functions)
echo "Deploying to Firebase..."

# The script will automatically use the GOOGLE_APPLICATION_CREDENTIALS environment variable for authentication.
firebase deploy --project day-planner-london-mvp