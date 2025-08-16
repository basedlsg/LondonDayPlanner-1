# Vercel Support Request: Unable to Disable Vercel Authentication

## Issue

We are unable to disable Vercel Authentication for our project, `london-day-planner-1`. This is causing our API endpoints to return the Vercel login page instead of the expected JSON response.

## Steps Taken

We have already tried the following steps to resolve the issue:

1.  **Setting `"public": true` in `vercel.json`:** We have confirmed that our `vercel.json` file contains the `"public": true` setting, but it is being overridden by the project-level authentication.

2.  **Using the Vercel CLI:** We have tried using the `vercel protection rm` and `vercel alias set --public` commands, but they have not resolved the issue.

3.  **Investigating `vercel.json` for override configurations:** We attempted to add `github: { silent: true }` and an empty `protection: {}` block to our `vercel.json` file, but this resulted in a "Project Settings are invalid" error when deploying.

4.  **Exploring Vercel environment variables:** We have checked for any environment variables that might be related to authentication, but there are none configured for this project.

5.  **Attempting to remove protection via Vercel API:** We have tried to use the Vercel API to set the `public` property of our deployment to `true`, but the API returned a "Not Found" error.

## Configuration Files

### `vercel.json`

```json
{
  "version": 2,
  "public": true,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node",
      "config": {
        "runtime": "nodejs20.x"
      }
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### `.vercel/project.json`

```json
{
  "protectionBypassForAutomation": true
}
```

## Request

Please disable Vercel Authentication for our project, `london-day-planner-1`, so that our API endpoints are publicly accessible.