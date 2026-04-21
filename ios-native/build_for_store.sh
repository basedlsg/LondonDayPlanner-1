#!/bin/bash
set -e

APP_NAME="PlanYourPerfectDay"
SCHEME_NAME="PlanYourPerfectDay"
BUNDLE_ID="com.londonplanner.app"
ARCHIVE_PATH="$PWD/build/$APP_NAME.xcarchive"
EXPORT_OPTIONS_PLIST="ExportOptions.plist"

echo "🧹 Cleaning..."
xcodebuild clean -scheme "$SCHEME_NAME" -destination "generic/platform=iOS"

echo "📦 Archiving '$APP_NAME'..."
# Note: This command might fail if no signing identity is found.
# In a CI environment, you would import the certificate and profile first.
# Here we rely on Xcode's automatic signing or local user identity.
xcodebuild archive \
  -scheme "$SCHEME_NAME" \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  CODE_SIGN_STYLE="Automatic"

echo "✅ Archive created at: $ARCHIVE_PATH"
echo "ℹ️  To upload to App Store, open this archive in Xcode Organizer or use 'xcodebuild -exportArchive' if you have an ExportOptions.plist."

# Optional: Instructions for manual upload if CLI upload is complex/unsigned
echo ""
echo "NEXT STEPS:"
echo "1. Open the archive in Xcode: open \"$ARCHIVE_PATH\""
echo "2. Click 'Distribute App' in the Organizer."
echo "3. Follow the steps to upload to App Store Connect."
