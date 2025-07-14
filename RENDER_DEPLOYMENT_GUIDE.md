# 🚀 Render Deployment Guide

## Migration from Railway to Render

This guide will help you deploy your London Day Planner to Render's free tier.

## Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

## Step 2: Create PostgreSQL Database

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. **Name**: `london-day-planner-db`
3. **Plan**: Free
4. **Database**: `london_day_planner`
5. **User**: `london_day_planner_user`
6. Click **"Create Database"**

**Important**: Copy the `DATABASE_URL` that Render provides. It will look like:
```
postgresql://london_day_planner_user:password@dpg-xxx-xxx-xxx-xxx.oregon-postgres.render.com/london_day_planner
```

## Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. **Connect Repository**: Select `basedlsg/LondonDayPlanner-1`
3. **Name**: `london-day-planner-api`
4. **Environment**: `Node`
5. **Region**: Choose closest to your users
6. **Branch**: `main`
7. **Build Command**: `npm install && npm run build`
8. **Start Command**: `npm start`
9. **Plan**: Free

## Step 4: Configure Environment Variables

In your web service settings, add these environment variables:

### Required Variables:
```
NODE_ENV=production
PORT=8080
DATABASE_URL=[paste the DATABASE_URL from Step 2]
GOOGLE_PLACES_API_KEY=AIzaSyANvAALVm7PDSxqHplpqhw3SbE8Q3xE8lY
GEMINI_API_KEY=AIzaSyBdDVJrXw3Jpo27cuT5CuvM-o4BRUhIW0Y
WEATHER_API_KEY=d2dc9f1e7f1006008958a571953fabb2
SESSION_SECRET=1b3f578c3fdb34a11e0918722a1b14c656c27ae4faa2a5ad4f18c0e665042068
CORS_ORIGIN=https://app.planyourperfectday.app
RATE_LIMIT_ENABLED=true
HTTPS_ONLY=true
```

## Step 5: Deploy and Get Your API URL

1. Click **"Create Web Service"**
2. Wait for the build to complete (5-10 minutes)
3. Copy your new API URL (e.g., `https://london-day-planner-api.onrender.com`)

## Step 6: Update Frontend Configuration

Once you have your Render API URL, update your Vercel environment variables:

1. Go to your [Vercel dashboard](https://vercel.com)
2. Select your `planyourperfectday.app` project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-render-api-url.onrender.com`
   - **Environment**: Production
5. Redeploy your frontend

## Step 7: Update DNS (Optional)

If you want to use a custom domain for your API:

1. In Render, go to your web service settings
2. Add custom domain: `api.planyourperfectday.app`
3. Update your DNS provider with the CNAME record Render provides

## Step 8: Test the Deployment

1. Visit your frontend: `https://app.planyourperfectday.app`
2. Test creating an itinerary
3. Check that data is being saved to the new database

## Troubleshooting

### Build Failures
- Check that all environment variables are set correctly
- Ensure the `DATABASE_URL` is properly formatted
- Verify that your Google API keys are valid

### CORS Errors
- Make sure `CORS_ORIGIN` is set to your frontend URL
- Check that the frontend is using the correct API URL

### Database Connection Issues
- Verify the `DATABASE_URL` is correct
- Check that the database is running in Render
- Ensure the database user has proper permissions

## Render vs Railway Comparison

| Feature | Railway | Render |
|---------|---------|--------|
| Free Tier | $5/month credit | Truly free |
| Database | Included | Included |
| Auto-deploy | ✅ | ✅ |
| Custom domains | ✅ | ✅ |
| SSL | ✅ | ✅ |
| Sleep after inactivity | ❌ | ✅ (15 min) |

## Cost Savings

- **Railway**: $5/month minimum
- **Render**: $0/month (free tier)
- **Annual savings**: $60/year

## Next Steps

1. ✅ Deploy to Render
2. ✅ Test functionality
3. ✅ Update frontend configuration
4. 🔄 Monitor performance
5. 🔄 Set up monitoring (optional)

Your London Day Planner will now be running on Render's free tier! 🎉 