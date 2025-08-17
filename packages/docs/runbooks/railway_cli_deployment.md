# Runbook: Deploying to Railway via CLI

This runbook provides the steps to deploy the application to Railway using the command-line interface (CLI).

## Prerequisites

- You must have the [Railway CLI](https://docs.railway.app/develop/cli) installed.
- You must be logged into your Railway account via the CLI.

## Step 1: Log in to Railway

If you are not already logged in, open your terminal and run:
```bash
railway login
```
Follow the prompts in your browser to authenticate.

## Step 2: Link Your Local Project to Railway

Navigate to your project's root directory in the terminal and link it to your Railway project.
```bash
railway link
```
You will be prompted to select your project from a list. Choose the `LondonDayPlanner-1` project.

## Step 3: Switch to the Correct Branch

Ensure you are on the branch you want to deploy.
```bash
git checkout revert-to-railway
```

## Step 4: Deploy the Application

Start the deployment using the `railway up` command. The `--detach` flag will run the process in the background.
```bash
railway up --detach
```

## Step 5: Monitor the Deployment

You can monitor the build and deployment logs with the following command:
```bash
railway logs
```
Once the deployment is complete, your application will be live on your Railway-provided domain.