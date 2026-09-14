# VerioDetect iOS — v0.7.6

This project packages the supplied v0.7.6 app for iPhone/iPad (iOS 16+). App name: **VerioDetect**. Bundle ID: **com.veriodetect.app**. You can complete the steps below from Windows and a browser; Codemagic runs Apple's build tools on a cloud Mac.

The project has been generated and the web bundle and regression checks passed. It has **not yet been compiled, signed, uploaded or tested on an iPhone**. Your Apple signing setup and production Netlify address are required before the first cloud build.

1. **Put the project on GitHub.** Extract this ZIP. Create a private repository, choose **Add file → Upload files**, and upload the contents of the `VerioDetect` folder. `codemagic.yaml`, `package.json`, `package-lock.json`, `ios`, `scripts` and `web-source` must be at the repository root. Commit the files. Do not upload the ZIP itself as the source.

2. **Set your Netlify address.** In GitHub, edit `app-settings.json`. Replace `https://YOUR-SITE.netlify.app` with your actual production HTTPS origin, without an `/api` path. Commit. The build deliberately stops if the placeholder remains. Keep the existing Netlify deployment and its `X_BEARER_TOKEN` unchanged. There is no token to enter in the iOS project or Codemagic.

3. **Connect Apple to Codemagic.** In App Store Connect, create a team API key under **Users and Access → Integrations → App Store Connect API**, with **App Manager** access. Download its `.p8` once and retain the Key ID and Issuer ID. In Codemagic **Team settings → Team integrations → Developer Portal → Manage keys**, add these as an integration named exactly **VerioDetect Apple**. [Codemagic setup](https://docs.codemagic.io/yaml-quick-start/building-a-native-ios-app/)

4. **Prepare signing in the browser.** In Codemagic **Team settings → codemagic.yaml settings → Code signing identities → iOS certificates**, generate an **Apple Distribution** certificate using that integration. Download it and its password, then upload it as directed by Codemagic. In the [Apple Developer portal](https://developer.apple.com/account/resources/profiles/list), create an **App Store Connect distribution provisioning profile** for `com.veriodetect.app`, selecting that certificate. Download it and add it to Codemagic's **iOS provisioning profiles**. Verify Codemagic shows a matching certificate. Use your Cquestra team for both. [Signing guide](https://docs.codemagic.io/yaml-code-signing/signing-ios/)

5. **Run the cloud build.** In Codemagic, add an application from that repository and select the YAML configuration. Choose **VerioDetect - TestFlight**, your committed branch, then **Start new build**. The workflow installs dependencies, bundles v0.7.6, syncs the iOS project, applies signing, builds an `.ipa`, and uploads it to Apple. The `.ipa` is also downloadable from build artifacts. [Publishing guide](https://docs.codemagic.io/yaml-publishing/app-store-connect/)

6. **Install through TestFlight.** After Apple processes the upload, open **App Store Connect → VerioDetect → TestFlight**. Complete any required compliance prompts. Create an internal tester group, add your eligible App Store Connect account and the build, then accept the invitation in the TestFlight app on your iPhone. External testers require a separate beta-review process. [Apple's internal-testing guide](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers)

The workflow uploads to App Store Connect, but does not automatically submit for external beta review or public App Review. `submit_to_testflight: false` controls beta-review submission; it does not disable the IPA upload or internal testing.

Before wider testing, check importing text/JSON/CSV/ZIP, M0/M1 results and evidence, M2 activity filters and timestamp diagnostics, saving/reopening analyses after closing the app, Share, Paste, and X connection/fetch. Manual analysis should work in airplane mode; fetching X posts requires internet. Existing Safari/PWA history is separate from the new iOS app's storage and will not migrate automatically.

If a build fails: a backend-origin error means step 2 is incomplete; missing profiles/certificates means step 4 is incomplete; an integration error means the name in step 3 differs; an upload bundle-ID error means the Apple app record/profile does not match `com.veriodetect.app`. For an already-used build number, increase `BUILD_NUMBER_BASE` in `codemagic.yaml`. Keep builds sequential. Build numbers otherwise increase using Codemagic's project build counter.

This is a TestFlight preparation package. Public release still requires device validation, accurate privacy disclosures and Apple's review, including its [minimum-functionality requirements](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality). The encryption flag reflects the inspected app's use of standard OS HTTPS only; reassess it if custom encryption is added.
