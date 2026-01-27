#!/bin/bash
set -e

APP_NAME="PlanYourPerfectDay"
BUNDLE_ID="com.carlos.PlanYourPerfectDay"
BUILD_DIR="/Users/carlos/LondonDayPlanner-1/ios-native/.build/Build/Products/Debug-iphonesimulator"
APP_BUNDLE="$BUILD_DIR/$APP_NAME.app"
DEVICE_ID="C46E8821-174A-4A0B-B6B0-5E4D70A58F6F"

echo "Building..."
xcodebuild -scheme PlanYourPerfectDay -destination "platform=iOS Simulator,id=$DEVICE_ID" -derivedDataPath .build build

echo "Creating App Bundle..."
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE"

cp "$BUILD_DIR/$APP_NAME" "$APP_BUNDLE/"
# Copy resource bundle content potentially or the bundle itself
# Usually resources are at root of .app or in a folder
cp -r "$BUILD_DIR/${APP_NAME}_${APP_NAME}.bundle" "$APP_BUNDLE/"
# FIX: Copy font to root for UIAppFonts
cp "$BUILD_DIR/${APP_NAME}_${APP_NAME}.bundle/RozhaOne-Regular.ttf" "$APP_BUNDLE/"

# Create Info.plist
cat > "$APP_BUNDLE/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UIDeviceFamily</key>
    <array>
        <integer>1</integer>
        <integer>2</integer>
    </array>
    <key>UIAppFonts</key>
    <array>
        <string>RozhaOne-Regular.ttf</string>
    </array>
    <key>UILaunchScreen</key>
    <dict/>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>plan</string>
            </array>
            <key>CFBundleURLName</key>
            <string>com.carlos.PlanYourPerfectDay</string>
        </dict>
    </array>
</dict>
</plist>
EOF

echo "Installing..."
xcrun simctl install "$DEVICE_ID" "$APP_BUNDLE"

echo "Launching..."
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID"
