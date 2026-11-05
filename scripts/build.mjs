import fs from 'node:fs';
import {build} from 'esbuild';
import {readProfile} from './build-profile.mjs';
import {addM2Results,addM2ShareButton} from './m2-results.mjs';
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const profile = readProfile();
const accountPreview=process.env.LIVE_X_ACCOUNT_PREVIEW==='1';
if(accountPreview&&profile.channel!=='staging')throw Error('Account preview is staging-only.');
const u = new URL(profile.origin);
fs.rmSync('www', {recursive:true, force:true});
fs.mkdirSync('www', {recursive:true});
for(const file of ['index.html','styles.css','icon-192.png','icon-512.png','manifest.webmanifest']) fs.copyFileSync(`web-source/${file}`,`www/${file}`);
let code = fs.readFileSync('web-source/app.js','utf8');
const registrationMarker='// Manual beta access request (does not grant access or expose admin credentials).';
if(!code.includes(registrationMarker))throw Error('Registration source boundary changed.');
code=code.slice(0,code.indexOf(registrationMarker));
code=addM2Results(code);
if(accountPreview)code+="\ninstallAppleAccount({native:registerPlugin('VerioCredits'),request:nativeFetch});\n";
code+="\ninstallAccessLifecycle({request:nativeFetch,onDeleted:()=>{latest=null;xImportedPosts=null;xImportedName='';$('#thread').value='';$('#xPosts').value='';renderHistory();}});\n";
const replace = (a,b) => {if(!code.includes(a)) throw Error(`Source changed: ${a}`);code=code.replace(a,b);};
replace("'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm'", "'fflate'");
replace('await fetch(url,{headers})', 'await nativeFetch(url,{headers})');
if (/\bfetch\s*\(/.test(code)) throw Error('Unadapted frontend fetch: review native routing.');
replace('await navigator.clipboard.readText()', '(await Clipboard.read()).value');
replace("if(navigator.share)await navigator.share({title:'VerioDetect result',text});else await navigator.clipboard.writeText(text)", "await Share.share({title:'VerioDetect result',text})");
replace("if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});", '// Native app uses bundled assets; no service worker.');
if (profile.channel === 'release') code = code.replaceAll('authorized beta tester code', 'approved access code');
code = (accountPreview?"import {registerPlugin} from '@capacitor/core';\nimport {installAppleAccount} from '../client/apple-account.mjs';\n":'')+"import {CapacitorHttp} from '@capacitor/core';\nimport {Clipboard} from '@capacitor/clipboard';\nimport {Share} from '@capacitor/share';\nimport {createNativeFetch} from '../scripts/native-api.mjs';\nimport {installAccessLifecycle} from '../client/access-lifecycle.mjs';\n" + `const nativeFetch=createNativeFetch(CapacitorHttp,${JSON.stringify(u.origin)});\n` + code;
await build({stdin:{contents:code,resolveDir:process.cwd()+'/web-source',sourcefile:'app.js',loader:'js'},bundle:true,format:'esm',platform:'browser',target:'safari16',outfile:'www/app.js',legalComments:'eof'});
fs.copyFileSync('node_modules/fflate/LICENSE','www/fflate-LICENSE.txt');
// ZIP metadata still says 0.7.8 / 0.7.5; correct only the packaged About label.
let html = fs.readFileSync('www/index.html','utf8').replace(/VerioDetect v0\.7\.\d+/g, `VerioDetect v${version}${profile.channel === 'staging' ? ' Staging' : ''}`);
html=html.replace('<h1 class="page-title">About VerioDetect</h1>','<h1 class="page-title">About VerioDetect</h1>'+fs.readFileSync('client/access-panel.html','utf8'));
if(accountPreview)html=html.replace('<h1 class="page-title">About VerioDetect</h1>','<h1 class="page-title">About VerioDetect</h1>'+fs.readFileSync('client/apple-account.html','utf8'));
if (profile.channel === 'release') {
  html = html.replaceAll('Authorized beta access', 'Approved X access').replaceAll('authorized beta testers', 'approved users');
  const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  html = html.replace('<h3>Experimental evidence, not proof</h3>', `<p><a href="${escape(profile.privacyUrl)}" target="_blank" rel="noopener noreferrer">Privacy policy</a> · <a href="${escape(profile.supportUrl)}" target="_blank" rel="noopener noreferrer">Support</a></p><h3>Experimental evidence, not proof</h3>`);
  html = html.replace('Requests are reviewed manually. No access is granted automatically.', 'Live X access requires manual approval and is subject to daily limits. Name, email and your optional reason are sent to our server for review. See the Privacy policy in About.');
}
fs.writeFileSync('www/index.html', html);
fs.writeFileSync('www/index.html',addM2ShareButton(html));
fs.writeFileSync('www/build-info.json', JSON.stringify({...profile, version}, null, 2)+'\n');
console.log(`Bundled v${version} for`,u.origin);

// Restore the required native app icon even when browser uploads omit nested folders.
const iconDirectory = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
fs.mkdirSync(iconDirectory, {recursive:true});
// Preserve the committed catalog and fail clearly if an icon is missing.
const catalog = JSON.parse(fs.readFileSync(iconDirectory+'/Contents.json','utf8'));
for (const image of catalog.images) if (image.filename && !fs.existsSync(iconDirectory+'/'+image.filename)) throw Error(`Missing app icon: ${image.filename}`);
console.log('Using committed VerioDetect AppIcon.');
