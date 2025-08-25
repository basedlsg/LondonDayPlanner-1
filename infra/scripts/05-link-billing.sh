#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Link the billing account to the project
echo "Linking billing account to project..."
gcloud billing projects link day-planner-london-mvp --billing-account 01EAD1-E2DF86-D70D0D