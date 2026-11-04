# VerioDetect individual access — deployment instructions

This package is a **staging candidate**. It preserves the original M0/M1/M2 algorithms and existing X retrieval behaviour. Do not replace the live deployment until tested.

## Required infrastructure

Create an Upstash Redis database with TLS and REST API. Configure these **server-side Netlify environment variables** (never in the iOS bundle):

- `UPSTASH_REDIS_REST_URL` — the database REST URL.
- `UPSTASH_REDIS_REST_TOKEN` — the database REST token.
- `VERIO_ADMIN_TOKEN` — a long, independently generated random secret for administrator API access.
- `X_BEARER_TOKEN` — retain the existing X API bearer token.

Old `VERIO_X_ACCESS_CODES` is no longer accepted by these endpoints. Issue new codes through the dashboard before switching production traffic. Existing beta codes will stop working once the new backend is deployed.

## Deployment

Use a **staging Netlify site** first. The package contains the web app and Netlify Functions source. Deploy using the Netlify CLI or a Netlify build/deploy process that bundles and deploys functions. Merely dragging the ZIP into Netlify's static deploy UI may not deploy functions; confirm `/api/x-status` and `/api/access-request` actually execute.

The access request form appears on the X analysis screen. To review requests, visit `/access-admin.html` on the staging site, enter the administrator token, and approve/reject. On approval, the generated code appears **once**; copy it and deliver it privately to the user. No automatic email is sent. The dashboard is protected by a server-side administrator token; obscuring its URL is not an authorization control.

Each code is stored as a SHA-256 hash in Redis. Approval records contain the user's name/email. Access is checked server-side and each live-X fetch consumes one per-code daily quota unit atomically. `/api/x-status` checks access without consuming quota. The original 10/day per-IP Netlify rate limit remains in addition to the per-user quota.

## Limitations / validation

- Test rate-limit behaviour, Redis connectivity, expiry, rejection and revocation before production.
- The quota is charged when a fetch starts, including invalid handles and upstream X failures, as a conservative cost guard. The IP rate limit can further restrict usage.
- A user who knows the administrator token can approve users. Store and rotate it securely; the admin dashboard does not provide multifactor authentication.
- The Redis data contains personal information. Set a retention policy and update the app's privacy disclosures before public release.
- Request records are retained until explicitly removed; this version has no automatic deletion process.
- A stolen user code can be reused until revoked. Device binding and automatic email delivery are not implemented.
- This ZIP does **not** update the GitHub Capacitor wrapper. A new iOS build must incorporate the updated frontend after backend staging tests.
