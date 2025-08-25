#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Create a Docker repository in the Artifact Registry
echo "Creating a Docker repository in the Artifact Registry..."
gcloud artifacts repositories create gcr.io \
    --repository-format=docker \
    --location=us \
    --description="Default Docker repository" \
    --project=day-planner-london-mvp