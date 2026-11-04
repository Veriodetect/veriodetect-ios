# VerioDetect iOS v0.7.9 — staging preparation

Public-release preparation is documented in [release/READINESS.md](release/READINESS.md). Internal Codemagic build 117 compiled, signed and uploaded successfully; the owner confirmed the core device checks. The `ios-app-store` workflow remains blocked until the release backend and published privacy/support URLs are validated. Keep manual approval and quotas. No production deploy is included.

This feature branch packages the supplied `VerioDetect_0.7.9_Staging.zip` with the existing Capacitor iOS wrapper. `web-source/` preserves the ZIP bytes, including its older internal version labels. `source-hashes.json` verifies those bytes. The packaged About label and iOS build use 0.7.9.

ZIP SHA-256: `0964f77f71bd3d814e3ed43c006c706f896f1993cd5bd43d93abe50d230a7486`.
Base: `ad183d10820c5d521be6a9bb6b3eaaec37bff15b` (main). M0 (`engine.js`), M1 (`handoff.js`) and M2 (`m2.js`) are unchanged from that base.

## What changes

- Bundle the v0.7.9 registration form and access-control frontend locally.
- Route X status/retrieval GET and registration POST through native Capacitor HTTP to `https://veriodetect-staging.netlify.app`. The build rejects every other origin, including an inherited production override.
- Keep tester authorization headers and server quota/revocation error messages. Registration sends name, email and reason without a tester authorization header. Only three API paths are permitted; redirects are disabled.
- Keep native Share/Paste, local analysis/history and original model math. Preserve the committed native icon catalog instead of rewriting it during build.
- Keep Netlify Functions and the administrator page out of packaged assets. Their source is retained only as the supplied source snapshot. No credentials are embedded.

## Validation

`npm run build` and `npm run verify` pass locally. Checks cover source integrity, bundled native GET/POST handlers, request payloads, bearer headers, missing codes, registration success/failure, revocation/quota messages, login HTML errors, origin restrictions, M2 chronology/timestamp rejection and activity filters. HTTP responses are mocked; no live request registrations or X quota were consumed.

Capacitor iOS asset/plugin sync and `configure-ios.py` succeeded on Windows. Windows-generated Swift package paths and generated plist edits were discarded; Codemagic regenerates them on macOS. Dependency installation could not reach npm in this session; local validation used an existing installation with 97 installed package versions matching the lockfile. A clean `npm ci` remains part of the cloud workflow.

Initial packaging validation preceded the successful Codemagic build 117 and owner-reported device tests. See release/READINESS.md for current evidence and remaining release work; START-HERE.md records the earlier staging build instructions.

## Deployment boundaries

No Netlify site is deployed by this branch. Do not deploy this repository or its source snapshot to production. Production `veriodetectbeta.netlify.app` remains unchanged. Backend approval, revocation and quota enforcement remain on the existing staging server.

The staging URL originally returned a Netlify edge-access login page. The owner subsequently made staging public and verified native access-code, retrieval, revocation and quota behaviour on an iPhone. No site password, browser cookie or bypass token is embedded. Production has not been changed.
