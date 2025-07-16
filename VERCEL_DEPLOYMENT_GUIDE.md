# 🚀 Vercel Deployment Guide

This guide will help you deploy your full-stack London Day Planner application to Vercel.

## Step 1: Create a Vercel Account

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Authorize Vercel to access your repositories.

## Step 2: Create a Vercel Project

1. In your Vercel dashboard, click **"Add New..."** → **"Project"**.
2. **Import Git Repository**: Select `basedlsg/LondonDayPlanner-1`.
3. Vercel will automatically detect that this is a Vite project and configure the build settings.

## Step 3: Set Up a Vercel Postgres Database

1. In your Vercel project's dashboard, go to the **"Storage"** tab.
2. Click **"Create Database"** and select **"Postgres"**.
3. Follow the prompts to create the database. Vercel will automatically link it to your project and create the necessary `DATABASE_URL` environment variable.

## Step 4: Configure Environment Variables

In your Vercel project's dashboard, go to **Settings** → **Environment Variables**. Add the following variables for the **Production** environment:

```
NODE_ENV=production
GOOGLE_PLACES_API_KEY=AIzaSyANvAALVm7PDSxqHplpqhw3SbE8Q3xE8lY
GEMINI_API_KEY=AIzaSyBdDVJrXw3Jpo27cuT5CuvM-o4BRUhIW0Y
WEATHER_API_KEY=d2dc9f1e7f1006008958a571953fabb2
SESSION_SECRET=1b3f578c3fdb34a11e0918722a1b14c656c27ae4faa2a5ad4f18c0e665042068
```

**(Note: Vercel automatically handles `DATABASE_URL` and `CORS_ORIGIN` is not needed as the frontend and backend will be on the same domain.)**

## Step 5: Deploy

1. Go to the **"Deployments"** tab for your project.
2. Trigger a new deployment for the `main` branch.
3. Vercel will build both the frontend and the API and deploy them.

## Step 6: Test the Application

1. Visit your main Vercel domain (e.g., `your-project.vercel.app`).
2. Test creating an itinerary. The application should now be fully functional.

Your application is now successfully deployed on Vercel! 