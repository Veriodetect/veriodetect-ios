# Package notes

`web-source/` is an unchanged copy of every file in the supplied Netlify-ready ZIP. `source-hashes.json` records SHA-256 hashes. The existing M0/M1 engine, handoff detection, M2 math, HTML, CSS, saved-analysis logic and original icon are preserved.

`npm run build` transforms a copy of app.js in memory: bundles fflate 0.8.2 locally; replaces relative API fetches with CapacitorHttp GET requests to the configured HTTPS Netlify origin; maps Share and Paste to native plugins; and removes service-worker registration. Only the listed frontend files enter `www/` and the native app. No Netlify function code or X credential is copied into the client. Netlify's existing API paths and functions are unchanged. Native HTTP avoids needing a new CORS policy on Netlify. The app continues using Netlify, never calls X directly, and does not host the live PWA in a remote web view.

`ios/` is a generated Capacitor 8.4.1 Swift Package Manager project with a shared App scheme, iOS 16 deployment target, VerioDetect launch screen and an opaque 1024px adaptation of the supplied icon. Codemagic re-syncs plugin paths on macOS before building. Dependencies are locked in package-lock.json. `scripts/configure-ios.py` applies version 0.7.6 and a unique increasing build counter.

To rebuild locally on a development machine with Node 22+: `npm ci`, configure app-settings.json, `npm run build`, `npx cap sync ios`. iOS compilation requires macOS; use the supplied Codemagic workflow from Windows. A `NETLIFY_ORIGIN` environment variable can override app-settings.json if your CI team uses environment groups; it is a public address, not a secret.

Do not deploy this entire repository to Netlify. The current production deployment requires no update for this wrapper. If you deliberately redeploy the PWA later, only `web-source/` is the original Netlify deploy folder.

Local verification completed: dependency installation, web bundling, native scaffold generation/plugin discovery, source-hash equality, absence of server credentials/function code in the bundle, native API bindings, M2 newest-first equivalence, timestamp-integrity rejection and activity filters. The build was checked with a test origin; generated test assets are excluded from the deliverable and rebuilt with your real origin by CI. Apple compilation/signing, real backend calls, document-picker behavior, clipboard permissions, share sheet, offline behavior and persistence require the first cloud/device test. No claim of completed TestFlight upload is made.

Saved analyses remain in the app's local web storage as in v0.7.6. Removing the app can remove its data. Any existing limitations in the supplied analysis models or parsers are preserved. These checks validate packaging and the timestamp regression, not model accuracy.

See START-HERE.md for browser-only setup and current provider documentation.
