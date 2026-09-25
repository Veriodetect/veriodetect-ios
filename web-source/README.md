# VerioDetect v0.7.8 secure beta

Live X retrieval requires a valid code from `VERIO_X_ACCESS_CODES` and `X_BEARER_TOKEN`. Any valid public X handle may be analysed. The server ignores client count/cursor parameters, makes exactly one timeline request, and caps the returned sample at 100 posts. Netlify Function rate limiting adds a 10 live-fetch/day per-source-IP cost guard.

No `VERIO_X_ALLOWED_HANDLES` variable is used. Manual archive/JSON/CSV analysis remains local and does not consume X API credits. M0/M1.1 mathematics are unchanged.

Note: this beta rate limit is per source IP, not a durable per-access-code accounting ledger. Stronger per-tester quotas/revocation analytics require persistent server-side state (for example a datastore) and should be added before broader distribution.
