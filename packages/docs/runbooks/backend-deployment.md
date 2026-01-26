# Runbook: Backend Deployment

This runbook outlines the process for deploying the backend server to Google Cloud Run.

## Prerequisites

*   Google Cloud SDK (`gcloud`) installed and authenticated.
*   A Google Cloud project with Cloud Build and Cloud Run APIs enabled.
*   Permissions to push to Google Container Registry and deploy to Cloud Run.

## Deployment Steps

1.  **Navigate to the project root directory.**
2.  **Run the deployment script:**

    ```bash
    ./infra/scripts/deploy-backend.sh
    ```

3.  **Monitor the build and deployment process in the Google Cloud Console.**

## Rollback

In case of a deployment failure, you can roll back to a previous version of the service in the Google Cloud Run console.