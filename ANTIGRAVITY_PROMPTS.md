# Anti-Gravity Prompts (iOS-first, Android next, WhatsApp after, WeChat later)

This file contains copy-paste prompts for Antigravity IDE to execute. Each prompt is a self-contained task with success criteria. Defaults are already chosen to keep things simple and forward-compatible.

## Chosen defaults (do NOT ask questions)
- Canonical web build output: `www`.
- Backend services: Google (Maps/Places + Gemini). Hosting: Firebase (Functions + Hosting).
- iOS target: latest iOS 26 with Liquid Glass design system.
- Android target: latest Play requirement (target API 35 or higher).
- WeChat map provider: Tencent Maps (Tencent LBS WebService API).
- WhatsApp integration: simple share via Click-to-Chat link.

---

## Prompt 01 — Align build output to `www`

Goal: Make `www` the single canonical web build output so Capacitor + Firebase hosting are always in sync.

Do:
1) Update `vite.config.ts` build output to `www` (replace `dist` output).
2) Ensure `capacitor.config.ts` remains `webDir: 'www'`.
3) Update `build-release.sh` to remove the `cp -r dist/public www` step or adjust it to use the new output. Make sure iOS and Android builds pull from `www`.
4) Verify `firebase.json` hosting `public` stays `www`.

Success:
- `npm run build:client` outputs into `www`.
- `npx cap sync ios` and `npx cap sync android` pick up the same build.
- Firebase Hosting uses the same `www` build without extra copying.

---

## Prompt 02 — Backend on Google services (no refactor)

Goal: Keep existing backend code, but ensure Google services are the backbone.

Do:
1) Confirm Google APIs used in `functions/` (Places + Gemini + Weather if used) are referenced in environment variables and error handling.
2) Keep Firebase Functions as the API runtime; it already fits Google-services requirement.
3) Add/confirm centralized rate limit and error logging for Google API calls.

Success:
- API is stable under rate limits.
- No backend rewrite required.

---

## Prompt 03 — iOS 26 (Liquid Glass) build first

Goal: Build and ship the iOS app first, aligned to iOS 26 and Liquid Glass design language.

Do:
1) Upgrade Capacitor to the newest major version compatible with Xcode 26.
2) Sync iOS platform, open `ios/App/App.xcworkspace` in Xcode.
3) Validate permissions: location, network, photo export (if PDF/share).
4) Implement iOS-specific UI polish in the web UI to reflect Liquid Glass (blurred/translucent layers, depth, soft borders) while keeping accessibility (contrast, minimum hit areas).
5) Run device tests on iOS 26 beta/dev builds (real device + simulator).

Success:
- iOS build runs on iOS 26 devices.
- UI respects Liquid Glass design cues without harming readability.

---

## Prompt 04 — Android build (latest)

Goal: Build Android after iOS and ensure Play compliance.

Do:
1) Set Android target/compile SDK to API 35+ in Gradle config.
2) Ensure permissions align with location usage (foreground).
3) Build release AAB and verify install on a physical device.
4) Verify Material 3 theming consistency in the web UI (spacing, typography, color contrast) for Android look-and-feel.

Success:
- `./gradlew bundleRelease` succeeds.
- App installs and works on Android 15+ devices.

---

## Prompt 05 — WhatsApp integration (simple share)

Goal: Add the simplest WhatsApp integration that works everywhere.

Do:
1) Add a Share button in the itinerary view.
2) Implement a `wa.me` Click-to-Chat link with URL-encoded itinerary text.
3) Provide fallback to system share sheet if WhatsApp is not installed.

Success:
- One-tap opens WhatsApp with itinerary text pre-filled.

---

## Prompt 06 — WeChat Mini Program (Tencent Maps)

Goal: Prepare for WeChat Mini Program using Tencent Maps + LBS WebService API.

Do:
1) Implement a provider adapter for POI search, details, and routing.
2) Start with Tencent Maps WebService API and honor daily quota limits.
3) Use WeChat `map` component with Tencent Maps provider.
4) Normalize POI fields to match the existing backend shape (name, address, lat/lng, categories, hours).

Success:
- Mini program can search POIs, show pins, and create a basic itinerary.

---

## Prompt 07 — QA gates (iOS/Android/WeChat)

Goal: No regressions and predictable user flow.

Do:
1) Run full itinerary creation flow on at least 2 devices per platform.
2) Validate location permission prompts.
3) Validate PDF export and share.
4) Validate map routing and place details.

Success:
- All platforms pass the same core user journey without crashes.

