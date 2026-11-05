# Staging access-deletion deployment — 5 November 2026

Netlify site: veriodetect-staging
Site ID: 4053a9b2-ebb7-46ba-b049-34e685c30037
Repository: https://github.com/Veriodetect/veriodetect-ios
Deployment branch: deploy/staging-access-deletion
Candidate commit: 39bd1839d3ebf39366dbb5f36a4bba2b79d8eb88
Published deploy: 6aebba5f66c9ce3dafc29b75
Deploy details: https://app.netlify.com/projects/veriodetect-staging/deploys/6aebba5f66c9ce3dafc29b75

Linked only the staging Netlify project to the dedicated Git branch. Netlify detected and used npm run package:backend, publish directory backend-package, functions directory backend-candidate/netlify/functions. Existing environment values were not edited or exported. Building/deploying/post-processing completed successfully.

Verified in browser: https://veriodetect-staging.netlify.app/ loads; About contains the confirmed deletion form and saved receipt selector; GET /api/access-delete returns JSON Method not allowed as expected for this POST-only function. No registration, live X retrieval or user-data deletion was performed by these deployment checks. Real Redis integration/concurrency checks passed separately in GitHub Actions.

Rollback reference (previous published staging deploy): 6aeb5e58adc60347cedf8348
https://app.netlify.com/projects/veriodetect-staging/deploys/6aeb5e58adc60347cedf8348
A rollback must also account for new receipt registrations if created after deployment. No data backup was exported and no real records were mutated as part of this deployment.

Next native validation: in the existing Codemagic app, select feat/app-store-release-preparation and workflow ios-testflight (the staging workflow). Do NOT select ios-app-store; release gates remain closed. Install the newly uploaded 0.7.9 build in TestFlight after processing. With newly created disposable registrations, verify saved receipts, confirmation/cancel, pending deletion, approved/revoked-code deletion, surviving unrelated users and normal access/quota behaviour. Build 117 has no deletion controls and its old registration form is incompatible with receipt-required registration.

Production veriodetectbeta.netlify.app and website veriodetect-website.netlify.app were not edited or redeployed in this step. No public App Store review submission was performed.
