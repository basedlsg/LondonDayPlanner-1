#!/bin/bash

# Firebase Hosting Deployment via gcloud and REST API
set -e

echo "🔥 Firebase Hosting Deployment via gcloud"
echo "========================================="

# Configuration
PROJECT_ID="day-planner-london-mvp"
SITE_ID="day-planner-london-mvp"
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

# Cross-platform SHA-256
hash_file() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | cut -d' ' -f1
    else
        shasum -a 256 "$1" | awk '{print $1}'
    fi
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

# Check authentication
print_status "Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "Not authenticated. Please run:"
    echo "   gcloud auth login"
    echo "   gcloud config set project $PROJECT_ID"
    exit 1
fi

print_status "Authentication confirmed"

# Set project
print_status "Setting project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# Check if Firebase Hosting is enabled
print_status "Checking Firebase Hosting access..."
if ! gcloud services list --enabled --filter="name:firebasehosting.googleapis.com" | grep -q firebasehosting; then
    print_warning "Firebase Hosting API not enabled. Enabling..."
    gcloud services enable firebasehosting.googleapis.com
fi

# Get access token
print_status "Getting access token..."
ACCESS_TOKEN=$(gcloud auth print-access-token)
if [ -z "$ACCESS_TOKEN" ]; then
    print_error "Failed to get access token"
    exit 1
fi

print_status "Access token obtained"

# Check if site exists
print_status "Checking if site exists..."
SITE_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites")

if echo "$SITE_RESPONSE" | grep -q "error"; then
    print_error "Failed to access Firebase Hosting sites:"
    echo "$SITE_RESPONSE"
    exit 1
fi

# Create site if it doesn't exist
if ! echo "$SITE_RESPONSE" | grep -q "$SITE_ID"; then
    print_status "Creating site $SITE_ID..."
    CREATE_SITE_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"siteId\":\"$SITE_ID\"}" \
        "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites")
    
    if echo "$CREATE_SITE_RESPONSE" | grep -q "error"; then
        print_error "Failed to create site:"
        echo "$CREATE_SITE_RESPONSE"
        exit 1
    fi
    
    print_status "Site created successfully"
else
    print_status "Site $SITE_ID already exists"
fi

# Create version
print_status "Creating new version..."
VERSION_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"CREATED"}' \
    "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites/$SITE_ID/versions")

if echo "$VERSION_RESPONSE" | grep -q "error"; then
    print_error "Failed to create version:"
    echo "$VERSION_RESPONSE"
    exit 1
fi

VERSION_NAME=$(echo "$VERSION_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
VERSION_ID=$(echo "$VERSION_NAME" | rev | cut -d'/' -f1 | rev)

if [ -z "$VERSION_ID" ]; then
    print_error "Failed to extract version ID from response:"
    echo "$VERSION_RESPONSE"
    exit 1
fi

print_status "Version created: $VERSION_ID"

# Upload files
print_status "Uploading files..."
UPLOAD_COUNT=0
TOTAL_FILES=$(find "$PUBLIC_DIR" -type f | wc -l | tr -d ' ')

find "$PUBLIC_DIR" -type f | while read -r file; do
    # Compute path relative to PUBLIC_DIR without GNU realpath
    relative_path="${file#${PUBLIC_DIR}/}"
    encoded_path=$(echo "$relative_path" | sed 's/ /%20/g')
    
    echo "   Uploading ($((++UPLOAD_COUNT))/$TOTAL_FILES): $relative_path"
    
    # Get file hash
    file_hash=$(hash_file "$file")
    
    # Populate file
    populate_response=$(curl -s -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"hash\":\"$file_hash\",\"status\":\"FINALIZED\"}" \
        "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites/$SITE_ID/versions/$VERSION_ID/files/$encoded_path")
    
    if echo "$populate_response" | grep -q "error"; then
        echo "   ❌ Failed to populate $relative_path: $populate_response"
        continue
    fi
    
    # Upload file content
    upload_response=$(curl -s -X POST \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/octet-stream" \
        --data-binary "@$file" \
        "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites/$SITE_ID/versions/$VERSION_ID/files/$encoded_path:upload")
    
    if echo "$upload_response" | grep -q "error"; then
        echo "   ❌ Failed to upload $relative_path: $upload_response"
    else
        echo "   ✅ $relative_path"
    fi
done

print_status "All files uploaded"

# Finalize version
print_status "Finalizing version..."
finalize_response=$(curl -s -X PATCH \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"FINALIZED"}' \
    "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites/$SITE_ID/versions/$VERSION_ID")

if echo "$finalize_response" | grep -q "error"; then
    print_error "Failed to finalize version: $finalize_response"
    exit 1
fi

print_status "Version finalized"

# Release version
print_status "Releasing version..."
release_response=$(curl -s -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"versionName\":\"$VERSION_NAME\",\"message\":\"Deployment via gcloud - $(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"DEPLOY\"}" \
    "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites/$SITE_ID/releases")

if echo "$release_response" | grep -q "error"; then
    print_error "Failed to release version: $release_response"
    exit 1
fi

print_status "Deployment successful!"
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo "🌐 Your site is live at: https://$SITE_ID.web.app"
echo "📊 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/hosting"
echo "📝 Version ID: $VERSION_ID"

