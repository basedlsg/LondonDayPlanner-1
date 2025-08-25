# Runbook: Initializing the GitHub Repository

This runbook provides the steps to initialize a new Git repository for this project, create an initial commit, and push it to a new repository on GitHub.

## Prerequisites

- You have a GitHub account.
- You have `git` installed on your local machine.
- You have created a new, empty repository on GitHub.

## Steps

1.  **Navigate to the Project Directory**:
    Open a terminal and navigate to the root directory of this project.

2.  **Run the Initialization Script**:
    Execute the following script. This will initialize the repository, add all files, and create the first commit.

    ```bash
    sh ./infra/scripts/01-init-github.sh
    ```

3.  **Add the Remote Origin**:
    In your terminal, add the URL of your new GitHub repository as the remote origin. Replace `<your-github-repo-url>` with the actual URL.

    ```bash
    git remote add origin <your-github-repo-url>
    ```
    *Example: `git remote add origin https://github.com/your-username/your-repo-name.git`*

4.  **Push to GitHub**:
    Push the initial commit to the `main` branch on GitHub.

    ```bash
    git push -u origin main
    ```

## Verification

After completing these steps, refresh your repository page on GitHub. You should see all the project files.