# VerioDetect for iPhone

User manual for v0.7.9

## Choose an analysis

Open **Home**. Use **Paste from Clipboard** or **Import Conversation File** for a timestamped conversation. Open **X Account** to analyse posting patterns from an X export, pasted data, or a fresh Live X fetch. Conversation analysis, X imports, and analysis of data already loaded use no Verio Credits.

## Analyse a conversation

1. Export a WhatsApp conversation as text, or prepare a timestamped conversation in the same format. An export without media is sufficient.
2. Save it to Files and choose **Import Conversation File**, or copy the text and tap **Paste from Clipboard**. You can also paste into the conversation field.
3. Check the detected senders and select the person whose response timing you want to assess. Tap **Analyze**.
4. Read the conclusion, sample strength, and detailed evidence. Use the information buttons beside individual statistics for explanations.

M0 summarises the selected participant’s response patterns across the sample. M1.1 looks for a change within the conversation and tests whether the observed shift is supported by the available data. The strongest observed change can appear even when the evidence is too weak to support a handoff. Small or poorly timestamped samples may produce no reliable result.

## Analyse an X export or pasted posts

1. Open **X Account** and tap **Import X archive / JSON / CSV**. Choose a supported X ZIP archive, tweets.js file, X API JSON export, or CSV. You can also paste timestamped posts or supported structured data in the text field.
2. Under **Activity**, choose original posts, originals and replies, all activity, replies only, or reposts only. The selection determines which activities M2 analyses.
3. Tap **Analyze**. Check the number of included posts, time span, and timing diagnostics before interpreting the result.

M2 is an experimental measure of posting cadence. It considers patterns such as gaps, repeated intervals, bursts, and time of day. A profile describes the selected sample. The label can change with a different activity filter or date range. The score provides no probability that a person or account uses automation.

## Set up Live X

1. On the **X Account** screen, expand **Request access** and enter your name, email, and optional reason. Submit the request and wait for manual approval. Keep the private deletion receipt available for later.
2. Enter the individual access code you receive in the X access field. Tap **Check X connection** to check the code. Keep your code and deletion receipt private.
3. Open **About → Live X account** and tap **Sign in with Apple**. Use the same Apple identity when you return or reinstall so the service can find your credit balance.

## Buy credits and fetch posts

1. Under **About → Live X account**, review the Verio Credits pack and its price. The price is shown in your App Store currency. Apple’s purchase sheet shows the final total before you confirm.
2. After the purchase, use **Check balance** if the updated balance takes time to appear. For a pending transaction, check again later before purchasing another pack.
3. On **X Account**, enter a public handle and tap **Fetch**. Review the maximum credit cost and confirm if you agree. The current maximum is 102 credits for up to 100 recent activities. A completed fetch uses two credits for the account lookup plus one credit per activity returned.
4. Choose an activity filter and tap **Analyze**. Changing the filter and analysing those same loaded posts uses no additional credits.

Daily access limits apply separately from your credit balance. A failed retrieval releases the reserved credits. A later balance check can show the release if a request was interrupted.

## View, share, or clear results

Open **History** to revisit saved results. Use the Share button on a result screen to share its summary through the iPhone share sheet. Review the summary before sharing. Use **Clear** in History to remove saved results from this device.

## Refunds and deletion

For an App Store purchase refund, use Apple’s [Report a Problem](https://reportaproblem.apple.com/) service. Apple decides the claim. If Apple approves a refund, VerioDetect adjusts the credit balance when it receives and verifies the refund. TestFlight uses test transactions without a real charge.

To delete your Apple-linked account, open **About → Live X account → Manage account → Delete account**. Read the confirmation before proceeding. Any unused Verio Credits will be lost when you delete the account. Account deletion does not file a refund request with Apple.

Live X access registration is managed separately. Open **About → Delete my access and data** and use your individual access code or deletion receipt. A deletion receipt covers its own request and any access it granted. Expired or revoked codes can still be used for deletion.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| No messages or posts detected | Check that the file or pasted text contains valid timestamps. Try the original export. |
| Insufficient evidence or a weak sample | Try a longer sample with valid timestamps and check the sender or activity filter. |
| Access code invalid, expired, or revoked | Check the individual code and confirm your request was approved. Contact support if you need help. |
| Daily quota reached | Try again after the daily limit resets. Buying more credits does not increase the quota. |
| Insufficient credits | Check your balance under **About** before starting a fresh fetch. You can still analyse data you already have. |
| Purchase pending or balance missing | Sign in with the same Apple identity and tap **Check balance**. If the balance still looks wrong, contact support before buying again. |
| Live X unavailable | Check your connection and retry later. You can continue with an import or a conversation analysis in the meantime. |

Analysis runs on your device. Live X registration and retrieval use VerioDetect’s servers. For support, include your app version, what you were trying to do, and the exact error message. Keep access codes, deletion receipts, account credentials, and private conversations out of support messages.

[Support](https://veriodetect-website.netlify.app/support/) · [Privacy policy](https://veriodetect-website.netlify.app/privacy/) · info@cquestra.com
