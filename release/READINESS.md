# VerioDetect public-release preparation

Status: draft preparation; not approved for App Store submission. Production has not been changed.

## Configuration prepared

Use Codemagic workflow `ios-app-store` on `feat/app-store-release-preparation`. The workflow keeps the existing signing integration and bundle ID (`com.veriodetect.app`), uses display name VerioDetect, and uploads a signed build without submitting it automatically for review. The original staging workflow remains available.

`release-settings.json` proposes `https://veriodetectbeta.netlify.app` as the release backend. This is a proposal, not a verified deployment. `backendValidated: false` deliberately prevents a release build. The public privacy/support URLs are unset until published and verified. Do not set the validation flag merely to get a build through CI.

The owner selected manual approval and quotas for live X retrieval. Support contact: info@cquestra.com. Manual conversation and imported-data analysis remain available without approval. Experimental model limitations remain visible; this release does not claim calibrated AI/bot detection accuracy.

## Evidence from internal build 117

Owner-confirmed on iPhone: registration, approval, valid-code check, live X retrieval, original/all-activity M2 analysis, offline M0/M1 execution, history after restart, native sharing, revoked-code rejection and per-code quota rejection. Clipboard was provisionally reported working. A short conversation returned insufficient M1 data; this confirms execution/error handling, not a statistically supported M1 transition. The apparent status-bar overlap was not reproduced by the owner during normal use; no layout patch is included.

Local release-preparation checks: default staging build and adapter/model regression suite; release-profile fixture build and same regression suite; release display name/version/build counter; privacy/support link insertion; blocked unvalidated backend and cross-channel override; original source hashes unchanged. The release fixture used example.invalid URLs for local validation only; they are not committed as release settings. No release IPA has been compiled or uploaded. Build 117 remains the existing internal test build.

## Required before a public build

1. Confirm the intended public backend. If it is veriodetectbeta.netlify.app, explicitly approve its upgrade only after the final backend changes and rollback plan are reviewable. The current production frontend/backend have not been verified in this session; web inspection was unavailable. Never replace production with staging assumptions.
2. Implement and test an in-app flow for deleting live-X access and associated registration data. The source currently supports approval/revocation but no deletion. Revocation is not deletion. Treat access registration as an account-like feature for readiness; Apple makes the final determination. Do not rely solely on email support for this flow.
3. Choose the legal operator identity and data-retention periods; verify Netlify and Redis region/log retention and X API usage permissions. Prepare a secure administrator deletion procedure for pending/rejected requests as well as approved users.
4. Publish the reviewed privacy and support pages to real public HTTPS URLs. Add those URLs to release-settings.json and App Store Connect; verify them without a login. A support email alone is not a privacy-policy URL.
5. Confirm release hosting, server functions, environment secrets and Redis separation. Keep keys server-side. Validate unauthenticated requests are rejected, approval/revocation/deletion work, quota is atomic, errors reveal no secrets, and browser/native request paths agree. No X API cost limit is removed.
6. Only then mark backendValidated true, build using ios-app-store, and test the exact release build on iPhone and supported iPad layouts. Build numbers must exceed the last uploaded build (117 currently); the Codemagic project counter remains the source. Repeat offline, clipboard, persistence, sharing, live X, revocation, quota and deletion checks. Use disposable test codes for destructive checks.
7. Capture accurate screenshots from that final build. Existing phone screenshots include personal sample labels/handles and are validation evidence, not approved marketing assets. Do not fabricate results or claim model accuracy from these tests.
8. Complete App Store Connect metadata, availability, price, age-rating questionnaire, content rights, export compliance and data disclosures. Confirm the developer's distribution/DSA trader details where applicable. Audit the archived app's SDK privacy manifests and required-reason APIs instead of assuming that App Store upload success completes this review.
9. Create an active reviewer access code with sufficient quota and provide it privately in App Review credentials/notes. Keep reviewer identity/credentials out of source and public PRs. Provide a deterministic local demo conversation/export so reviewers can exercise analysis without depending entirely on live X. Ensure the code remains active throughout review.
10. Select manual release in App Store Connect, submit the reviewed build to Apple, and wait for approval. No approval or release is guaranteed by this preparation.

## Proposed production promotion and rollback boundary

The supplied staging backend adds Redis-backed registration/approval/revocation and per-code quotas. A public deployment should use an explicitly selected production Redis database/namespace and server-only credentials; do not assume staging records or credentials will migrate. New approved production codes may be required. The deletion implementation must be included before promotion.

Before a deploy: record the current production deploy ID, export/backup authorized production access records securely, confirm environment-variable names without committing values, and review the exact candidate deploy. Test a production-scoped preview with controlled access first. After explicit owner approval, deploy only the reviewed web/backend candidate, verify health without consuming X credits, then conduct the agreed single live fetch. If it fails, restore the recorded deploy; preserve data migration compatibility or explicitly roll back data changes. Production rollout is not authorized or executed by this document.

## Apple references checked 4 November 2026

- https://developer.apple.com/app-store/review/guidelines/ (complete access for review; live backend; accurate metadata; privacy)
- https://developer.apple.com/app-store/app-privacy-details/ (data inventory and App Store disclosures)
- https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion (initiate deletion in app where account creation is supported)

## Deletion implementation update

The deletion flow is now implemented as a candidate; see DELETION-PLAN.md for exact scope, compatibility and validation. The candidate is not yet deployed. Legal operator confirmed by owner: Cquestra B.V. Website/support/privacy review pages are hosted at https://veriodetect-website.netlify.app/. Support: info@cquestra.com. Public privacy/support URLs are recorded in release-settings.json, but privacyFinalized remains false until the policy is final and the new backend/device tests pass.

## Confirmed operator details

Cquestra B.V., Rokin 92, 1012 KZ Amsterdam, Netherlands; info@cquestra.com. Owner selected registration/access record retention until deletion is requested, with no automatic inactivity expiry. Final provider log/backup details and production-device validation still remain.
