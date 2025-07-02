# 🚂 Railway Deployment Guide - London Day Planner

## 🚀 **Quick Deployment Steps**

### **1. Create Railway Account**
1. Go to https://railway.app
2. Sign up with GitHub
3. Connect your GitHub account

### **2. Deploy from GitHub**
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **`basedlsg/LondonDayPlanner-1`**
4. Railway will auto-detect and start deployment

### **3. Add Environment Variables**
In Railway Dashboard → Your Project → Variables, add:

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://neondb_owner:npg_qrvAMB0IRVa6@ep-lucky-mouse-a8ezvazt.eastus2.azure.neon.tech/neondb?sslmode=require
GOOGLE_PLACES_API_KEY=AIzaSyANvAALVm7PDSxqHplpqhw3SbE8Q3xE8lY
GEMINI_API_KEY=AIzaSyBdDVJrXw3Jpo27cuT5CuvM-o4BRUhIW0Y
WEATHER_API_KEY=d2dc9f1e7f1006008958a571953fabb2
SESSION_SECRET=1b3f578c3fdb34a11e0918722a1b14c656c27ae4faa2a5ad4f18c0e665042068
CORS_ORIGIN=https://planyourperfectday.app
RATE_LIMIT_ENABLED=true
HTTPS_ONLY=true
```

### **4. Deployment Process**
- ✅ Railway detects `nixpacks.toml` config
- ✅ Installs Node.js 20
- ✅ Runs `npm ci` (install dependencies)
- ✅ Runs `npm run build` (build frontend)
- ✅ Starts with `npm start` (production server)

### **5. Get Your App URL**
After deployment, Railway provides a URL like:
```
https://your-app-name-production.up.railway.app
```

---

## 🧪 **Testing Your Deployment**

### **Health Check**
```bash
curl https://your-railway-url.railway.app/api/health
```

### **API Test**
```bash
curl -X POST https://your-railway-url.railway.app/api/plan \
  -H "Content-Type: application/json" \
  -d '{"query": "Coffee shops in Soho", "city": "london"}'
```

---

## 🌐 **Custom Domain Setup (Optional)**

### **1. Add Domain in Railway**
1. Go to Railway Dashboard → Your Project → Settings
2. Click **"Domains"**
3. Add **`api.planyourperfectday.app`**

### **2. Configure DNS**
Add this DNS record in your domain provider:
```dns
Type: CNAME
Name: api
Value: your-app-name-production.up.railway.app
```

### **3. Update Environment**
```bash
CORS_ORIGIN=https://planyourperfectday.app,https://api.planyourperfectday.app
```

---

## 🔄 **Automatic Deployments**

Railway automatically deploys when you push to `main` branch:

```bash
git add .
git commit -m "feat: Update app"
git push origin main
# 🚂 Railway deploys automatically in ~2-3 minutes
```

---

## 📊 **Current Project Status**

### **✅ Ready for Deployment**
- [x] Database: Neon PostgreSQL connected
- [x] Sample Data: 190+ itineraries generated
- [x] Frontend: Built and authentication-free
- [x] Backend: Production-ready with rate limiting
- [x] Environment: All variables configured
- [x] Git: Latest changes committed and pushed

### **🚀 Expected Results**
- **Build Time**: 2-3 minutes
- **Response Time**: < 2 seconds for API calls
- **Database**: Automatically connected
- **Sample Data**: Immediately available

---

## 🎯 **Next Steps**

1. **Visit Railway.app** and create your project
2. **Deploy from GitHub** repo `basedlsg/LondonDayPlanner-1`
3. **Add environment variables** from the list above
4. **Test your deployment** with the health check
5. **Optional**: Set up custom domain

Your London Day Planner will be live and functional within 5 minutes! 🎉

---

## 📞 **Support**

- **Railway Docs**: https://docs.railway.app
- **Your Repo**: https://github.com/basedlsg/LondonDayPlanner-1
- **Database**: Neon Console for database management