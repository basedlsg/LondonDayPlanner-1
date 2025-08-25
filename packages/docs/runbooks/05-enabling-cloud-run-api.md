# Runbook: Enabling the Cloud Run Admin API

This runbook provides the steps to resolve the "Cloud Run Admin API has not been used" error that occurs during Firebase deployment. This error appears when your Firebase Hosting configuration is set up to rewrite traffic to a Cloud Run service, but the necessary API is not enabled in your Google Cloud project.

## Steps

1.  **Open the Cloud Run Admin API page in the Google Cloud Console:**
    *   Click on the following link to go directly to the API enablement page for your project:
        [https://console.developers.google.com/apis/api/run.googleapis.com/overview?project=969054364984](https://console.developers.google.com/apis/api/run.googleapis.com/overview?project=969054364984)

2.  **Enable the API:**
    *   If the API is not already enabled, you will see an "ENABLE" button. Click it to enable the Cloud Run Admin API for your project.
    *   If the API is already enabled, you will see a "MANAGE" button instead. In this case, no action is needed.

3.  **Wait for Propagation:**
    *   After enabling the API, it may take a few minutes for the change to propagate throughout Google's systems. Please wait at least 5 minutes before attempting to deploy again.

4.  **Re-run the deployment script:**
    *   Once the API is enabled and you have waited a few minutes, you can run the deployment script again.
    ```bash
    sh infra/scripts/02-deploy-firebase.sh
    ```

This should resolve the error and allow the deployment to complete successfully.