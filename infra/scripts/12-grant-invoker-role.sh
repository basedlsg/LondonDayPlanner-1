#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Grant the "Cloud Run Invoker" role to allUsers to make the service public
echo "Granting Cloud Run Invoker role to allUsers..."
gcloud beta run services add-iam-policy-binding api \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region="us-central1" \
    --project="day-planner-london-mvp"