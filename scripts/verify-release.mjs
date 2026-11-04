import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const original=fs.readFileSync('release-settings.json');
const plist=fs.readFileSync('ios/App/App/Info.plist');
function run(script,env={}) {
  return spawnSync(process.execPath,[script],{env:{...process.env,...env},encoding:'utf8'});
}
try {
  let r=run('scripts/build.mjs',{APP_CHANNEL:'release',NETLIFY_ORIGIN:'https://veriodetectbeta.netlify.app'});
  assert.notEqual(r.status,0);assert.match(r.stderr,/backend is not validated/);
  r=run('scripts/build.mjs',{APP_CHANNEL:'staging',NETLIFY_ORIGIN:'https://veriodetectbeta.netlify.app'});
  assert.notEqual(r.status,0);assert.match(r.stderr,/only permits/);
  const fixture={...JSON.parse(original),backendValidated:true,privacyFinalized:true,supportUrl:'https://example.invalid/support',privacyUrl:'https://example.invalid/privacy'};
  fs.writeFileSync('release-settings.json',JSON.stringify(fixture));
  r=run('scripts/build.mjs',{APP_CHANNEL:'release',NETLIFY_ORIGIN:fixture.backendOrigin});
  assert.equal(r.status,0,r.stderr);
  r=run('scripts/verify.mjs',{APP_CHANNEL:'release',NETLIFY_ORIGIN:fixture.backendOrigin});
  assert.equal(r.status,0,r.stderr);
  const html=fs.readFileSync('www/index.html','utf8');
  assert(!html.includes('VerioDetect v0.7.9 Staging'));
  assert(html.includes('https://example.invalid/privacy'));
  const py=spawnSync('python',['scripts/configure-ios.py'],{env:{...process.env,APP_CHANNEL:'release',PROJECT_BUILD_NUMBER:'18'},encoding:'utf8'});
  assert.equal(py.status,0,py.stderr);
  const info=fs.readFileSync('ios/App/App/Info.plist','utf8');
  assert(info.includes('<string>VerioDetect</string>'));assert(info.includes('<string>118</string>'));
  console.log('PASS: release fixture build, regression suite, name/version, privacy/support links and build 118.');
  console.log('PASS: unvalidated release backend and cross-channel origin are blocked.');
} finally {
  fs.writeFileSync('release-settings.json',original);
  fs.writeFileSync('ios/App/App/Info.plist',plist);
  const r=run('scripts/build.mjs',{APP_CHANNEL:'staging',NETLIFY_ORIGIN:'https://veriodetect-staging.netlify.app'});
  assert.equal(r.status,0,r.stderr);
}
