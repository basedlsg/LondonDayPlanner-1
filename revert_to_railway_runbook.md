# Runbook: Reverting to the Last Working Railway Deployment

This runbook provides instructions for reverting the project to the last known working Railway deployment configuration.

## Prerequisites

- Git must be installed and configured in your local environment.
- You must have shell access to the project's root directory.

## Steps

1. **Execute the Revert Script**:
   - Open a terminal in the project's root directory.
   - Run the following command to execute the revert script:
     ```bash
     bash revert_to_railway.sh
     ```

2. **Verify the Changes**:
   - After the script completes, you will be on a new branch named `revert-to-railway`.
   - This branch contains the version of the codebase that was last successfully deployed to Railway.

3. **Deploy to Railway**:
   - With the `revert-to-railway` branch checked out, you can now proceed with a standard Railway deployment.
   - Follow the instructions in `RAILWAY_DEPLOY_INSTRUCTIONS.md` to deploy the application.

## What the Script Does

- **Stashes Uncommitted Changes**: The script begins by stashing any uncommitted changes in your current working directory to prevent data loss.
- **Checks Out the Railway Commit**: It then checks out commit `2108985`, which is the last known stable version for Railway deployment.
- **Creates a New Branch**: A new branch, `revert-to-railway`, is created from this commit, allowing you to work with the reverted codebase without affecting other branches.