# Itinerary Release Gate

This is the minimum verification standard before any itinerary-related backend deploy or TestFlight upload.

## Production Default

- Default runtime model: `gemini-2.5-flash`
- Preview models are opt-in only and must not replace the default path without a separate validation pass.

## Gate 1: Static + Unit Verification

Run these first:

```bash
cd /Users/carlos/LondonDayPlanner-1
npm run build:server
npx vitest --root /Users/carlos/LondonDayPlanner-1/server run services/QueryClassifier.test.ts services/ItineraryPlanner.test.ts
```

These must prove:

- Two-stop queries are classified as `complex`
- Queries without explicit separators still split into multiple activities when appropriate
- Fallback parsing keeps multi-stop requests multi-stop
- Stay-duration heuristics do not change venue selection
- Default classification model remains `gemini-2.5-flash`

## Gate 2: Backend Smoke Tests

Run the release-gate script against either local or production:

Production:

```bash
cd /Users/carlos/LondonDayPlanner-1
npm run verify:itinerary-gate
```

Local:

```bash
cd /Users/carlos/LondonDayPlanner-1
source .env.local
PORT=3099 npx tsx server/index.ts
```

In a second shell:

```bash
cd /Users/carlos/LondonDayPlanner-1
RELEASE_GATE_BASE_URL=http://127.0.0.1:3099 npm run verify:itinerary-gate
```

The smoke suite currently requires all of the following to pass:

- London two-stop dining
- London four-stop mixed day
- NYC two-stop day
- Austin two-stop day

Each case must satisfy:

- HTTP `200`
- no API error payload
- minimum expected venue count
- exact expected travel-leg count for the canonical query
- no placeholder venue copy like `No specific venue found`
- every top-level venue includes a `photoUrl`
- the first venue photo resolves to a real `image/*` response
- total processing time stays within the case threshold

## Gate 3: Simulator Verification

Before TestFlight, verify the current binary in Simulator.

Required checks:

- Home screen loads without stale localization keys
- A canonical London two-stop query generates successfully
- Venue cards show left-side thumbnails
- Detail screen shows the hero image and alternative thumbnails
- `Add to My Trips` changes state only after a real save
- `My Trips` reopens the saved itinerary snapshot
- Map screen opens and the bottom info card remains readable

Recommended test prompts:

- `lunch in Mayfair, dinner in Holborn`
- `coffee in West Village, dinner in Soho`
- `coffee near UT Austin, dinner downtown`

## Gate 4: TestFlight Readiness

Do not upload a new build until all of these are true:

- Gate 1 passes locally
- Gate 2 passes locally
- Gate 2 passes against production after deploy
- Gate 3 passes in Simulator on the exact binary being uploaded
- App Store Connect authentication is valid on the build machine

## Operational Debugging Standard

The planner now logs per-step timings in `ItineraryPlanner`:

- `classifyMs`
- `parseMs`
- `extractMs`
- `discoverMs`
- `buildMs`
- `totalMs`
- `parsedVia`
- `model`

If a request stalls, use these timings first before changing models or UI.
