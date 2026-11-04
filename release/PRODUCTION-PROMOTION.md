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
