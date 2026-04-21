# TestFlight Timeout Handoff (for Claude)

Date: 2026-03-25 (CST)

## Summary
TestFlight builds are still timing out for itinerary generation. Backend appears healthy when tested directly, but device app shows `URLSessionTask failed: The network connection was lost` (NSURLErrorDomain -1005) or timeouts on some requests (not consistently reproducible). Claude should focus on client-side request robustness and server latency tail reduction.

## Current Status
- Production backend is live and returns real venues.
- Photos are now working in the app.
- The remaining issue is intermittent timeouts on TestFlight builds.
- TestFlight build number was bumped locally to 11, but upload blocked by App Store Connect auth on this machine.

## Repro From User
- Device: iOS (TestFlight build 8 was used by the user in reports; newer builds may not be installed).
- City: London / NYC.
- Query: "Lunch in Mayfair and dinner in Holborn" (and similar).
- Error screenshot: `Network error: URLSessionTask failed with error: The network connection was lost.`

## What Was Already Changed
### Backend
- Default model is Gemini 2.5 Flash.
- Added per-call timeouts (Gemini/Places/Routes) and release-gate testing script.
- Vercel max duration raised to 120s.
- Photo proxy now serves images directly rather than redirect.

### iOS Client
- Increased request timeouts: generation requests to 90s, overall resource timeout 120s.
- Added retry logic for transient transport errors (NSURLErrorNetworkConnectionLost) in `APIClient.swift`.
- Added `waitsForConnectivity = true`.

## Files of Interest
### iOS
- `ios-native/Sources/Services/APIClient.swift`
  - Request timeout settings and retry policy.
  - Where to add more robust retry or background session if needed.
- `ios-native/Sources/Views/GeneratingLoadingView.swift`
  - Loading screen logic (unrelated to timeouts but recently changed).

### Backend
- `server/services/ItineraryPlanner.ts`
  - Orchestrates Gemini + Places + Routes.
  - Add timing logs here to identify slow segments.
- `server/lib/gemini.ts`
  - Model selection and Gemini call timeouts.
- `server/services/PlacesValidator.ts`
  - Places fetch and fallback handling.
- `server/services/RouteTimeService.ts`
  - Route requests + timeout.
- `vercel.json`
  - `maxDuration` set to 120.

## Why It Might Still Timeout
1. Device-side transport drops on mobile networks (5G/unstable connectivity).
2. Request time exceeds 90s on certain queries (long tail).
3. Responses are large and connection is lost mid-response.
4. TestFlight build is stale and still using older client logic (no retry).

## Suggested Fix Directions
### Client-side
- Add idempotent retry with backoff only on `NSURLErrorNetworkConnectionLost` and `timedOut`.
- Consider switching the itinerary POST to a background session or using `URLSessionConfiguration.waitsForConnectivity` and `timeoutIntervalForResource`.
- Add a user-visible retry button when the error is -1005, so they can resubmit.

### Server-side
- Add structured timing logs per step for every request (Gemini parse, grounded search, Places, Routes).
- Consider early streaming or returning a partial itinerary quickly while alternatives load.
- Clamp max stops or stop-duration expansion when runtime exceeds threshold.

## Verification Checklist
1. `curl -X POST https://london-day-planner-1.vercel.app/api/london/plan -d ...` returns within 30s for 2-4 stop queries.
2. Confirm TestFlight build includes latest `APIClient.swift` retry changes.
3. Confirm timeout error no longer occurs when reproducing with a mobile network on-device.

## Current Blocker
TestFlight upload is blocked on this machine due to:
- `xcodebuild -exportArchive` -> `No Accounts with App Store Connect Access`.
Claude will need App Store Connect credentials or an API key to upload new builds.

