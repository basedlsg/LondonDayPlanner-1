# Runbook: Fixing Firebase Deployment Authentication Issues

This runbook provides the steps to resolve the "Failed to get Firebase project" error that occurs during deployment. This error is typically caused by missing or incorrect authentication credentials.

## Steps

1.  **Navigate to the Service Accounts page in Google Cloud Console:**
    *   Open the [Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts).
    *   Ensure you have selected the correct project (`plannyc-12345`).

2.  **Create a new Service Account:**
    *   Click on **"+ CREATE SERVICE ACCOUNT"**.
    *   **Service account name:** `firebase-deployer`
    *   **Service account ID:** `firebase-deployer` (this will be auto-generated).
    *   Click **"CREATE AND CONTINUE"**.

3.  **Grant Permissions:**
    *   In the "Grant this service account access to project" step, add the following roles:
        *   `Firebase Admin`
        *   `Editor`
    *   Click **"CONTINUE"**.
    *   Click **"DONE"**.

4.  **Generate a JSON Key:**
    *   Find the newly created `firebase-deployer` service account in the list.
    *   Click on the three dots under the "Actions" column and select **"Manage keys"**.
    *   Click on **"ADD KEY"** -> **"Create new key"**.
    *   Select **"JSON"** as the key type and click **"CREATE"**.
    *   A JSON file will be downloaded to your computer. **Keep this file secure.**

5.  **Set the Environment Variable:**
    *   Move the downloaded JSON key file to a secure location in your project, for example, a `.secrets` directory that is included in your `.gitignore` file.
    *   Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the absolute path of this JSON file.
        *   **macOS/Linux:**
            ```bash
            export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/keyfile.json"
            ```
        *   **Windows:**
            ```powershell
            $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\keyfile.json"
            ```
    *   To make this permanent, add the `export` command to your shell profile file (e.g., `~/.zshrc`, `~/.bash_profile`).

6.  **Re-run the deployment script:**
    *   Once the environment variable is set, you can run the deployment script again.
    ```bash
    sh infra/scripts/02-deploy-firebase.sh
    ```

This should resolve the authentication issue and allow the deployment to proceed.