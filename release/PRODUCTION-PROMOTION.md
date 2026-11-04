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
