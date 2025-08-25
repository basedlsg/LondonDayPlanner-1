#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Create a Firebase Hosting site
echo "Creating a Firebase Hosting site..."
firebase hosting:sites:create day-planner-london-mvp --project day-planner-london-mvp