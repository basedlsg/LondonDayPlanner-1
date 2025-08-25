# Runbook: Configuring a Service Account for Firebase Deployment

This runbook provides instructions for creating a Google Cloud service account, granting it the necessary permissions, and using it to authenticate Firebase deployments from a local or CI/CD environment.

## 1. Create a Service Account

1.  **Open the Service Accounts page** in the Google Cloud Console:
    [https://console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)

2.  **Select your project** (`plannyc-12345`).

3.  Click **+ CREATE SERVICE ACCOUNT**.

4.  Enter a **Service account name** (e.g., `firebase-deployer`) and an optional description.

5.  Click **CREATE AND CONTINUE**.

## 2. Grant Permissions

Grant the following roles to the service account to allow it to deploy to Firebase Hosting and interact with Cloud Run:

*   **Firebase Hosting Admin** (`roles/firebasehosting.admin`): Allows deploying to Firebase Hosting.
*   **Cloud Run Admin** (`roles/run.admin`): Allows managing Cloud Run services.
*   **Service Account User** (`roles/iam.serviceAccountUser`): Allows the service account to be used by other services.

Click **CONTINUE**.

## 3. Create a Service Account Key

1.  Skip the "Grant users access to this service account" section and click **DONE**.

2.  Find the newly created service account in the list. Click the three-dot menu (⋮) under **Actions** and select **Manage keys**.

3.  Click **ADD KEY** > **Create new key**.

4.  Select **JSON** as the key type and click **CREATE**. A JSON file will be downloaded to your computer. **Keep this file secure, as it provides administrative access to your project.**

## 4. Configure Your Environment

1.  Move the downloaded JSON key file to a secure location in your project, for example, a `.secrets` directory that is included in your `.gitignore` file.

2.  Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the JSON key file.

    **On macOS/Linux:**
    ```bash
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/keyfile.json"
    ```

    **On Windows (Command Prompt):**
    ```cmd
    set GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\keyfile.json"
    ```

    **On Windows (PowerShell):**
    ```powershell
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\keyfile.json"
    ```

Once this environment variable is set, the Firebase CLI and other Google Cloud tools will automatically use the service account for authentication.