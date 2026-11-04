# Next step: build v0.7.9 from the feature branch

1. Review the PR for branch `feat/ios-v079-staging`. Do not merge or deploy production as part of this test.
2. In the existing Codemagic application, choose that branch and workflow `ios-testflight` (VerioDetect v0.7.9 Staging - TestFlight). Confirm its existing `Veriodetect` Apple integration and App Store distribution profile match `com.veriodetect.app`. Keep credentials in Codemagic, never in this repo.
3. Check the next computed build number (`100 + PROJECT_BUILD_NUMBER`) exceeds the last uploaded build. Increase BUILD_NUMBER_BASE if needed. The workflow sets version 0.7.9 and device display name VerioDetect Staging.
4. Start the branch build. It runs clean dependency installation, bundling, native sync, versioning, verification, signing and IPA build. Its existing publishing configuration uploads to App Store Connect; `submit_to_testflight: false` means no automatic beta-review submission, and `submit_to_app_store: false` means no App Store review submission. No tester groups are automatically added.
5. After Apple processing, select the build for an internal TestFlight group. This uses the same bundle ID as the existing app, so installing the staging build replaces that app on a tester's device. Do not submit it for public release.

Before inviting more testers, verify on an iPhone: registration/manual approval; valid code status; invalid/revoked code rejection; one successful X retrieval and quota rejection; X-to-M2 timestamps; M0/M1 participant selection and evidence; text/JSON/CSV/ZIP import; Share/Paste; saved analyses after relaunch; and manual analysis in airplane mode.

Staging currently has a Netlify login wall for unauthenticated access. If the native app receives HTML/login redirects instead of JSON, stop device acceptance and review staging access configuration with the site owner. This branch neither weakens that protection nor stores any bypass secret. Do not change production.

No signed build or TestFlight upload was performed in this preparation session. The PR is the reviewable handoff for the cloud build.

Provider reference: https://docs.codemagic.io/yaml-publishing/app-store-connect/
