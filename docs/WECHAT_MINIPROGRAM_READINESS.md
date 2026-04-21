# WeChat Mini Program Readiness

Updated: 2026-03-23

## Goal

Turn London Day Planner into a WeChat Mini Program with the least possible backend churn:

- reuse the current planner backend where possible
- rebuild the client as a Mini Program frontend
- keep Gemini / Google APIs server-side
- start with local saved trips if needed

## Current Assets We Already Have

These parts of the product already map well to a Mini Program:

- Existing backend API on Vercel:
  - `GET /api/cities`
  - `GET /api/cities/:slug`
  - `POST /api/:city/plan`
- Existing itinerary and city data models in [Models.swift](/Users/carlos/LondonDayPlanner-1/ios-native/Sources/Models/Models.swift)
- Existing screen structure in [ContentView.swift](/Users/carlos/LondonDayPlanner-1/ios-native/Sources/App/ContentView.swift):
  - `Plan`
  - `Trips`
  - `Explore`
  - `Settings`
- Existing backend secrets that can remain server-side:
  - `GEMINI_API_KEY`
  - `GOOGLE_PLACES_API_KEY`
  - `GOOGLE_WEATHER_API_KEY`

## What Codex Can Do

These are tasks that can be completed inside this repo once the platform prerequisites exist.

### Frontend

- Create the Mini Program project structure
- Build Mini Program pages for:
  - Plan
  - Trips
  - Explore
  - Settings
  - itinerary detail
  - venue detail
  - map view
- Recreate the current design system in WXML/WXSS/JS or TypeScript
- Implement local trip persistence with `wx.setStorageSync`
- Implement WeChat-native map flows with:
  - `map`
  - `wx.openLocation`
- Connect the Mini Program frontend to the existing backend with `wx.request`

### Backend

- Add a WeChat login exchange endpoint if you want account sync
- Adjust response shapes if the Mini Program needs lighter payloads
- Add Mini Program specific auth/session handling
- Add domain/CORS-safe deployment paths if needed
- Prepare a China-friendly API access layer if you decide not to use the current public Vercel domain directly

### Delivery / Tooling

- Set up `miniprogram-ci` scripts for upload and preview
- Wire the upload flow once `appid` and upload key are available
- Produce a release checklist for test, review, and push

## What You Need To Do

These items require your WeChat platform access, business setup, or external credentials.

### 1. Create or provide the Mini Program

You need:

- a WeChat Mini Program account
- the Mini Program `AppID`
- admin/developer access in the WeChat console

Without that, the Mini Program cannot be built, previewed, uploaded, or reviewed against a real app target.

### 2. Decide the backend domain path

For production Mini Programs, WeChat requires request domains to be:

- `https`
- configured in the Mini Program console
- not `localhost`
- not raw IP
- ICP-filed

This means you need to choose one of these paths:

#### Option A: Use your own compliant domain

You provide:

- a production API domain such as `api.yourdomain.com`
- ICP filing for that domain
- valid TLS certificate

Then Codex can:

- point the Mini Program at that domain
- configure the backend/API routing

#### Option B: Move the backend entrypoint to WeChat Cloud Hosting

You provide:

- a WeChat Cloud Hosting environment

Then Codex can:

- adapt deployment and API calls to that environment

This is the cleanest path if domain compliance becomes a blocker.

### 3. Generate the code upload key

If you want preview/upload automation with `miniprogram-ci`, you need to generate and download the Mini Program code upload private key from the WeChat console.

You need:

- Mini Program `AppID`
- code upload private key file
- optional IP whitelist entry for the machine or CI runner

Then Codex can:

- set up scripted preview builds
- set up scripted uploads
- run CI-based push flows

### 4. Add test users / experience members

For non-admin real-device testing, you need to add experience members in the WeChat console.

Codex cannot do this from the repo alone.

### 5. If login/sync is required, provide AppSecret access

If you want user identity and synced trips:

- you must provide the Mini Program `AppSecret`
- it must live only on the server

Then Codex can:

- add a backend login exchange endpoint
- implement Mini Program auth flow
- persist synced trips to backend storage

### 6. If payments are required, complete WeChat Pay onboarding

If premium subscriptions or payments are part of the Mini Program:

- you need a WeChat Pay merchant account
- `mchid`
- API v3 key
- merchant private key
- certificate serial number
- Mini Program bound to that merchant

