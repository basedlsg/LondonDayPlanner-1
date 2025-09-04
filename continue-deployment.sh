#!/bin/bash

# Continue Firebase Deployment (run after authentication)
set -e

echo "🔥 Continuing Firebase Deployment..."
echo "==================================="

# Check authentication (support FIREBASE_TOKEN fallback)
echo "📋 Checking authentication..."
if [ -n "$FIREBASE_TOKEN" ]; then
    echo "🔑 Using FIREBASE_TOKEN for non-interactive auth"
else
    if ! firebase projects:list &> /dev/null; then
        echo "❌ Still not authenticated. Try one of the following:"
        echo "   1) Device flow: firebase login --reauth --no-localhost"
        echo "   2) Use CI token: export FIREBASE_TOKEN=\"<token>\" (from 'firebase login:ci')"
        exit 1
    fi
    echo "✅ Authentication confirmed"
fi

# Configure environment variables
echo "🔑 Configuring API keys..."
GEMINI_KEY=$(grep "GEMINI_API_KEY" .env | cut -d '=' -f2)
PLACES_KEY=$(grep "GOOGLE_PLACES_API_KEY" .env | cut -d '=' -f2)
WEATHER_KEY=$(grep "GOOGLE_WEATHER_API_KEY" .env | cut -d '=' -f2)

if [ -n "$GEMINI_KEY" ]; then
    echo "   Setting Gemini API key..."
    firebase functions:config:set gemini.key="$GEMINI_KEY" --project day-planner-london-mvp
fi

if [ -n "$PLACES_KEY" ]; then
    echo "   Setting Google Places API key..."
    firebase functions:config:set google.places_key="$PLACES_KEY" --project day-planner-london-mvp
fi

if [ -n "$WEATHER_KEY" ]; then
    echo "   Setting Google Weather API key..."
    firebase functions:config:set google.weather_key="$WEATHER_KEY" --project day-planner-london-mvp
fi

echo "🔥 Deploying to Firebase..."
if [ -n "$FIREBASE_TOKEN" ]; then
    firebase deploy --non-interactive --project day-planner-london-mvp --token "$FIREBASE_TOKEN"
else
    firebase deploy --project day-planner-london-mvp
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"

echo ""
echo "📍 Your Firebase Hosting URL:"
firebase hosting:sites:list --project day-planner-london-mvp

echo ""
echo "⚡ Your Firebase Functions:"
firebase functions:list --project day-planner-london-mvp

echo ""
echo "🧪 Test your API:"
echo "curl -X POST https://day-planner-london-mvp.web.app/api/plan \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\":\"Visit Central Park\",\"date\":\"2025-01-15\",\"startTime\":\"10:00\"}'"






