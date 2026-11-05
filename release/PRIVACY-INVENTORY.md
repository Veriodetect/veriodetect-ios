# App Store privacy inventory — draft for owner verification

Do not select Data Not Collected: optional registration stores personal data on the backend. These are proposed classifications based on source inspection; verify deployed infrastructure/logging and all SDKs before answering App Store Connect.

| Data | Observed handling | Proposed purpose / linkage |
|---|---|---|
| Name | Registration record in Redis | App functionality; linked to the requester |
| Email | Registration, approval and code records | App functionality; linked |
| Optional reason | Free-text registration record | App functionality; other user content, linked |
| Request ID / code hash | Access administration and authorization | App functionality; user identifier, linked |
| Daily usage | Per-code counter | App functionality/security; linked to access record |
| Public X handle and posts | Backend retrieval and in-memory local analysis | Verify hosting/X retention and whether Apple's collection definition applies; do not assume ephemeral processing is retained collection |
| IP address / technical logs | Network requests and Netlify IP-based limits | Verify retention and Apple's applicable type, purpose and linkage |
| Conversation text / imported files | Local parsing; no upload in inspected analysis code | On-device processing; not developer collection by that code |
| Saved derived results and participant labels | Local web storage, up to 30 records | On-device; assess backups separately |

No advertising/tracking integration was found in the inspected application source. Do not infer a tracking disclosure or claim from this inventory without reviewing all deployed SDK/provider behaviour. No ATT prompt is introduced here.

Check the final archived SDK privacy manifests and required-reason API declarations, especially any SDK changes since build 117. Retain the generated privacy report with release evidence. Review privacy policy and in-app disclosure wording against the actual production configuration.
