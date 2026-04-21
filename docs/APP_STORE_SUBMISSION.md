# App Store Submission Guide

This guide outlines the steps to prepare and submit your iOS application "Plan Your Perfect Day" to the Apple App Store.

## 1. Prerequisites

-   **Apple Developer Program Membership:** You must have an active membership ($99/year).
-   **App Store Connect Access:** Ensure you can log in to [App Store Connect](https://appstoreconnect.apple.com).
-   **Xcode:** Latest stable version recommended.

## 2. Prepare the App for Release

### App Icons and Launch Screen
-   Ensure all required App Icon sizes are present in `Assets.xcassets`.
-   Verify `LaunchScreen.storyboard` or launch configuration is correct.

### Capabilities and Entitlements
-   Verify all capabilities (e.g., Push Notifications, Apple Sign-In) are correctly configured in the `Signing & Capabilities` tab.
-   Ensure usage strings (e.g., `NSLocationWhenInUseUsageDescription`) in `Info.plist` are descriptive and localized.

### Versioning
-   Increment the **Version** (e.g., 1.0.0 -> 1.0.1) and **Build** strings in the General target settings.

## 3. Certificates, Identifiers, and Profiles

1.  **Identifier:**
    -   Go to [Apple Developer Portal > Identifiers](https://developer.apple.com/account/resources/identifiers).
    -   Ensure your Bundle ID (`com.carlos.PlanYourPerfectDay`) is registered.
    -   Enable necessary capabilities (iCloud, Push Notifications, etc.).

2.  **Certificate:**
    -   Create a **Distribution Certificate** (Apple Distribution) if you don't have one.

3.  **Provisioning Profile:**
    -   Create an **App Store Distribution** provisioning profile linked to your App ID and Distribution Certificate.
    -   *Note: Xcode's "Automatically manage signing" often handles this for you.*

## 4. Archiving and Uploading

1.  **Set Build Device:**
    -   In Xcode, select **Generic iOS Device** or **Any iOS Device (arm64)** as the build target.

2.  **Archive:**
    -   Go to **Product > Archive**.
    -   Wait for the build to complete. The Organizer window will open.

3.  **Validate:**
    -   Select the latest archive in Organizer.
    -   Click **Validate App**.
    -   Address any validation errors (e.g., missing icons, invalid plist keys).

4.  **Distribute:**
    -   Click **Distribute App**.
    -   Select **App Store Connect** > **Upload**.
    -   Follow the wizard (keep "Upload your app's symbols" checked for crash logs).
    -   Xcode will upload the build to App Store Connect.

## 5. App Store Connect Setup

1.  **Create New App:**
    -   Log in to App Store Connect.
    -   Go to **My Apps** > **(+) New App**.
    -   Platform: iOS.
    -   Name: "Plan Your Perfect Day".
    -   Primary Language: English (US).
    -   Bundle ID: Select correct ID.
    -   SKU: Unique internal ID (e.g., `PLAN_001`).

2.  **App Information:**
    -   **Subtitle:** "AI-powered itineraries for your city"
    -   **Category:** Travel / Lifestyle.
    -   **Content Rights:** Confirm you have rights to use all content.
    -   **Age Rating:** Complete the questionnaire.

3.  **Pricing and Availability:**
    -   Set your price tier (e.g., Free).
    -   Select territories (Select specific countries or all).

## 6. App Store Listing

1.  **Metadata:**
    -   **Description:** Detailed description of features.
    -   **Keywords:** e.g., "london, travel, itinerary, ai, planner".
    -   **Support URL** and **Marketing URL**.

2.  **Screenshots:**
    -   Upload screenshots for required device sizes (6.5" and 5.5" displays are mandatory for iPhone).
    -   *Tip: Use the simulator to capture these (Cmd+S).*

3.  **Localization:**
    -   Select "Simplified Chinese" from the language dropdown.
    -   Provide localized Name, Subtitle, Description, Keywords, and Screenshots for the Chinese store.

## 7. Submission for Review

1.  **Select Build:**
    -   Scroll down to the **Build** section.
    -   Click **Add Build** and select the version you uploaded from Xcode.
    -   *Note: It may take 10-30 minutes for the build to process after upload.*

2.  **Export Compliance:**
    -   Answer questions about encryption (usually "No" or standard encryption).

3.  **Submit:**
    -   Click **Save**.
    -   Click **Add for Review**.
    -   Click **Submit to App Review**.

## 8. Post-Submission

-   **Waiting for Review:** Apple typically reviews apps within 24-48 hours.
-   **Rejected:** If rejected, check the Resolution Center for details, fix the issue, and submit a new binary.
-   **Approved:** The status will change to "Pending Developer Release" or "Ready for Sale" depending on your release settings.

---

**Note:** For the WeChat Mini-Program (planned later), the process involves the WeChat Official Accounts Platform and requires a Chinese business license or specific international developer credentials.
