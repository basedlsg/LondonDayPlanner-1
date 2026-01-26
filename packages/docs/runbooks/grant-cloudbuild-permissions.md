# Granting Cloud Build Permissions

The deployment is currently blocked because your Google Cloud account lacks the necessary permissions to manage roles and deploy applications. To fix this, you will need to grant your account the "Owner" role for the project.

**Please follow these steps carefully in the Google Cloud Console:**

1.  **Open the IAM Page:**
    *   Navigate to the following URL:
        [https://console.cloud.google.com/iam-admin/iam?project=day-planner](https://console.cloud.google.com/iam-admin/iam?project=day-planner)

2.  **Find Your Account:**
    *   In the list of principals, find the account with the email **carlos@raxverse.com**.

3.  **Edit Permissions:**
    *   Click the **pencil icon** (Edit principal) next to your account.

4.  **Add the Owner Role:**
    *   In the "Edit permissions" panel, click **"Add another role"**.
    *   In the "Select a role" filter, type **"Owner"** and select the "Owner" role from the list.
    *   Click **"Save"**.

5.  **Verify and Redeploy:**
    *   After saving the new role, return to your terminal and run the deployment script again:
        ```bash
        bash scripts/deploy-gcp.sh
        ```

This will grant your account the necessary permissions to manage the project and deploy the application successfully.