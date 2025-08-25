#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Start the Cloud Build process
echo "Starting the Cloud Build process..."
gcloud builds submit --config cloudbuild.yaml .