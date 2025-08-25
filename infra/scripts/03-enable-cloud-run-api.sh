#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Enable the Cloud Run Admin API
echo "Enabling the Cloud Run Admin API..."
gcloud services enable run.googleapis.com --project day-planner-london-mvp