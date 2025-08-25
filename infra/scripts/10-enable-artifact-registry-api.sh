#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Enable the Artifact Registry API
echo "Enabling the Artifact Registry API..."
gcloud services enable artifactregistry.googleapis.com --project day-planner-london-mvp