Codex can implement the payment flow once those are available, but cannot create or approve the merchant setup.

### 7. Complete privacy and category declarations

Because this app uses location/map features, you need WeChat console setup for:

- privacy declarations
- service category selection
- any additional review metadata required by the Mini Program platform

Codex can prepare the technical implementation and the checklist, but you need console access to configure and submit it.

## Recommended MVP Scope

To reduce risk, the first Mini Program version should be:

- same planner backend
- no payments
- local-only saved trips
- optional login deferred
- WeChat built-in map/location experience

This avoids the two biggest external blockers:

- WeChat Pay onboarding
- backend user auth complexity

## Concrete Checklist

### Phase 0: External prerequisites

User-owned:

- [ ] Mini Program account exists
- [ ] `AppID` available
- [ ] developer/admin access available
- [ ] decide backend domain path:
  - [ ] compliant custom domain
  - or
  - [ ] WeChat Cloud Hosting
- [ ] if using custom domain:
  - [ ] ICP filing complete
  - [ ] TLS certificate valid
  - [ ] request domain can be added in WeChat console
- [ ] if using CI upload:
  - [ ] code upload private key generated
  - [ ] key downloaded securely
  - [ ] CI/upload IP added to whitelist if enabled
- [ ] if using login/sync:
  - [ ] `AppSecret` available for backend
- [ ] if using payments:
  - [ ] WeChat Pay merchant fully onboarded

### Phase 1: Repo work Codex can do

Codex-owned:

- [ ] create Mini Program project skeleton
- [ ] add tab pages for Plan / Trips / Explore / Settings
- [ ] add itinerary detail page
- [ ] add venue detail page
- [ ] add Mini Program API layer using `wx.request`
- [ ] wire city fetch and itinerary generation
- [ ] implement local `My Trips` storage
- [ ] implement WeChat map flows
- [ ] add loading / error / offline states

### Phase 2: Real-device test readiness

Shared:

- [ ] request domain configured in WeChat console
- [ ] preview/upload script working
- [ ] experience members added
- [ ] real-device test against live backend

### Phase 3: Push readiness

Shared:

- [ ] privacy declaration completed
- [ ] categories/service metadata completed
- [ ] review build uploaded
- [ ] review submission completed

## Estimated Timeline

Assuming coding is not the main issue and backend reuse is allowed:

### Fastest testable path

- DevTools-only prototype: `1 to 3 days`
- Real-device testable build: `3 to 7 days`

This assumes:

- `AppID` is available
- request domain path is solved quickly
- no login or payments in phase 1

### MVP Mini Program

- `2 to 4 weeks`

This covers:

- full frontend port
- local trip saving
- real-device testing
- upload/review setup

### Production push with login and sync

- `4 to 6 weeks`

### Production push with payments

- `6 to 10+ weeks`

The longest non-coding item is usually:

- domain/compliance setup
- or WeChat Pay onboarding

## Highest-Risk Blockers

These are the likely blockers before coding quality becomes relevant:

### 1. Request domain compliance

If the current backend domain cannot be used as a Mini Program request domain in production, this must be solved before real release.

### 2. Missing upload key / console access

Without the code upload key and console access, automated preview/upload cannot be completed.

### 3. Privacy and review configuration

Map/location features will force proper privacy setup.

### 4. Payments, if included

WeChat Pay onboarding is a separate project, not a small toggle.

## Recommended Decision

Use this order:

1. Confirm Mini Program `AppID`
2. Confirm the production API domain path
3. Start with local-only saved trips
4. Defer sync/login unless clearly needed for v1
5. Defer payments until after the first Mini Program is working

## Official References

- Mini Program dev guide:
  - https://developers.weixin.qq.com/miniprogram/dev/framework/
- Global config / `app.json` / `tabBar`:
  - https://developers.weixin.qq.com/miniprogram/dev/framework/config.html
- Mini Program login:
  - https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html
- Server-side login API group:
  - https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
- Network rules and request domain requirements:
  - https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html
- Request API:
  - https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
- Local storage:
  - https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html
- Map component:
  - https://developers.weixin.qq.com/miniprogram/dev/component/map.html
- Open location:
  - https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.openLocation.html
- Privacy flow:
  - https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html
- Skyline renderer:
  - https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/introduction.html
- CI upload / code upload key:
  - https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html
