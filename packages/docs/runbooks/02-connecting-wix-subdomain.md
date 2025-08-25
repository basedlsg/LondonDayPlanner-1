# Runbook: Connecting a Wix Subdomain to Firebase Hosting

This runbook provides the steps to connect a subdomain managed by Wix to your Firebase Hosting project.

## Prerequisites

- You have a domain managed by Wix.
- You have deployed your application to Firebase Hosting.
- You have the URL of your Firebase Hosting project (e.g., `your-project.web.app`).

## Steps

1.  **Add a Custom Domain in Firebase**:
    - Open the Firebase console and navigate to your project.
    - Go to the **Hosting** section.
    - Click on **Add custom domain**.
    - Enter the subdomain you want to use (e.g., `planner.yourdomain.com`).
    - Firebase will provide you with a TXT record to verify domain ownership.

2.  **Add the TXT Record in Wix**:
    - Open your Wix dashboard and go to **Domains**.
    - Select your domain and go to **Manage DNS Records**.
    - Add a new TXT record with the values provided by Firebase.
    - Save the record.

3.  **Verify Domain Ownership in Firebase**:
    - Go back to the Firebase console and click **Verify**.
    - It may take some time for the DNS changes to propagate.

4.  **Add A Records in Wix**:
    - Once your domain is verified, Firebase will provide you with two A records.
    - Go back to the **Manage DNS Records** section in your Wix dashboard.
    - Add two new A records with the IP addresses provided by Firebase. The host for both records should be your subdomain (e.g., `planner`).

5.  **Wait for Propagation**:
    - It can take up to 24 hours for the DNS changes to fully propagate.
    - Once propagated, your subdomain will point to your Firebase Hosting project.

## Verification

After completing these steps and waiting for propagation, you should be able to access your application by navigating to your Wix subdomain in a web browser.