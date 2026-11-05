# Production promotion plan — awaiting explicit approval

Tested candidate code: staging deploy 6aebba5f66c9ce3dafc29b75, source branch deploy/staging-access-deletion at 39bd1839d3ebf39366dbb5f36a4bba2b79d8eb88. Owner confirmed both pending-request and approved-access deletion on the subsequent iOS TestFlight build. The deleted approved code was denied and its admin record disappeared. Exact new TestFlight build number has not been supplied in chat; do not assume it.

Privacy policy and support pages updated and verified live 5 November 2026:
https://veriodetect-website.netlify.app/privacy/
https://veriodetect-website.netlify.app/support/
Website deploy 6aebc00481e1e612e8a4b7fa. Operator Cquestra B.V., Rokin 92, 1012 KZ Amsterdam, Netherlands; info@cquestra.com. Registration/access records retained until deletion is requested, with no automatic inactivity expiry.

Read-only production inspection: veriodetectbeta currently has X_BEARER_TOKEN and legacy VERIO_X_ACCESS_CODES. It does not show UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN or VERIO_ADMIN_TOKEN. Secret values were not revealed, exported or changed.

Proposed upgrade requires owner approval before any production mutation:
1. Prepare a separate production Upstash Redis database, server-only REST credentials and a fresh administrator token in Netlify. Do not reuse the staging database: staging deletion tests must not affect production users. Keep secret values out of chat, source and build artifacts.
2. Preserve the current published production deploy and record environment settings securely in the hosting account before rollout. Do not delete the legacy code variable until rollout and rollback decisions are complete.
3. Link only veriodetectbeta to a dedicated, reviewed production deployment branch with the tested browser/backend candidate configuration. Preserve X_BEARER_TOKEN and all unrelated existing settings. Confirm public API reachability without embedding bypass credentials.
4. Deploy the candidate. This replaces the old shared-code backend with individual manual approval, quota and deletion. Existing old shared beta codes will no longer authorize live X calls on the upgraded server. Older clients cannot register without receipts; communicate the required updated client/new individual codes to existing users.
5. Verify status rejects missing/invalid codes as JSON, registration/approval/receipt/deletion on disposable production fixtures, manual quotas and one agreed live X fetch. Verify administrator operations require the secret. Never delete existing user records as a test.
6. If checks fail, restore the recorded previous deploy and compatible existing environment settings. Retain the new database securely for recovery if it already contains registrations; do not silently discard data. The iOS release must not be submitted while backend validation is incomplete.
7. After successful verification, set backendValidated true in the release profile, build ios-app-store from the final approved source, install/test that exact build, complete App Store disclosures and private reviewer access, and submit to Apple using manual release. Backend promotion does not itself submit or publish the iOS app.

No production backend, database, credential or code configuration was changed by this plan. Release build remains blocked until approval/provisioning/validation.

## Production approval — 5 November 2026

The owner explicitly approved upgrading veriodetectbeta.netlify.app to the tested approval/quota/deletion system using a separate production database, after being told legacy shared codes would need individual replacements. Do not request this same production approval again unless scope changes.

Current production rollback deploy recorded read-only: 6ab62019d312badadd38aca3
https://app.netlify.com/projects/veriodetectbeta/deploys/6ab62019d312badadd38aca3
Current deployment is from Netlify Drop (25 September 2026). No production settings or deployments have been changed yet.

Upstash console is awaiting the owner’s sign-in in the in-app browser. Once signed in, create the isolated production database, keep its credentials and a fresh admin token server-side in Netlify, then continue the approved deployment/validation plan. Do not accept a paid plan or new spending commitment without a specific authorized budget.

## Database provisioning — 5 November 2026

Owner approved $20/month per Redis database (up to $40 total) after the console rejected $5 as below the $20 minimum. Card added by owner; staging converted to pay-as-you-go. Saved and verified staging cap $20. Created isolated VerioDetect Production in AWS Frankfurt, pay-as-you-go, with $20 cap; declined $200 Prod Pack. Production database ID: 81c67fbd-3f37-4e03-851a-0be78dc5090a. No user records migrated.

Owner explicitly approved giving veriodetectbeta server read/write access to this database. Saved UPSTASH_REDIS_REST_URL as a Netlify secret in production context only. No staging credentials reused. Token entry remains pending owner handoff because browser clipboard copy did not yield a usable token; never save masked text as a token. VERIO_ADMIN_TOKEN also remains to be set privately by owner. Existing X and legacy code variables preserved. No production deployment yet. backendValidated remains false.

Production browser packaging now supports SITE_CHANNEL=production for current version, approved-access language, privacy/support links and registration notice. Default staging packaging remains available; original model source unchanged. npm run package:backend (both channels) and npm run verify pass locally.

## Production deployed — 5 November 2026
Owner saved production-only UPSTASH_REDIS_REST_TOKEN and VERIO_ADMIN_TOKEN. URL was restored after token was initially entered under URL; distinct names now confirmed. Secret values were not read. Dedicated branch deploy/production-v079 at ad2ed3219983c678faf6a9ffe067310312dd933b deployed successfully: 6aebc93beb5abbd156c97948, six functions, 15s total. https://app.netlify.com/projects/veriodetectbeta/deploys/6aebc93beb5abbd156c97948

