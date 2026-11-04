# Access/data deletion candidate

Prepared for PR #2. Not deployed to staging or production yet. The original supplied web-source snapshot and M0/M1/M2 files remain unchanged.

## User flow

About contains Delete my access and data. The user enters an individual access code or selects a locally saved private deletion receipt, checks the permanent-deletion acknowledgement and confirms the action. The native app sends POST /api/access-delete with the credential in the Authorization header, never in a URL. Only after the server confirms deletion does it clear local history and the saved access code. Unrelated pending-request receipts remain available. A failed request preserves local data; an unusual local-storage failure after server deletion is reported separately.

Registration creates a 256-bit random deletion receipt on the device and saves it before transmission. Only its SHA-256 hash is retained on the server. A retry with the same receipt is idempotent, even after the duplicate-email guard expires. A lost network response does not force a second enrollment. Receipts can be viewed privately in About and transferred by the user if needed on another device. Do not include them in screenshots or support messages.

An approved access code (including revoked/expired codes) authorizes deletion of registration/access records associated with its approved email. A pending/rejected applicant's receipt authorizes only that specific enrollment. This distinction prevents someone from submitting a victim's email and then using an unverified receipt to erase that victim's approved access.

## Server behaviour

Candidate functions live under backend-candidate/netlify/functions. Registration, administrator mutation and deletion are Lua transactions. Deletion rechecks proof and validates the entire target set before mutating it, so a concurrent approval cannot recreate a code after deletion. It removes request records, list membership, code hashes, deletion-receipt mappings, and the three UTC day usage keys that can still exist under the 172800-second expiry. It removes the corresponding email guard when owned by the enrollment (or when deleting the approved email's complete set). Other users' records stay untouched. There is a 10000-request safety ceiling; oversized/corrupt registries fail closed and require operator repair. No deployment logs print credentials, names or email addresses.

Application deletion does not claim to erase independent provider security logs/backups immediately. Their retention/backup policies must be disclosed and confirmed separately. Existing legacy pending/rejected applicants have no receipt; they need identity-verified recovery before migration. Existing approved/revoked users can use their existing codes if the original Redis records are retained. Never delete real user records as a staging test; use newly created disposable fixtures only.

## Compatibility and deployment

npm run package:backend creates ignored backend-package/ containing the browser frontend, new access lifecycle, admin page and candidate functions, with Netlify configuration. It does not deploy. Netlify CLI bundling is required: a static Drop ZIP is not proof that functions were deployed. The original browser registration API is deliberately rejected without a deletion receipt; backend and new clients must be rolled out together after testing. Build 117 can continue using valid codes but its old registration form cannot create new accounts on the new backend. Staging and production migrations must account for this compatibility change.

Recommended staging validation: deploy the candidate only to veriodetect-staging after taking a recoverable deploy/data snapshot; run a new iOS staging build from this branch; register a disposable user; confirm a saved receipt; cancel deletion; delete a pending request; approve another disposable request; fetch once, revoke and delete with its code; verify the admin list and access checks no longer find that user. Test retry/confirmation failures. No production deploy is authorized by this document.

## Tests

Local: existing source-hash/model/transport checks, receipt persistence/retry and deletion UI confirmation/failure/success, plus release-profile fixture packaging. Real Lua semantics and concurrency are tested by scripts/verify-backend-redis.mjs against a fresh Redis service in .github/workflows/release-checks.yml. The test refuses a nonempty database and requires explicit REDIS_TEST_DISPOSABLE=1; it must never be pointed at deployed Redis. GitHub test completion is recorded separately from local tests.

The live privacy page remains a test-version review notice until this candidate is deployed and device-validated, retention/provider details are confirmed, and the owner contact address is supplied. release-settings.json keeps backendValidated and privacyFinalized false.
