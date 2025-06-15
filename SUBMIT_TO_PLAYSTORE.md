# 🚀 Submit to Google Play Store - Complete Guide

## Prerequisites ✅

Your app is now **READY FOR SUBMISSION**! Here's what's been prepared:

- ✅ Android project configured
- ✅ App metadata set up
- ✅ Build scripts ready
- ✅ Store listing content prepared
- ✅ Privacy policy created

## Step 1: Generate Release Keystore 🔑

```bash
cd android/app
keytool -genkey -v -keystore plan-perfect-day-release.keystore \
  -alias plan-perfect-day \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Important**: Save your keystore password securely! You'll need it for all future updates.

## Step 2: Configure Signing 📝

Create `android/app/key.properties`:
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD  
keyAlias=plan-perfect-day
storeFile=plan-perfect-day-release.keystore
```

Update `android/app/build.gradle` to use release signing (add above android block):
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('app/key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

And update signingConfigs section:
```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

## Step 3: Build Release AAB 🏗️

```bash
# Use the automated script
./build-release.sh

# OR manually:
npm run build
cp -r dist/public www
npx cap sync android
cd android
./gradlew bundleRelease
```

Your AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Step 4: Google Play Console Setup 📱

### 4.1 Create Developer Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay $25 registration fee (one-time)
3. Complete developer profile

### 4.2 Create New App
1. Click "Create app"
2. **App name**: "Plan Your Perfect Day"
3. **Default language**: English (United States)
4. **App or game**: App
5. **Free or paid**: Free
6. Check declarations and create

## Step 5: Upload App Bundle 📤

1. Go to **Production** → **Releases**
2. Click **Create new release**
3. Upload `app-release.aab`
4. Add release notes:
   ```
   Initial release of Plan Your Perfect Day - AI-powered itinerary planner for London, NYC, Boston, and Austin.
   
   Features:
   • Smart AI recommendations
   • Real-time venue information  
   • Weather-aware planning
   • Interactive maps and directions
   ```

## Step 6: Store Listing 🛍️

### 6.1 Main Store Listing
- **App name**: Plan Your Perfect Day
- **Short description**: AI-powered day planner for London, NYC, Boston & Austin. Smart itineraries!
- **Full description**: Use content from `store-assets/store-listing.md`
- **App icon**: Use `client/public/icon-512.png`

### 6.2 Graphics (Required Screenshots)
You need to take screenshots of your app running. Install the app locally and capture:

**Phone screenshots** (at least 2):
- Home screen with city selection
- Example itinerary for London
- Map view with directions
- Activity details screen

**Tablet screenshots** (at least 1):
- Wide view of itinerary with map

**Feature graphic** (1024x500px):
- Create a banner with app logo and tagline

### 6.3 Categorization
- **App category**: Travel & Local
- **Tags**: travel, itinerary, AI, day planner, tourist guide

## Step 7: App Content 📋

### 7.1 Content Rating
Complete questionnaire (will likely be "Everyone" rating):
- Educational content: No
- Violence: No
- Sexual content: No
- Profanity: No
- Controlled substances: No
- Gambling: No

### 7.2 Target Audience
- **Target age group**: 18 and over
- **Appeals to children**: No

### 7.3 Privacy Policy
- **Privacy policy URL**: https://planyourperfectday.app/privacy
- Upload the privacy policy from `store-assets/privacy-policy.md` to your website

### 7.4 App Access
- **Special access**: Location (for venue recommendations)
- **Permissions**: Internet, Location (when granted)

### 7.5 Data Safety
Complete data safety form:
- **Location**: Collected, not shared, used for app functionality
- **App activity**: Analytics for improvement
- **Device identifiers**: For analytics only

## Step 8: Pricing & Distribution 💰

- **Price**: Free
- **Countries**: All available countries
- **Device categories**: Phone and Tablet
- **Android requirements**: API level 21+ (Android 5.0+)

## Step 9: Review & Publish 🚀

### 9.1 Pre-submission Checklist
- [ ] App bundle uploaded and signed
- [ ] Store listing complete with all required assets
- [ ] Screenshots for all device types
- [ ] Content rating completed
- [ ] Data safety form filled
- [ ] Privacy policy accessible online
- [ ] Target audience selected
- [ ] Distribution countries selected

### 9.2 Submit for Review
1. Review all sections for completeness
2. Click **Send for review**
3. Wait 1-3 business days for approval

## Step 10: Post-Launch 📈

After approval:
- **Monitor reviews** and respond promptly
- **Update regularly** with new features and cities
- **Track analytics** in Play Console
- **Version updates** follow same process with incremented versionCode

## 🎯 Quick Start Commands

```bash
# 1. Generate keystore (one-time)
cd android/app && keytool -genkey -v -keystore plan-perfect-day-release.keystore -alias plan-perfect-day -keyalg RSA -keysize 2048 -validity 10000

# 2. Create key.properties with your passwords

# 3. Build release
./build-release.sh

# 4. Upload app-release.aab to Play Console
```

## 🎉 Your App Will Be Live!

Once approved, users can download "Plan Your Perfect Day" from Google Play Store and start creating amazing city itineraries!

**Timeline**: 1-3 business days for review + approval