Public frontend verified v0.7.9 with deletion panel and privacy/support links. GET /api/x-status returns individual-access-required JSON; GET /api/access-delete returns method-not-allowed JSON. These checks do not prove Redis connectivity or authenticated X retrieval. Administrator panel opened for owner to enter saved token and Load requests, then production registration/approval/deletion/quota validation still required. backendValidated remains false; no App Store release build or submission performed.

## Administrator authorization investigation
After successful deployment and a fresh rebuild, owner reports Unauthorized with the same administrator password. A guarded configuration check was added on production branch commit d52e413debfa1d4cc795bf1fa6966db8931f257a: missing VERIO_ADMIN_TOKEN returns 503, configured but invalid/absent presented token remains 401. Local handler checks confirm both states preserve authentication. Deploy 6aebcc3ccd96e5dceb5c19c1 published; public no-token request returned Unauthorized, proving server configuration is present but not proving any particular credential value matches. No token values inspected.

Owner replaced VERIO_ADMIN_TOKEN privately on 5 November 2026 after being asked to use 32 random ASCII letters/digits. Triggered clean redeploy 6aebcd2fdec9dab3f614c5ff at same source d52e413. Authentication retest pending. Do not label backend validated or submit release until authenticated database/X checks pass.

## Database connection diagnosis — 5 November 2026
Owner confirmed production admin now accepts replacement password but loading requests fails. Production commit 8a1c56691eb3c2fd62ba3c9d971172d5005f100d adds controlled Redis diagnostics to authenticated admin errors only: invalid URL, missing configuration, rejected token, connection failure, unavailable, Redis error. Never return raw remote error bodies or credentials. Local tests for invalid URL/401/500 passed. Deploy 6aebd0c1d3ab81ae009a630e published. Clicking Load requests with owner's existing entered credential returned: Access database token was rejected.

Owner copied TOKEN from isolated production Upstash to production-only UPSTASH_REDIS_REST_TOKEN and saved. Clean redeploy triggered: 6aebd195021d12380229857c. Authenticated database retest pending.

Production database connection confirmed after deploy 6aebd195021d12380229857c. Authenticated admin Load requests returned 0 requests loaded. Administrator credential and Redis LRANGE are working. Full production registration/approval/retrieval/quota/deletion and exact public iOS build validation remain pending. backendValidated stays false.

## Production acceptance — 5 November 2026
Authenticated production admin returned 0 requests loaded after token correction. Owner submitted production registration; admin confirmed 1 pending request with quota 10. Owner approved it, reported Authorized X beta access configured, successful live retrieval and M2 analysis. Owner then confirmed deletion and denial of the deleted code. Production acceptance covers manual request/approval, live retrieval, M2, and deletion/revocation. Production quota exhaustion was not repeated with paid X calls; quota logic is unchanged from tested staging and disposable Redis regression coverage.

Release profile backendValidated is now true based on these checks. Public workflow ios-app-store uses production origin and final privacy/support pages. Still requires a signed Codemagic build, installation and device validation of that exact build, App Store metadata/privacy disclosures and private reviewer access before submission. No public App Store submission or release has occurred.

## Public iOS candidate built and uploaded
Release branch feat/app-store-release-preparation remote commit 5009c0087d797e5801361129caffa1321d02379b passed GitHub checks: https://github.com/Veriodetect/veriodetect-ios/actions/runs/41944797662 and 41944789497. Local production build, model/native/client checks and release gate fixtures passed.
Codemagic ios-app-store workflow completed and uploaded App.ipa successfully to Apple: https://codemagic.io/app/6aa825d1ca58feacc46a7310/build/6aebd42f004ce28f20edfa8e
Publishing log confirms app name VerioDetect, bundle com.veriodetect.app, version 0.7.9, version code 120, min iOS16.0, UPLOAD SUCCEEDED with no errors. No review submission or public release performed. Next: Apple processing, internal TestFlight availability of exact build120, device acceptance against production, metadata/screenshots/disclosures/reviewer access and manual-release submission.

## M2 history/sharing correction — build 121
Device acceptance of build120 found M2 results missing both history persistence and Share UI. Added guarded presentation adapter scripts/m2-results.mjs (native and browser packagers) without changing preserved source/model snapshots. M2 stores rendered derived statistics only, dispatches saved M2 history to its own result screen, escapes reopened text, and uses existing native Share handler. Raw imported posts and credentials are excluded. Storage failure keeps current result shareable with a visible notice.
Local and GitHub checks pass, including persisted history round-trip and sharing-route regression: https://github.com/Veriodetect/veriodetect-ios/actions/runs/41946842068 and 41946833389.
Remote release commit 3c97dc21e616ab28ce874bfb7b9c3c99fbbc5afa. Corrected production iOS build 0.7.9 (121) built and uploaded with UPLOAD SUCCEEDED, no errors. https://codemagic.io/app/6aa825d1ca58feacc46a7310/build/6aebd7e7004ce28f20edfb69
Build121 supersedes120 for App Store candidate testing. Needs device retest of M2 new result -> History -> close/reopen -> saved result -> Share. Previous unsaved M2 results cannot be recovered. Production website deployment unchanged by this fix; adapter is prepared for browser packaging but not deployed there. No App Store review submission.

Owner confirmed build121 updated on device, M2 live retrieval, native sharing, and saved M2 result after app restart. Build121 accepted for submission preparation. Active access code persisted across app update as expected; server authorization/quota still apply. Apple listing preparation underway; price/territories pending owner choice and App Store Connect sign-in required.
