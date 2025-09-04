# Runbook: Fixing Firebase Deployment Authentication Issues

This runbook provides the steps to resolve the "Failed to get Firebase project" error that occurs during deployment. This error is typically caused by missing or incorrect authentication credentials.

## Steps

1.  **Navigate to the Service Accounts page in Google Cloud Console:**
    *   Open the [Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts).
    *   Ensure you have selected the correct project (`day-planner-london-mvp`).

2.  **Create a new Service Account:**
    *   Click on **"+ CREATE SERVICE ACCOUNT"**.
    *   **Service account name:** `firebase-deployer`
    *   **Service account ID:** `firebase-deployer` (this will be auto-generated).
    *   Click **"CREATE AND CONTINUE"**.

3.  **Grant Permissions:**
    *   In the "Grant this service account access to project" step, add at minimum:
        *   `Firebase Hosting Admin` (roles/firebasehosting.admin)
        *   Optional for broader control: `Firebase Admin` (roles/firebase.admin)
    *   Click **"CONTINUE"**.
    *   Click **"DONE"**.

4.  **Generate a JSON Key:**
    *   Find the newly created `firebase-deployer` service account in the list.
    *   Click on the three dots under the "Actions" column and select **"Manage keys"**.
    *   Click on **"ADD KEY"** -> **"Create new key"**.
    *   Select **"JSON"** as the key type and click **"CREATE"**.
    *   A JSON file will be downloaded to your computer. **Keep this file secure.**

5.  **Use it in GitHub Actions (recommended):**
    *   In GitHub, go to Settings → Secrets and variables → Actions → New repository secret
    *   Name: `FIREBASE_SERVICE_ACCOUNT` and paste the full JSON key as the value
    *   The workflow `.github/workflows/deploy-firebase.yml` already consumes this secret
    *   Push to `main` to deploy automatically

6.  **Local deploy without login (optional):**
    *   Generate a CI token once on any machine:
      ```bash
      firebase login:ci
      ```
    *   On your local machine, set the token and deploy:
      ```bash
      export FIREBASE_TOKEN="<token>"
      firebase deploy --non-interactive --project day-planner-london-mvp
      ```

Notes:
- The Firebase CLI does not authenticate via `GOOGLE_APPLICATION_CREDENTIALS`. Prefer GitHub Actions with a service account or use a `FIREBASE_TOKEN` locally.
/- If using Hosting rewrites to Cloud Run, ensure your Cloud Run service has `roles/run.invoker` granted (Invoker) to the appropriate principal as configured in `firebase.json` rewrites.
