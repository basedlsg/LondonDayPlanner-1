# Runbook: Enabling Billing for Your Google Cloud Project

This runbook provides the steps to enable billing for your Google Cloud project (`plannyc-12345`). A billing account is required to use Google Cloud services, including the Cloud Run Admin API.

## Steps

1.  **Go to the Google Cloud Billing Console:**
    *   Open the [Google Cloud Billing Console](https://console.cloud.google.com/billing).

2.  **Link a Billing Account:**
    *   If you have an existing billing account, you can link it to this project.
    *   If you do not have a billing account, you will need to create one. You may be eligible for a free trial with credits.
    *   Select your project (`plannyc-12345`) and follow the on-screen instructions to either link an existing billing account or create a new one.

3.  **Confirm Billing is Enabled:**
    *   Once you have successfully linked a billing account, you can verify this by going to the [Billing page for your project](https://console.cloud.google.com/billing/linkedaccount?project=plannyc-12345).
    *   You should see the linked billing account details.

4.  **Re-run the API enablement script:**
    *   After billing is enabled, you can run the script to enable the Cloud Run API again.
    ```bash
    sh infra/scripts/03-enable-cloud-run-api.sh
    ```

5.  **Proceed with Deployment:**
    *   Once the API is enabled, you can run the main deployment script.
    ```bash
    sh infra/scripts/02-deploy-firebase.sh