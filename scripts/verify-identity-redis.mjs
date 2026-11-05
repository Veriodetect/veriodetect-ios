import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {identityService} from '../billing-candidate/identity-service.mjs';
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
 console.log('PASS: real Redis one-use Apple nonce, concurrent replay rejection, stable account recovery, encrypted refresh token and session generation invalidation.');
}
