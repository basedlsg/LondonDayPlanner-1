#!/bin/bash

# This script submits the Cloud Build configuration to Google Cloud Build.
# The build process will build the server application, create a Docker image,
# and deploy it to Google Cloud Run.

# Ensure you have the Google Cloud SDK installed and configured.
# You can find instructions here: https://cloud.google.com/sdk/docs/install

# Set your Google Cloud Project ID
export PROJECT_ID="day-planner-london-mvp"

if [ -z "$PROJECT_ID" ]
then
  echo "Please set the PROJECT_ID environment variable."
  exit 1
fi

gcloud builds submit --config cloudbuild-server.yaml .