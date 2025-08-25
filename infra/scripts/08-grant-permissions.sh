#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Grant the "Artifact Registry Writer" role to the Cloud Build service account
echo "Granting Artifact Registry Writer role to the Cloud Build service account..."
gcloud projects add-iam-policy-binding day-planner-london-mvp \
    --member="serviceAccount:612990030705@cloudbuild.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"