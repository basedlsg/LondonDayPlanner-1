# 🚀 Android App Store Release Guide

## Step 1: Generate Release Keystore

```bash
# Navigate to android/app directory
cd android/app

# Generate keystore (you'll be prompted for passwords and details)
keytool -genkey -v -keystore plan-perfect-day-release.keystore \
  -alias plan-perfect-day \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# When prompted, use these details:
# Keystore password: [SECURE PASSWORD - SAVE THIS!]
# Key password: [SAME AS KEYSTORE PASSWORD]
# First/Last name: Plan Your Perfect Day
# Organization unit: PlanYourPerfectDay.app
# Organization: PlanYourPerfectDay.app
# City: [Your city]
# State: [Your state]
# Country code: [Your country code]
```

## Step 2: Configure Signing

Create `android/app/key.properties`:
```properties
storePassword=[YOUR_KEYSTORE_PASSWORD]
keyPassword=[YOUR_KEY_PASSWORD]
keyAlias=plan-perfect-day
storeFile=plan-perfect-day-release.keystore
```

## Step 3: Update build.gradle

Add to `android/app/build.gradle` (above android block):
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('app/key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
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
}
```

## Step 4: Build Release AAB

```bash
# From project root
cd android
./gradlew bundleRelease

# Your AAB will be at:
# android/app/build/outputs/bundle/release/app-release.aab
```

## Step 5: Google Play Console Setup

1. **Create Developer Account**: Go to [Google Play Console](https://play.google.com/console)
2. **Pay Registration Fee**: $25 one-time fee
3. **Create New App**:
   - App name: "Plan Your Perfect Day"
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free

## Step 6: App Store Listing

### Required Assets:
- **High-res icon**: 512 x 512 px (provided: icon-512.png)
- **Feature graphic**: 1024 x 500 px
- **Phone screenshots**: At least 2, up to 8 (1080 x 1920 px)
- **7-inch tablet screenshots**: At least 1 (1200 x 1920 px)
- **10-inch tablet screenshots**: At least 1 (1920 x 1200 px)

### App Description:
```
Plan Your Perfect Day - AI-Powered City Exploration

Transform your city visits into unforgettable experiences with our intelligent day planner. Whether you're exploring London, New York, Boston, or Austin, our AI creates personalized itineraries that match your preferences and timing.

✨ FEATURES:
• Smart AI recommendations powered by Google Gemini
• Real-time venue information via Google Places
• Weather-aware planning
• Interactive maps and directions
• Customizable timing and preferences
• Share itineraries with friends

🌟 PERFECT FOR:
• Tourists discovering new cities
• Locals finding hidden gems
• Date planning and special occasions
• Business travelers with limited time
• Food enthusiasts and culture seekers

🏙️ SUPPORTED CITIES:
Currently available for London, New York City, Boston, and Austin, with more cities coming soon!

Plan smarter, explore better, create memories that last.
```

### Short Description:
```
AI-powered day planner for London, NYC, Boston & Austin. Create perfect itineraries with smart recommendations, real-time info, and weather awareness.
```

## Step 7: Upload and Review

1. **Upload AAB**: In Play Console → App bundles
2. **Complete Store Listing**: Add descriptions, screenshots, and assets
3. **Content Rating**: Complete questionnaire
4. **App Content**: Declare target audience and content
5. **Pricing**: Set to Free
6. **Submit for Review**: Usually takes 1-3 days

## 🎯 Quick Checklist

- [ ] Keystore generated and secured
- [ ] Release build configuration set up
- [ ] AAB file built successfully
- [ ] Google Play developer account created
- [ ] App listing created with all required assets
- [ ] Screenshots taken for all device types
- [ ] Content rating questionnaire completed
- [ ] App submitted for review

## 📱 Testing Before Release

```bash
# Install AAB locally for testing
bundletool build-apks --bundle=app-release.aab --output=app-release.apks
bundletool install-apks --apks=app-release.apks
```

Your app will be live on Google Play Store within 1-3 business days after approval! 🎉