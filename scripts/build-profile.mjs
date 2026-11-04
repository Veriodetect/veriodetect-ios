import fs from 'node:fs';

export function readProfile(env = process.env) {
  const channel = env.APP_CHANNEL || 'staging';
  if (!['staging', 'release'].includes(channel)) throw Error('APP_CHANNEL must be staging or release.');
  const release = channel === 'release';
  const settings = JSON.parse(fs.readFileSync(release ? 'release-settings.json' : 'app-settings.json', 'utf8'));
  const expected = release ? 'https://veriodetectbeta.netlify.app' : 'https://veriodetect-staging.netlify.app';
  const origin = new URL(env.NETLIFY_ORIGIN || settings.backendOrigin);
  if (origin.href !== expected + '/') throw Error(`The ${channel} profile only permits ${expected}.`);
  if (release) {
    if (!settings.backendValidated) throw Error('Release backend is not validated. Review and approve the backend plan before enabling release builds.');
    if (!settings.privacyFinalized) throw Error('Finalize the published privacy policy before enabling release builds.');
    for (const key of ['supportUrl', 'privacyUrl']) {
      if (!settings[key]) throw Error(`Set the published ${key} before building a release.`);
      const url = new URL(settings[key]);
      if (url.protocol !== 'https:' || url.username || url.password) throw Error(`${key} must be a public HTTPS URL without credentials.`);
    }
  }
  return {channel, origin: origin.origin, displayName: release ? settings.displayName : 'VerioDetect Staging', ...(release ? {supportUrl: settings.supportUrl, privacyUrl: settings.privacyUrl} : {})};
}
