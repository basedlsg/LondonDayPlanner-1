# Deploying the API Service

This runbook provides instructions for deploying the API service to Google Cloud Run using the new build and deployment pipeline.

## Prerequisites

*   A Google Cloud project with the Cloud Build and Cloud Run APIs enabled.
*   The `gcloud` command-line tool installed and configured.
*   The project source code cloned to your local machine.

## Deployment Steps

1.  **Navigate to the project root directory:**

    ```bash
    cd /path/to/your/project
    ```

2.  **Submit the build to Google Cloud Build:**

    ```bash
    gcloud builds submit --config cloudbuild-api.yaml .
    ```

    This command will trigger a new build in Cloud Build, which will:

    *   Build the Docker image using the `Dockerfile.api` file.
    *   Push the Docker image to Google Container Registry.
    *   Deploy the Docker image to Google Cloud Run.

3.  **Verify the deployment:**

    Once the build is complete, you can verify the deployment by navigating to the Cloud Run section of the Google Cloud Console. You should see a new service named `london-day-planner-api` running.

## Troubleshooting

*   If the build fails, check the build logs in the Cloud Build section of the Google Cloud Console for more information.
*   If the deployment fails, check the service logs in the Cloud Run section of the Google Cloud Console for more information.