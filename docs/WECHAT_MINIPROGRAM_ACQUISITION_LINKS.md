# WeChat Mini Program Acquisition Links

Updated: 2026-03-23

## Purpose

This document answers two practical questions for turning London Day Planner into a WeChat Mini Program:

1. What do we need to acquire outside the codebase?
2. What can Codex do now vs what requires your platform/business access?

This is the operational companion to [WECHAT_MINIPROGRAM_READINESS.md](/Users/carlos/LondonDayPlanner-1/docs/WECHAT_MINIPROGRAM_READINESS.md).

## Fast Answer

The minimum external items you need before I can build and test this against a real Mini Program are:

1. A WeChat Mini Program account and `AppID`
2. WeChat DevTools
3. A production request-domain strategy:
   - an ICP-filed custom domain
   - or WeChat Cloud Hosting
4. A Mini Program code upload private key if you want preview/upload automation

Optional but likely phase-2 items:

1. `AppSecret` if you want WeChat login and synced trips
2. WeChat Pay merchant credentials if payments are in scope

## What We Already Have

These do not need to be re-acquired for a first Mini Program version:

- Existing planner backend endpoints on Vercel
- Existing server-side Gemini / Google integrations
- Existing city and itinerary data model concepts
- Existing app information architecture: `Plan`, `Trips`, `Explore`, `Settings`

Important: the current backend secrets should stay server-side. No new client-side Gemini or Google keys are needed for phase 1.

- `GEMINI_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_WEATHER_API_KEY`

## Ownership Matrix

