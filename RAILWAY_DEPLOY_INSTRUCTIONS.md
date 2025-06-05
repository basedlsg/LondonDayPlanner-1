# 🚂 Railway Deployment Instructions

## Step 1: Deploy to Railway

1. **Visit Railway**: Go to [railway.app](https://railway.app)
2. **Sign up/Login**: Use your GitHub account
3. **New Project**: Click "New Project"
4. **Deploy from GitHub**: Select "Deploy from GitHub repo"
5. **Select Repository**: Choose `basedlsg/LondonDayPlanner-1`
6. **Auto-Deploy**: Railway will detect the Dockerfile and start building

## Step 2: Configure Environment Variables

In the Railway dashboard, go to your project → Variables tab and add:

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://neondb_owner:npg_cvzBEqNlX23Z@ep-wandering-bread-a58cndkl.us-east-2.aws.neon.tech/neondb?sslmode=require
GOOGLE_PLACES_API_KEY=AIzaSyANvAALVm7PDSxqHplpqhw3SbE8Q3xE8lY
GEMINI_API_KEY=AIzaSyBdDVJrXw3Jpo27cuT5CuvM-o4BRUhIW0Y
WEATHER_API_KEY=d2dc9f1e7f1006008958a571953fabb2
SESSION_SECRET=1b3f578c3fdb34a11e0918722a1b14c656c27ae4faa2a5ad4f18c0e665042068
CORS_ORIGIN=https://planyourperfectday.app
RATE_LIMIT_ENABLED=true
HTTPS_ONLY=true
```

## Step 3: Set Up Custom Domain

1. **In Railway Dashboard**: Go to Settings → Domains
2. **Add Domain**: Enter `api.planyourperfectday.app`
3. **Get Railway URL**: Copy the Railway-generated URL (e.g., `your-app-production.railway.app`)

## Step 4: Configure DNS

In your domain provider (where planyourperfectday.app is hosted):

```dns
Type: CNAME
Name: api
Value: [your-railway-domain].railway.app
TTL: 300 (5 minutes)
```

## Step 5: Test Deployment

Once deployed, test these endpoints:

1. **Health Check**: 
   ```
   GET https://api.planyourperfectday.app/health
   ```

2. **London Planning**: 
   ```
   POST https://api.planyourperfectday.app/api/london/plan
   Content-Type: application/json
   
   {
     "query": "Coffee in Covent Garden at 10am, then lunch at a nice restaurant",
     "date": "2024-12-07",
     "startTime": "10:00"
   }
   ```

3. **NYC Planning**: 
   ```
   POST https://api.planyourperfectday.app/api/nyc/plan
   Content-Type: application/json
   
   {
     "query": "Breakfast in SoHo, then visit MoMA",
     "date": "2024-12-07"
   }
   ```

## Step 6: Verify Deployment

Expected responses:
- Health check should return `{ "status": "ok", "timestamp": "..." }`
- Planning endpoints should return itinerary with venues array
- All responses should be under 3 seconds

## 🎯 Quick Deploy Checklist

- [ ] Railway account created/logged in
- [ ] GitHub repository connected
- [ ] Dockerfile deployment initiated
- [ ] All environment variables configured
- [ ] Custom domain `api.planyourperfectday.app` added
- [ ] DNS CNAME record configured
- [ ] SSL certificate active (automatic with Railway)
- [ ] Health endpoint responding
- [ ] Planning endpoints working for all cities

## 🆘 Troubleshooting

**Build Fails**: Check Railway logs for missing dependencies
**Database Connection**: Verify DATABASE_URL is exactly as shown above
**CORS Errors**: Ensure CORS_ORIGIN matches your domain
**API Key Errors**: Double-check all API keys are set correctly

## 🚀 Ready for Wix Integration

Once deployed successfully, you can integrate with Wix Studio using:

```html
<div id="day-planner-widget"></div>
<script>
// Paste the contents of wix-integration/planner-widget.js here
// Then initialize with:
initializeDayPlanner('london'); // or 'nyc', 'boston', 'austin'
</script>
```

## 📊 Expected Performance

- **Build Time**: 3-5 minutes
- **Cold Start**: < 10 seconds
- **Response Time**: < 2 seconds average
- **Uptime**: 99.9%
- **Auto-scaling**: Enabled

Your London Day Planner will be live at `api.planyourperfectday.app` once deployed! 🎉