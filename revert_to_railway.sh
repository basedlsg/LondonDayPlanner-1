#!/bin/bash
# This script reverts the project to the last known working Railway deployment.

# The commit hash of the last working Railway deployment
RAILWAY_COMMIT="2108985"

# Stash any uncommitted changes
git stash

# Create a new branch from the specified commit
git checkout -b revert-to-railway $RAILWAY_COMMIT

echo "Successfully reverted to Railway deployment configuration."
echo "You are now on the 'revert-to-railway' branch."
# Trigger new deployment