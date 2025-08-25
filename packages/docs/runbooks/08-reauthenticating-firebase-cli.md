# Runbook: Re-authenticating the Firebase CLI

This runbook provides the steps to resolve the "Authentication Error: Your credentials are no longer valid" error that occurs when running Firebase CLI commands.

## Steps

1.  **Run the re-authentication command:**
    *   Open a terminal and run the following command:
        ```bash
        firebase login --reauth
        ```

2.  **Follow the on-screen instructions:**
    *   This command will open a new browser window and prompt you to log in to your Google account.
    *   After you have successfully logged in, you will be redirected to a page that says "Firebase CLI Login Successful".

3.  **Retry the previous command:**
    *   Once you have successfully re-authenticated, you can retry the command that was failing.

This should resolve the authentication issue and allow you to run Firebase CLI commands successfully.