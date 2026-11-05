import {redis,response,readBody,sha} from '../../../backend-candidate/netlify/functions/_access.mjs';
import {identityService} from '../../identity-service.mjs';
import {recoverRefreshToken,revokeAppleToken} from '../../apple-identity.mjs';
import {randomUUID} from 'node:crypto';
const env=name=>(Netlify.env.get(name)||'').trim();
export default async req=>{
 if(req.method!=='POST')return response({error:'Method not allowed',revision:'signin-key-format-2'},405);
 if(env('APPLE_ACCOUNT_PREVIEW_ENABLED')!=='1')return response({error:'Apple account preview is not enabled.'},503);
 try{
  const configuration={privateKey:env('APPLE_SIGNIN_PRIVATE_KEY'),keyId:env('APPLE_SIGNIN_KEY_ID'),teamId:env('APPLE_SIGNIN_TEAM_ID'),tokenSecret:env('APPLE_SIGNIN_TOKEN_SECRET')};
  if(!configuration.privateKey||configuration.tokenSecret.length<32)return response({error:'Apple sign-in service is not configured.'},503);
  const service=identityService({redis,configuration}),body=await readBody(req);
  if(body.action==='challenge')return response(await service.challenge());
  if(body.action==='signin')return response(await service.signIn(body));
  const session=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  const identity=await service.authenticate(session,{allowDeleting:body.action==='delete'});
  if(body.action==='status')return response({accountId:identity.accountId,email:identity.email,purchasesEnabled:false,message:'Apple account connected. Credit purchases are not enabled in this preview.'});
  if(body.action==='signout'){await service.signOut(session);return response({signedOut:true})}
  if(body.action==='delete'){
   if(body.confirm!==true)return response({error:'Confirm account deletion.'},400);
   // Preview cannot accept purchases. Refuse erasure if any future paid balance exists.
   for(const mode of ['sandbox','production'])if(Number(await redis('GET',`verio:billing:${mode}:balance:${identity.accountId}`)||0)!==0)return response({error:'Credit-account deletion is not available in this preview.'},409);
   const key='verio:identity:account:'+identity.accountId,raw=await redis('GET',key);
   if(!raw)return response({error:'Account no longer exists.'},401);
   const account=JSON.parse(raw);
   // Stop new sessions before revoking at Apple. Failed revocation remains retryable.
   const lease=randomUUID(),started=await redis('EVAL',"local r=redis.call('GET',KEYS[1]);if not r then return 0 end;local a=cjson.decode(r);if a.state=='deleting' and tonumber(a.deleteAt or 0)>tonumber(ARGV[2])-60000 then return 0 end;a.state='deleting';a.deleteLease=ARGV[1];a.deleteAt=tonumber(ARGV[2]);redis.call('SET',KEYS[1],cjson.encode(a));return 1",1,key,lease,Date.now());
   if(Number(started)!==1)return response({error:'Deletion is already in progress. Please retry in one minute.'},409);
   try{await revokeAppleToken(recoverRefreshToken(account.refreshToken,configuration.tokenSecret),configuration)}catch{
    await redis('EVAL',"local r=redis.call('GET',KEYS[1]);if r then local a=cjson.decode(r);if a.deleteLease==ARGV[1] then a.state='active';a.deleteLease=nil;a.deleteAt=nil;redis.call('SET',KEYS[1],cjson.encode(a)) end end;return 1",1,key,lease);
    return response({error:'Apple revocation could not be completed. Your account was kept; please retry.'},503);
   }
   const removed=await redis('EVAL',"local r=redis.call('GET',KEYS[1]);if not r then return 1 end;local a=cjson.decode(r);if a.deleteLease~=ARGV[1] then return 0 end;redis.call('DEL',KEYS[1],KEYS[2],KEYS[3]);return 1",3,key,'verio:identity:subject:'+account.subjectHash,'verio:identity:session:'+await sha(session),lease);
   if(Number(removed)!==1)throw Error('Deletion lease changed');
   return response({deleted:true});
  }
  return response({error:'Unsupported account action.'},400);
 }catch(e){
  // Never return Apple response bodies, tokens, key material or decoded identity claims.
  const safe=['Access database not configured','Access database URL is invalid','Access database token was rejected','Access database connection failed','Access database unavailable','Access database error','Apple signing keys are temporarily unavailable','Apple identity verification failed','Apple exchanged identity verification failed','Apple sign-in service is not configured','Apple private key format is invalid','Apple server authentication was rejected','Apple authorization code expired or was already used','Apple sign-in could not be completed','Apple sign-in response was incomplete','Account token encryption is not configured','Sign-in challenge expired. Please sign in again.','Sign-in challenge already used','Please sign in again','Sign in with Apple to continue','This account is unavailable'];
  return response({error:safe.includes(e.message)?e.message:'Apple account operation could not be completed. Please sign in again or contact support.'},400);
 }
};
export const config={path:'/api/live-x-account',rateLimit:{windowLimit:100,windowSize:3600,aggregateBy:['ip']}};
