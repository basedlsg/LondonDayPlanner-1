#!/bin/bash

echo "🚀 Building Plan Your Perfect Day for Google Play Store"
echo "=================================================="

# Step 1: Build the web app
echo "📦 Building web application..."
npm run build

# Step 2: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
cp -r dist/public www
npx cap sync android

# Step 3: Check for keystore
if [ ! -f "android/app/plan-perfect-day-release.keystore" ]; then
    echo "🔑 Keystore not found. Please run the keystore generation first:"
    echo "   cd android/app"
    echo "   keytool -genkey -v -keystore plan-perfect-day-release.keystore -alias plan-perfect-day -keyalg RSA -keysize 2048 -validity 10000"
    echo "   Then create key.properties file with your keystore details"
    exit 1
fi

# Step 4: Build release AAB
echo "🏗️  Building release AAB..."
cd android
./gradlew bundleRelease

if [ $? -eq 0 ]; then
    echo "✅ Release AAB built successfully!"
    echo "📱 Your app bundle is ready at: android/app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Upload app-release.aab to Google Play Console"
    echo "2. Complete store listing with screenshots and description"
    echo "3. Submit for review"
    echo ""
    echo "🎉 Your app will be live on Google Play Store in 1-3 days!"
else
    echo "❌ Build failed. Check the logs above for errors."
    exit 1
fi