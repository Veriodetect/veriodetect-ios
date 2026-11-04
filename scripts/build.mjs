import fs from 'node:fs';
import {build} from 'esbuild';
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const settings = JSON.parse(fs.readFileSync('app-settings.json', 'utf8'));
const origin = process.env.NETLIFY_ORIGIN || settings.backendOrigin;
const u = new URL(origin);
if(u.href !== 'https://veriodetect-staging.netlify.app/') throw Error('This preparation branch only permits https://veriodetect-staging.netlify.app.');
fs.rmSync('www', {recursive:true, force:true});
fs.mkdirSync('www', {recursive:true});
for(const file of ['index.html','styles.css','icon-192.png','icon-512.png','manifest.webmanifest']) fs.copyFileSync(`web-source/${file}`,`www/${file}`);
let code = fs.readFileSync('web-source/app.js','utf8');
const replace = (a,b) => {if(!code.includes(a)) throw Error(`Source changed: ${a}`);code=code.replace(a,b);};
replace("'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm'", "'fflate'");
replace('await fetch(url,{headers})', 'await nativeFetch(url,{headers})');
replace("await fetch('/api/access-request',", "await nativeFetch('/api/access-request',");
if (/\bfetch\s*\(/.test(code)) throw Error('Unadapted frontend fetch: review native routing.');
replace('await navigator.clipboard.readText()', '(await Clipboard.read()).value');
replace("if(navigator.share)await navigator.share({title:'VerioDetect result',text});else await navigator.clipboard.writeText(text)", "await Share.share({title:'VerioDetect result',text})");
replace("if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});", '// Native app uses bundled assets; no service worker.');
code = "import {CapacitorHttp} from '@capacitor/core';\nimport {Clipboard} from '@capacitor/clipboard';\nimport {Share} from '@capacitor/share';\nimport {createNativeFetch} from '../scripts/native-api.mjs';\n" + `const nativeFetch=createNativeFetch(CapacitorHttp,${JSON.stringify(u.origin)});\n` + code;
await build({stdin:{contents:code,resolveDir:process.cwd()+'/web-source',sourcefile:'app.js',loader:'js'},bundle:true,format:'esm',platform:'browser',target:'safari16',outfile:'www/app.js',legalComments:'eof'});
fs.copyFileSync('node_modules/fflate/LICENSE','www/fflate-LICENSE.txt');
// ZIP metadata still says 0.7.8 / 0.7.5; correct only the packaged About label.
const html = fs.readFileSync('www/index.html','utf8').replace(/VerioDetect v0\.7\.\d+/g, `VerioDetect v${version} Staging`);
fs.writeFileSync('www/index.html', html);
console.log(`Bundled v${version} for`,u.origin);

// Restore the required native app icon even when browser uploads omit nested folders.
const iconDirectory = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
fs.mkdirSync(iconDirectory, {recursive:true});
// Preserve the committed catalog and fail clearly if an icon is missing.
const catalog = JSON.parse(fs.readFileSync(iconDirectory+'/Contents.json','utf8'));
for (const image of catalog.images) if (image.filename && !fs.existsSync(iconDirectory+'/'+image.filename)) throw Error(`Missing app icon: ${image.filename}`);
console.log('Using committed VerioDetect AppIcon.');
