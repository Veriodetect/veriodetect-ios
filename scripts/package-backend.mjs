import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
const target=path.resolve('backend-package');
const channel=process.env.SITE_CHANNEL || 'staging';
if(!['staging','production'].includes(channel))throw Error('Unsupported SITE_CHANNEL');
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const settings=JSON.parse(fs.readFileSync('release-settings.json','utf8'));
fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
for(const name of ['index.html','styles.css','icon-192.png','icon-512.png','manifest.webmanifest','access-admin.html'])fs.copyFileSync('web-source/'+name,path.join(target,name));
fs.cpSync('backend-candidate/netlify',path.join(target,'netlify'),{recursive:true});
fs.writeFileSync(path.join(target,'netlify.toml'),'[build]\n  publish = "."\n  functions = "netlify/functions"\n');
let code=fs.readFileSync('web-source/app.js','utf8');
const marker='// Manual beta access request (does not grant access or expose admin credentials).';
if(!code.includes(marker))throw Error('Registration boundary changed');
code=code.slice(0,code.indexOf(marker)).replace("'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm'","'fflate'")
 .replace("if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});",'// Network-served candidate; no stale source service worker.');
code="import {installAccessLifecycle} from '../client/access-lifecycle.mjs';\n"+code+"\ninstallAccessLifecycle({request:fetch,onDeleted:()=>{latest=null;xImportedPosts=null;xImportedName='';$('#thread').value='';$('#xPosts').value='';renderHistory();}});\n";
await build({stdin:{contents:code,resolveDir:process.cwd()+'/web-source',sourcefile:'app.js'},bundle:true,format:'esm',platform:'browser',target:'safari16',outfile:path.join(target,'app.js')});
let html=fs.readFileSync(path.join(target,'index.html'),'utf8').replace('<h1 class="page-title">About VerioDetect</h1>','<h1 class="page-title">About VerioDetect</h1>'+fs.readFileSync('client/access-panel.html','utf8'));
html=html.replace(/VerioDetect v0\.7\.\d+/g,`VerioDetect v${version}${channel==='staging'?' Staging':''}`);
if(channel==='production'){
 const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(const field of ['privacyUrl','supportUrl'])if(new URL(settings[field]).protocol!=='https:')throw Error('HTTPS public policy/support required');
 html=html.replaceAll('Authorized beta access','Approved X access').replaceAll('authorized beta testers','approved users');
 html=html.replace('<h3>Experimental evidence, not proof</h3>',`<p><a href="${escape(settings.privacyUrl)}" target="_blank" rel="noopener noreferrer">Privacy policy</a> · <a href="${escape(settings.supportUrl)}" target="_blank" rel="noopener noreferrer">Support</a></p><h3>Experimental evidence, not proof</h3>`);
 html=html.replace('Requests are reviewed manually. No access is granted automatically.','Live X access requires manual approval and is subject to daily limits. Name, email and your optional reason are sent to our server for review. See the Privacy policy in About.');
}
fs.writeFileSync(path.join(target,'index.html'),html);
fs.copyFileSync('node_modules/fflate/LICENSE',path.join(target,'fflate-LICENSE.txt'));
fs.writeFileSync(path.join(target,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/api/*\n  Cache-Control: no-store\n');
console.log(`Prepared ${channel} backend-package. Functions require Netlify build bundling; nothing deployed locally.`);
