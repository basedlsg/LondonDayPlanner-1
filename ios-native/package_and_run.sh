#!/bin/bash
set -e

APP_NAME="PlanYourPerfectDay"
BUNDLE_ID="com.londonplanner.app"
BUILD_DIR="/Users/carlos/LondonDayPlanner-1/ios-native/.build/Build/Products/Debug-iphonesimulator"
APP_BUNDLE="$BUILD_DIR/$APP_NAME.app"
DEVICE_ID="4B69A9C7-12EF-4DEC-A0F6-B70219D4B20A"

echo "Building..."
xcodebuild -scheme PlanYourPerfectDay -destination "platform=iOS Simulator,id=$DEVICE_ID" -derivedDataPath .build build PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID"

echo "Creating App Bundle..."
# rm -rf "$APP_BUNDLE"
# mkdir -p "$APP_BUNDLE"

# Copy resource bundle content potentially or the bundle itself
# Usually resources are at root of .app or in a folder
    # Flatten the resource bundle content into the root of the app bundle
    # so that Bundle.main can find localization files
    # BUT EXCLUDE Info.plist and _CodeSignature to avoid breaking the app bundle
    rsync -av --exclude="Info.plist" --exclude="_CodeSignature" "$BUILD_DIR/${APP_NAME}_${APP_NAME}.bundle/" "$APP_BUNDLE/"
    
    # ALSO copy the bundle folder itself so Bundle.module logic works
    cp -R "$BUILD_DIR/${APP_NAME}_${APP_NAME}.bundle" "$APP_BUNDLE/"
# FIX: Copy font to root for UIAppFonts
cp "$BUILD_DIR/${APP_NAME}_${APP_NAME}.bundle/RozhaOne-Regular.ttf" "$APP_BUNDLE/"
cp "$BUILD_DIR/${APP_NAME}_${APP_NAME}.bundle/Manrope-Variable.ttf" "$APP_BUNDLE/"

# Create Info.plist (REMOVED: Relies on xcodebuild)
# cat > "$APP_BUNDLE/Info.plist" <<EOF
# ...
# EOF

echo "Installing..."
xcrun simctl install "$DEVICE_ID" "$APP_BUNDLE"

echo "Launching..."
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID"
