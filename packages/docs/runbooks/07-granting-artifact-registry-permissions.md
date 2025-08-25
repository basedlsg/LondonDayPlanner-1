# Runbook: Granting Artifact Registry Permissions to Cloud Build

This runbook provides the steps to resolve the "Permission 'artifactregistry.repositories.uploadArtifacts' denied" error that occurs during the Cloud Build process. This error indicates that the Cloud Build service account lacks the necessary permissions to upload container images to the Artifact Registry.

## Steps

1.  **Navigate to the IAM page in the Google Cloud Console:**
    *   Open the [IAM page](https://console.cloud.google.com/iam-admin/iam).
    *   Ensure you have selected the correct project (`plannyc-12345`).

2.  **Find the Cloud Build Service Account:**
    *   In the list of principals, find the service account with the following format: `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`.
    *   You can find your project number in the [Google Cloud Console Dashboard](https://console.cloud.google.com/home/dashboard). For this project, the ID is `969054364984`.
    *   The service account will be `969054364984@cloudbuild.gserviceaccount.com`.

3.  **Grant the "Artifact Registry Writer" Role:**
    *   Click the pencil icon next to the Cloud Build service account to edit its roles.
    *   Click on **"+ ADD ANOTHER ROLE"**.
    *   In the "Select a role" filter, type `Artifact Registry Writer` and select the role.
    *   Click **"SAVE"**.

4.  **Re-run the Cloud Build script:**
    *   After granting the new role, you can run the Cloud Build script again.
    ```bash
    sh infra/scripts/06-deploy-cloud-run.sh
    ```

This should resolve the permissions issue and allow the Cloud Build process to complete successfully.