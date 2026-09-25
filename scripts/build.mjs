import fs from 'node:fs';
import {build} from 'esbuild';
const settings = JSON.parse(fs.readFileSync('app-settings.json', 'utf8'));
const origin = process.env.NETLIFY_ORIGIN || settings.backendOrigin;
const u = new URL(origin);
if(u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/' || u.search || u.hash || /YOUR-SITE/i.test(u.host)) throw Error('Set NETLIFY_ORIGIN in Codemagic or backendOrigin in app-settings.json to your production HTTPS origin (no path).');
fs.mkdirSync('www', {recursive:true});
for(const file of ['index.html','styles.css','icon-192.png','icon-512.png','manifest.webmanifest']) fs.copyFileSync(`web-source/${file}`,`www/${file}`);
let code = fs.readFileSync('web-source/app.js','utf8');
const replace = (a,b) => {if(!code.includes(a)) throw Error(`Source changed: ${a}`);code=code.replace(a,b);};
replace("'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm'", "'fflate'");
replace("const res=await fetch(url,{headers});", `const reply=await CapacitorHttp.get({url:new URL(url,${JSON.stringify(u.origin)}).href,headers,responseType:'text',connectTimeout:15000,readTimeout:60000});
 const res={status:reply.status,ok:reply.status>=200&&reply.status<300,text:async()=>typeof reply.data==='string'?reply.data:JSON.stringify(reply.data)};`);
replace('await navigator.clipboard.readText()', '(await Clipboard.read()).value');
replace("if(navigator.share)await navigator.share({title:'VerioDetect result',text});else await navigator.clipboard.writeText(text)", "await Share.share({title:'VerioDetect result',text})");
replace("if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});", '// Native app uses bundled assets; no service worker.');
code = "import {CapacitorHttp} from '@capacitor/core';\nimport {Clipboard} from '@capacitor/clipboard';\nimport {Share} from '@capacitor/share';\n" + code;
await build({stdin:{contents:code,resolveDir:process.cwd()+'/web-source',sourcefile:'app.js',loader:'js'},bundle:true,format:'esm',platform:'browser',target:'safari16',outfile:'www/app.js',legalComments:'eof'});
fs.copyFileSync('node_modules/fflate/LICENSE','www/fflate-LICENSE.txt');
console.log('Bundled v0.7.8 for',u.origin);

// Restore the required native app icon even when browser uploads omit nested folders.
const iconDirectory = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
fs.mkdirSync(iconDirectory, {recursive:true});
fs.writeFileSync(iconDirectory+'/Contents.json', "{\n  \"images\": [\n    {\n      \"filename\": \"AppIcon-512@2x.png\",\n      \"idiom\": \"universal\",\n      \"platform\": \"ios\",\n      \"size\": \"1024x1024\"\n    }\n  ],\n  \"info\": {\n    \"author\": \"xcode\",\n    \"version\": 1\n  }\n}");
console.log('Using committed VerioDetect AppIcon.');
