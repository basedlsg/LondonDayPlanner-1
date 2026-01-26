#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Submit the build to Google Cloud Build
gcloud builds submit --config cloudbuild.yaml .