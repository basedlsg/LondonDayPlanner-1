#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Enable the Cloud Build API
echo "Enabling the Cloud Build API..."
gcloud services enable cloudbuild.googleapis.com --project day-planner-london-mvp