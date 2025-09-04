#!/bin/bash

# Firebase Deployment with Service Account
set -e

echo "🔥 Firebase Deployment with Service Account"
echo "==========================================="

# Configuration
PROJECT_ID="day-planner-london-mvp"
PUBLIC_DIR="dist/public"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if dist/public exists, if not build the project
if [ ! -d "dist/public" ]; then
    print_warning "Build directory not found. Building project..."
    npm run build
    print_status "Build complete"
else
    print_status "Build directory already exists"
fi

# Check if service account key exists
if [ ! -f "firebase-service-key.json" ]; then
    print_warning "Firebase service account key not found"
    echo ""
    echo "📋 To create a service account key:"
    echo "1. Go to Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
    echo "2. Click 'Generate new private key'"
    echo "3. Save as 'firebase-service-key.json' in this directory"
    echo ""
    echo "🔑 Or use Firebase CLI authentication:"
    echo "   firebase login"
    echo "   firebase deploy --only hosting"
    echo ""
    exit 1
fi

print_status "Service account key found"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_warning "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
    print_status "Firebase CLI installed"
fi

# Initialize Firebase project if not already done
if [ ! -f "firebase.json" ]; then
    print_status "Initializing Firebase project..."
    echo '{
  "hosting": {
    "public": "dist/public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "plannyc-api",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}' > firebase.json
    print_status "Firebase configuration created"
fi

# Deploy using CI token (service accounts are not accepted by Firebase CLI)
if [ -n "$FIREBASE_TOKEN" ]; then
  print_status "Deploying with FIREBASE_TOKEN (non-interactive) ..."
  firebase deploy --only hosting --project "$PROJECT_ID" --non-interactive --token "$FIREBASE_TOKEN"
  print_status "Deployment successful!"
else
  print_warning "Firebase CLI cannot authenticate directly with a service account JSON."
  echo ""
  echo "Use one of these approaches:"
  echo "1) GitHub Actions (recommended): set FIREBASE_SERVICE_ACCOUNT secret with the JSON key and push to main."
  echo "2) Local CI token: run 'firebase login:ci' on any machine, set FIREBASE_TOKEN here, and rerun this script."
  exit 1
fi
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo "🌐 Your site is live at: https://$PROJECT_ID.web.app"
echo "📊 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/hosting"