| Item | Why it is needed | Needed for | Owner | Exact link | Notes |
| --- | --- | --- | --- | --- | --- |
| Mini Program registration | Creates the actual Mini Program and gives us an `AppID` | Real build target, preview, upload, push | You | [https://mp.weixin.qq.com/cgi-bin/registermidpage?action=index&lang=zh_CN](https://mp.weixin.qq.com/cgi-bin/registermidpage?action=index&lang=zh_CN) | This is the official registration entry page |
| WeChat public platform console | Admin console for the Mini Program | All platform setup | You | [https://mp.weixin.qq.com/](https://mp.weixin.qq.com/) | Use this for AppID, AppSecret, request domains, upload key, testers |
| WeChat DevTools overview | Official tooling page | Local development and preview workflow | You | [https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html) | Official docs entry |
| WeChat DevTools stable download | Download the desktop dev tool | Local development and preview workflow | You | [https://developers.weixin.qq.com/miniprogram/dev/devtools/stable.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/stable.html) | Use the stable build unless you have a reason not to |
| Request-domain rules | Defines what production API domains are allowed | Real-device testing and production | Shared | [https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html) | This is the key constraint page |
| WeChat Cloud Hosting | Alternative to solving domain/hosting manually | Real-device testing and production | You chooses, Codex implements | [https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/basic/intro.html](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/basic/intro.html) | Strong fallback if custom-domain compliance becomes the blocker |
| Code upload private key / CI setup | Required for scripted preview and upload | Preview, CI, push | You generates, Codex wires | [https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html) | Official setup doc for `miniprogram-ci` |
| Privacy / user data compliance | Required because the app uses maps and can use location | Real-device testing, review, push | Shared | [https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html) | Mandatory if we use privacy-related APIs |
| WeChat login client API | Needed only if we add account sync | Login / synced trips | Codex implements after you provide console access | [https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html) | Frontend side only |
| WeChat server login exchange | Needed only if we add account sync | Login / synced trips | Codex implements after you provide `AppSecret` | [https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html) | Backend side only |
| WeChat Pay merchant platform | Needed only if payments stay in scope | Payments | You | [https://pay.weixin.qq.com/](https://pay.weixin.qq.com/) | Merchant onboarding is separate from Mini Program setup |
| WeChat Pay merchant docs | Needed if we later implement pay flows | Payments | Shared | [https://pay.weixin.qq.com/doc/v3/merchant/4012062524](https://pay.weixin.qq.com/doc/v3/merchant/4012062524) | Official merchant API/docs entry |

## What You Need To Do

### Required for real Mini Program development

1. Register or provide the Mini Program.
   - Link: [https://mp.weixin.qq.com/cgi-bin/registermidpage?action=index&lang=zh_CN](https://mp.weixin.qq.com/cgi-bin/registermidpage?action=index&lang=zh_CN)
   - Output needed from you:
     - `AppID`
     - admin/developer access

2. Install WeChat DevTools.
   - Link: [https://developers.weixin.qq.com/miniprogram/dev/devtools/stable.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/stable.html)

3. Pick the production request-domain path.
   - Option A: ICP-filed custom domain that proxies or fronts the backend
   - Option B: WeChat Cloud Hosting
   - Rule doc: [https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
   - Cloud Hosting: [https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/basic/intro.html](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/basic/intro.html)

4. Generate the code upload private key if you want preview/upload automation.
   - Link: [https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)
   - Console path:
     - `微信公众平台 -> 管理 -> 开发管理 -> 开发设置 -> 小程序代码上传`
   - Output needed from you:
     - private key file
     - whether IP whitelist is enabled

5. Configure privacy declarations if we use location/map-related APIs.
   - Link: [https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)
   - Console path for the declaration itself is managed in the Mini Program backend

### Required only if we want login/sync

1. Provide Mini Program `AppSecret`.
   - Console home: [https://mp.weixin.qq.com/](https://mp.weixin.qq.com/)
   - Typical console path:
     - `微信公众平台 -> 管理 -> 开发管理 -> 开发设置`
   - Keep it server-side only

2. Confirm that synced trips are in scope.
   - If not, I will keep `My Trips` local-only for the first version

### Required only if payments are in scope

1. Complete WeChat Pay merchant onboarding.
   - Merchant platform: [https://pay.weixin.qq.com/](https://pay.weixin.qq.com/)
   - Merchant docs: [https://pay.weixin.qq.com/doc/v3/merchant/4012062524](https://pay.weixin.qq.com/doc/v3/merchant/4012062524)
   - Output needed from you:
     - `mchid`
     - API v3 key
     - merchant private key
     - certificate serial number

## What Codex Can Do Right Now

These do not require new external keys first:

1. Create the Mini Program repo/app structure
2. Map current app IA into Mini Program pages:
   - `Plan`
   - `Trips`
   - `Explore`
   - `Settings`
   - itinerary detail
   - venue detail
   - map page
3. Rebuild the existing client UX in Mini Program UI code
4. Reuse the current planner backend contract
5. Keep saved trips local-only initially
6. Prepare upload scripts so they are ready once `AppID` and private key exist

## What Codex Can Only Do After You Provide Something

| Blocked work | What I need from you first |
| --- | --- |
| Bind the Mini Program to the real app target | `AppID` |
| Real-device testing against a real backend | compliant request-domain path |
| Scripted preview/upload | code upload private key |
| WeChat login backend | `AppSecret` |
| Synced `My Trips` | `AppSecret` and your product decision to enable login |
| WeChat Pay integration | merchant onboarding complete |

## Exact Console Paths For the Non-Link Items

Some items do not have a stable public deep link. For those, use the official console home and follow the click path.

### AppID / AppSecret

- Console home: [https://mp.weixin.qq.com/](https://mp.weixin.qq.com/)
- Path:
  - `微信公众平台 -> 管理 -> 开发管理 -> 开发设置`

### Request domains

- Console home: [https://mp.weixin.qq.com/](https://mp.weixin.qq.com/)
- Rule doc: [https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- Path:
  - `微信公众平台 -> 开发 -> 开发设置 -> 服务器域名`

### Code upload private key

- Console home: [https://mp.weixin.qq.com/](https://mp.weixin.qq.com/)
- CI doc: [https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)
- Path:
  - `微信公众平台 -> 管理 -> 开发管理 -> 开发设置 -> 小程序代码上传`

### Experience members / testers

- Console home: [https://mp.weixin.qq.com/](https://mp.weixin.qq.com/)
- Path:
  - `微信公众平台 -> 成员管理`
  - or the current equivalent experience-member/tester section shown in your console UI

## Test vs Push Checklist

### Enough to start local Mini Program work

- Mini Program registration started
- `AppID` available
- WeChat DevTools installed

### Enough for real-device testing

- request domain path chosen
- request domain configured in Mini Program console
- privacy declaration handled if location/map APIs are used
- preview testers/experience members added if needed

### Enough for production push

- code upload private key generated
- review metadata/category configuration complete
- privacy declaration complete
- stable backend domain path working
- payments configured only if payments are included

## Recommended Decision For This App

For London Day Planner, the cleanest first version is:

1. local-only `My Trips`
2. no WeChat Pay in phase 1
3. no WeChat login in phase 1 unless sync is a must-have
4. either:
   - a compliant custom API domain
   - or WeChat Cloud Hosting if domain compliance becomes the bottleneck

That path minimizes external blockers and lets me build the product fastest.

## Proposed Next Step

The highest-value thing you can provide next is:

1. Mini Program `AppID`
2. your chosen backend-domain path:
   - custom domain
   - or WeChat Cloud Hosting

Once those two are decided, I can turn this from a readiness exercise into an implementation plan with exact pages, API wiring, and upload flow.
