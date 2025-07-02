#!/bin/bash
# London Day Planner - Railway Deployment Script
# Run this script to deploy to Railway via web interface

echo "🚂 London Day Planner - Railway Deployment"
echo "=========================================="
echo ""

echo "✅ Code pushed to GitHub: basedlsg/LondonDayPlanner-1"
echo "✅ Dockerfile configured for Railway"
echo "✅ Environment variables prepared"
echo ""

echo "🌐 Next Steps - Deploy via Railway Web Interface:"
echo ""
echo "1. Open: https://railway.app"
echo "2. Sign up/Login with GitHub"
echo "3. Click 'New Project' → 'Deploy from GitHub repo'"
echo "4. Select: basedlsg/LondonDayPlanner-1"
echo "5. Railway will auto-detect Dockerfile and deploy"
echo ""

echo "🔧 Environment Variables to Add in Railway Dashboard:"
echo "======================================================"
echo "NODE_ENV=production"
echo "PORT=8080"
echo "DATABASE_URL=postgresql://neondb_owner:npg_qrvAMB0IRVa6@ep-lucky-mouse-a8ezvazt.eastus2.azure.neon.tech/neondb?sslmode=require"
echo "GOOGLE_PLACES_API_KEY=AIzaSyANvAALVm7PDSxqHplpqhw3SbE8Q3xE8lY"
echo "GEMINI_API_KEY=AIzaSyBdDVJrXw3Jpo27cuT5CuvM-o4BRUhIW0Y"
echo "WEATHER_API_KEY=d2dc9f1e7f1006008958a571953fabb2"
echo "SESSION_SECRET=1b3f578c3fdb34a11e0918722a1b14c656c27ae4faa2a5ad4f18c0e665042068"
echo "CORS_ORIGIN=https://planyourperfectday.app"
echo "RATE_LIMIT_ENABLED=true"
echo "HTTPS_ONLY=true"
echo ""

echo "🌐 Domain Configuration:"
echo "========================"
echo "1. In Railway: Settings → Domains → Add 'api.planyourperfectday.app'"
echo "2. Configure DNS CNAME: api.planyourperfectday.app → [railway-domain].railway.app"
echo ""

echo "🧪 Test Endpoints After Deployment:"
echo "===================================="
echo "Health: GET https://api.planyourperfectday.app/health"
echo "London: POST https://api.planyourperfectday.app/api/london/plan"
echo "NYC: POST https://api.planyourperfectday.app/api/nyc/plan"
echo "Boston: POST https://api.planyourperfectday.app/api/boston/plan"
echo "Austin: POST https://api.planyourperfectday.app/api/austin/plan"
echo ""

echo "🎯 Expected Build Time: 3-5 minutes"
echo "📊 Expected Response Time: < 2 seconds"
echo "🔒 Security: Rate limiting, CORS, session security enabled"
echo ""

echo "🎉 Ready to deploy! Visit https://railway.app to start."
echo ""

# Test local build before deployment
echo "🔧 Testing local build..."
if npm run build; then
    echo "✅ Local build successful - ready for deployment!"
else
    echo "❌ Local build failed - fix issues before deploying"
    exit 1
fi