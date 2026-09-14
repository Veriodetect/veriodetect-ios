# VerioDetect v0.7.6

Netlify-ready PWA. v0.7.6 preserves M0/M1, M2 imports, saved analyses and detailed evidence, and adds direct analysis of a public X handle through a Netlify Function.

## Enable public X handle fetching
1. Deploy this folder to Netlify.
2. In Netlify project settings, add an environment variable named `X_BEARER_TOKEN` containing your X API bearer token.
3. Redeploy after adding the variable.
4. In VerioDetect choose **Analyse X Posts**, enter a public X handle such as `@username`, choose 100–1,000 posts, tap **Fetch**, choose the Activity filter, then **Analyze**.

The bearer token stays server-side in `netlify/functions/x-posts.mjs`; it is never shipped to the browser. The function requests public account/post metadata from X and returns only the fields M2 needs. X API access/limits and charges depend on your X developer plan.

Manual X archive/JSON/CSV/text import remains available and does not require the X API.


v0.7.6: bumps the PWA cache, switches app assets to network-first, cache-busts ES modules, and adds a visible build badge plus M2 click status.


v0.7.6 fixes X API reverse-chronological ordering before M2 interval calculations and adds timestamp integrity diagnostics. Reliability is renamed Sample strength for M2.
