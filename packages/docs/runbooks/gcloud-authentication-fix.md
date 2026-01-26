# Runbook: Fixing gcloud Authentication Issues

## Problem
The deployment is failing with an `UNAUTHENTICATED` error. This means that the Google Cloud SDK (`gcloud`) does not have valid credentials to perform the requested operations. This can happen if your login credentials have expired.

## Solution
To resolve this, you need to re-authenticate with Google Cloud.

### Steps
1.  Open a new terminal on your local machine.
2.  Run the following command:
    ```bash
    gcloud auth login
    ```
3.  Your web browser will open to a Google authentication page. Follow the prompts to log in to your Google Cloud account.
4.  After successfully logging in, please let me know, and I will try the deployment again.