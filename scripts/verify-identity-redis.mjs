import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import {identityService} from '../billing-candidate/identity-service.mjs';
import {createLedger} from '../billing-candidate/ledger.mjs';
import {sha} from '../backend-candidate/netlify/functions/_access.mjs';
export async function verifyIdentityRedis(redis){
 const rsa=generateKeyPairSync('rsa',{modulusLength:2048}),ec=generateKeyPairSync('ec',{namedCurve:'P-256'});
 const configuration={privateKey:ec.privateKey.export({type:'pkcs8',format:'pem'}),keyId:'AAAAAAAAAA',teamId:'BBBBBBBBBB',tokenSecret:'t'.repeat(40)};
 const jwk={...rsa.publicKey.export({format:'jwk'}),kid:'apple-test-key',use:'sig',alg:'RS256'};
 let currentToken,exchangeCalls=0;
 const service=identityService({redis,configuration,fetchImpl:async(url,options)=>{
  if(url==='https://appleid.apple.com/auth/keys')return {ok:true,json:async()=>({keys:[jwk]})};
  assert.equal(url,'https://appleid.apple.com/auth/token');assert.equal(options.redirect,'error');exchangeCalls++;
  return {ok:true,json:async()=>({refresh_token:'private-test-refresh',id_token:currentToken})};
 }});
 const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const makeToken=nonce=>{const now=Math.floor(Date.now()/1000),input=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({iss:'https://appleid.apple.com',aud:'com.veriodetect.app',sub:'same-apple-user',nonce,iat:now,exp:now+300});return input+'.'+sign('RSA-SHA256',Buffer.from(input),rsa.privateKey).toString('base64url')};
 const challenge=await service.challenge();currentToken=makeToken(challenge.nonce);
 const input={...challenge,identityToken:currentToken,authorizationCode:'test-authorization-code'};
 const attempts=await Promise.allSettled([service.signIn(input),service.signIn(input)]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal(exchangeCalls,1);
 const login=attempts.find(x=>x.status==='fulfilled').value;
 assert.equal((await service.authenticate(login.session)).accountId,login.accountId);
 await assert.rejects(service.signIn(input),/expired|already used/);
 const next=await service.challenge();currentToken=makeToken(next.nonce);
 const recovered=await service.signIn({...next,identityToken:currentToken,authorizationCode:'test-authorization-code'});
 assert.equal(recovered.accountId,login.accountId,'Reinstall/sign-in must recover the stable billing account');
 const record=await redis('GET','verio:identity:account:'+login.accountId);assert(!record.includes('private-test-refresh'));
 assert.equal(Object.hasOwn(await service.authenticate(recovered.session),'refreshToken'),false);
 await service.signOut(login.session);await assert.rejects(service.authenticate(login.session),/sign in again/);
 assert.equal((await service.authenticate(recovered.session)).accountId,login.accountId);
 const account=JSON.parse(record);account.generation++;await redis('SET','verio:identity:account:'+account.id,JSON.stringify(account));
 await assert.rejects(service.authenticate(recovered.session),/sign in again/);
 // Exercise the actual staged HTTP handler, including Apple's revocation failure path.
 const oldFetch=globalThis.fetch,oldNetlify=globalThis.Netlify;
 let revokeOk=false,xLookups=0,xFails=false;
 globalThis.Netlify={env:{get:name=>({X_BEARER_TOKEN:'test-x-token',APPLE_ACCOUNT_PREVIEW_ENABLED:'1',APPLE_SIGNIN_PRIVATE_KEY:configuration.privateKey,APPLE_SIGNIN_KEY_ID:configuration.keyId,APPLE_SIGNIN_TEAM_ID:configuration.teamId,APPLE_SIGNIN_TOKEN_SECRET:configuration.tokenSecret})[name]||oldNetlify.env.get(name)}};
 globalThis.fetch=async(url,options)=>{
  if(url==='https://appleid.apple.com/auth/token')return {ok:true,json:async()=>({refresh_token:'private-test-refresh',id_token:currentToken})};
  if(url==='https://appleid.apple.com/auth/revoke')return {ok:revokeOk};
  if(String(url).startsWith('https://api.x.com/2/users/by/username/')){
   xLookups++;
   return Response.json(xFails?{title:'Test lookup failed'}:{data:{id:'1',username:'example'}},{status:xFails?502:200});
  }
  if(String(url).startsWith('https://api.x.com/2/users/1/tweets'))return Response.json({data:[{id:'2',created_at:'2026-01-01T00:00:00Z'}]});
  return oldFetch(url,options);
 };
 try{
  const {default:handler}=await import('../billing-candidate/netlify/functions/live-x-account.mjs');
  const request=(body,session='',origin='https://example.invalid')=>new Request(origin+'/api/live-x-account',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+session},body:JSON.stringify(body)});
  const challenge=await (await handler(request({action:'challenge'}))).json();currentToken=makeToken(challenge.nonce);
  const signed=await handler(request({action:'signin',...challenge,identityToken:currentToken,authorizationCode:'test-authorization-code'}));assert.equal(signed.status,200);
  const login=await signed.json();const status=await handler(request({action:'status'},login.session));assert.equal(status.status,200);
  const visible=await status.json();assert.equal(visible.purchasesEnabled,false);assert(!JSON.stringify(visible).includes('refreshToken'));
  assert.equal((await handler(request({action:'delete'},login.session))).status,400);
  assert.equal((await handler(request({action:'delete',confirm:true},login.session))).status,503);
  assert.equal((await handler(request({action:'status'},login.session))).status,200,'Failed Apple revoke must preserve account');
  revokeOk=true;assert.equal((await handler(request({action:'delete',confirm:true},login.session))).status,200);
  assert.equal((await handler(request({action:'status'},login.session))).status,400);
  assert.equal(await redis('GET','verio:identity:account:'+login.accountId),null);
  const challenge2=await (await handler(request({action:'challenge'}))).json();currentToken=makeToken(challenge2.nonce);
  const sandboxLogin=await (await handler(request({action:'signin',...challenge2,identityToken:currentToken,authorizationCode:'test-authorization-code'}))).json();
  const sandbox=body=>handler(request(body,sandboxLogin.session,'https://veriodetect-staging.netlify.app'));
  const accessCode='b'.repeat(48);
  const operation={action:'fetchWithCredits',operationId:randomUUID(),username:'example',accessCode};
  assert.equal((await sandbox(operation)).status,401);
  await redis('SET','verio:code:'+await sha(accessCode),JSON.stringify({status:'active',quota:3}));
  assert.equal((await handler(request({action:'credits'},sandboxLogin.session))).status,400);
  assert.equal((await sandbox(operation)).status,409);
  assert.equal(xLookups,0);
  assert.equal((await sandbox({action:'claim',signedTransaction:'forged.purchase.proof'})).status,400);
  const ledger=createLedger(redis,{environment:'Sandbox',accountId:sandboxLogin.accountId,requireActiveAccount:true});
  await ledger.creditVerifiedPurchase('920000001');
  const fetched=await sandbox(operation);assert.equal(fetched.status,200);
  assert.equal((await fetched.json()).creditsUsed,3);
  assert.equal(await ledger.balance(),1017);
  assert.equal((await sandbox(operation)).status,409);
  assert.equal(xLookups,1);
  xFails=true;
  assert.equal((await sandbox({...operation,operationId:randomUUID()})).status,502);
  assert.equal(await ledger.balance(),1017);
  assert.equal((await sandbox({action:'delete',confirm:true})).status,409);
 }finally{globalThis.fetch=oldFetch;globalThis.Netlify=oldNetlify;}
 console.log('PASS: real Redis one-use Apple nonce, concurrent replay rejection, stable account recovery, encrypted refresh token and session generation invalidation.');
 console.log('PASS: preview HTTP sign-in/status, purchases disabled, deletion confirmation and Apple revocation failure preserves account.');
}
