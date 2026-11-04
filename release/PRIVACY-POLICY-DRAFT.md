# Privacy policy draft — not yet published

Contact: info@cquestra.com
Legal operator identity, registered contact details, effective date and confirmed retention schedule: owner must supply before publication.

VerioDetect analyses timestamped conversations and X activity. The M0, M1 and M2 calculations run on your device. Conversation text is not uploaded by the inspected analysis code. Imported X files and pasted posts are parsed locally. Saved conversation analysis records include participant labels and derived statistics, rather than the original conversation text. The app retains up to 30 such records in local storage. Clear removes those saved records. A live-X access code is also kept locally for reuse; clearing analysis history does not currently clear that code. Device backups or removal behaviour depend on your Apple settings and must be verified for the release.

When you request live X access, the service receives your name, email address, optional reason, request identifier, request time and approval status. An administrator reviews the request manually. Approval creates an individual access code. The server stores a SHA-256 hash of that code and associates access/usage records with your email/request. Codes can expire or be revoked. No plaintext administrator or X API credential is embedded in the app.

When you request live X activity, the app sends the requested public X handle and your access code over HTTPS to our backend. The backend queries X for that account and returns up to 100 recent activities, including post text, IDs and timestamps. Analysis is then local. Live X retrieval is subject to per-code and IP limits. A quota unit is charged when retrieval starts, including some failed requests. The inspected application source does not persist retrieved post text on the backend; hosting/network logs and third-party retention need separate confirmation.

The source snapshot uses Netlify for hosting/functions and Upstash Redis for access requests, approval records and quotas. X supplies public-account data. Hosting providers necessarily process network requests, including IP addresses and service logs according to the configured service settings. Exact data regions, processor terms, log retention and international-transfer arrangements must be confirmed before this draft becomes the published policy.

The inspected code does not add advertising SDKs or cross-app tracking. It uses clipboard access after you choose Paste and opens the native share sheet after you choose Share. Sharing a result sends it only through the destination you choose, which has its own privacy practices.

Current retention: local history is capped at 30 records. Server registration and access records currently have no automatic deletion schedule. Per-code daily usage keys expire after approximately two days; email request guards expire after one day. These expiries do not delete the underlying registration or access record. Final retention periods and deletion handling must be implemented/approved and described here before release.

Data controls: users can clear local analysis history. The release still needs an in-app access/account deletion flow that removes associated server records and access codes, with a confirmation and any justified retention exceptions. Contact info@cquestra.com for privacy enquiries. This draft does not present email contact as a substitute for an in-app deletion flow.

Before publishing: confirm the lawful purposes/bases relevant to the operator and launch territories, recipients and transfer safeguards, rights/request handling, retention periods, minors/age eligibility, and complaint routes. Do not publish the unresolved editorial instructions above as user-facing policy text.

## Candidate privacy update (not yet deployed)

Operator confirmed: Cquestra B.V. Public support: https://veriodetect-website.netlify.app/support/. Privacy review page: https://veriodetect-website.netlify.app/privacy/. Registered contact address and final retention decision remain pending from the operator.

The candidate adds a device-generated private deletion receipt when registering. Only its hash is stored server-side with the request. Receipts are saved locally and remain available for deleting pending/rejected requests. In About, a receipt deletes its enrollment; an approved individual's access code deletes registration and access records associated with the same approved email. Expired/revoked codes remain valid proof for erasure. After server confirmation, local saved analysis history and the access code are cleared. Receipts for other requests remain available. The backend removes the related request/code/receipt/quota records; provider backup/log retention is separate and must be confirmed. Do not publish this candidate behaviour as live before deployment/device validation.
