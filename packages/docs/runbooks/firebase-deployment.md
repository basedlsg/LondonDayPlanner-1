# Runbook: Firebase Deployment

This runbook outlines the process for deploying the application to Firebase.

## Prerequisites

*   Firebase CLI installed and authenticated.
*   A Firebase project.

## Deployment Steps

1.  **Navigate to the project root directory.**
2.  **Run the deployment script:**

    ```bash
    ./infra/scripts/deploy-firebase.sh
    ```

3.  **Monitor the deployment process in the Firebase Console.**

## Rollback

In case of a deployment failure, you can roll back to a previous version of the service in the Firebase Console.