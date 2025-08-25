#!/bin/bash
#
# Initializes a new Git repository, creates an initial commit,
# and sets up the remote origin to push the code to GitHub.
#
# This script is intended to be run from the root of the project directory.

# Exit immediately if a command exits with a non-zero status.
set -e

# 1. Initialize the Git repository
if [ -d ".git" ]; then
  echo "Git repository already initialized."
else
  echo "Initializing Git repository..."
  git init
fi

# 2. Add all files to the staging area
echo "Adding all files to staging..."
git add .

# 3. Commit the files
# Check if there are any changes to commit
if git diff-index --quiet HEAD --; then
  echo "No changes to commit."
else
  echo "Creating initial commit..."
  git commit -m "Initial commit: Project setup"
fi

echo "Git repository is ready."
echo "Next steps:"
echo "1. Create a new repository on GitHub."
echo "2. Add the remote origin: git remote add origin <your-repo-url>"
echo "3. Push the code: git push -u origin main"
