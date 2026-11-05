import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {loadAppleKeys,verifyIdentityToken,exchangeAppleCode,protectRefreshToken} from './apple-identity.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const LOGIN_SCRIPT=`
local accountId=redis.call('GET',KEYS[1]);if not accountId then accountId=ARGV[1] end
local accountKey=ARGV[2]..accountId;local raw=redis.call('GET',accountKey)
local account;if raw then account=cjson.decode(raw);if account.state~='active' then return {0,''} end else account={id=accountId,state='active',generation=1,createdAt=ARGV[3]} end
account.refreshToken=ARGV[4];account.subjectHash=ARGV[7];if ARGV[5]~='' then account.email=ARGV[5] end
redis.call('SET',KEYS[1],accountId);redis.call('SET',accountKey,cjson.encode(account))
redis.call('SET',KEYS[2],cjson.encode({accountId=accountId,generation=account.generation}),'EX',ARGV[6]);return {1,accountId}`;
export function identityService({redis,configuration,fetchImpl=fetch}){
 const prefix='verio:identity:',ttl=7*86400;
 return {
  async challenge(){
   const id=randomUUID(),nonce=hash(randomBytes(32));
   await redis('SET',prefix+'challenge:'+id,nonce,'EX',300,'NX');return {challengeId:id,nonce};
  },
  async signIn({challengeId,identityToken,authorizationCode}){
   if(!uuid.test(challengeId||''))throw Error('Invalid sign-in challenge');
   const key=prefix+'challenge:'+challengeId,nonce=await redis('GET',key);
   if(!nonce)throw Error('Sign-in challenge expired. Please sign in again.');
   const keys=await loadAppleKeys(fetchImpl),identity=verifyIdentityToken(identityToken,{keys,nonce});
   // Consume only after verifying Apple's signature; one successful use, even concurrently.
   const consumed=await redis('EVAL',"if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end;redis.call('DEL',KEYS[1]);return 1",1,key,nonce);
   if(Number(consumed)!==1)throw Error('Sign-in challenge already used');
   const exchanged=await exchangeAppleCode(authorizationCode,configuration,{fetchImpl});
   const confirmed=verifyIdentityToken(exchanged.identityToken,{keys,nonce});
   if(confirmed.subjectHash!==identity.subjectHash)throw Error('Apple sign-in identity changed');
   const protectedToken=protectRefreshToken(exchanged.refreshToken,configuration.tokenSecret);
   const session=randomBytes(32).toString('hex');
   const [ok,id]=await redis('EVAL',LOGIN_SCRIPT,2,prefix+'subject:'+identity.subjectHash,prefix+'session:'+hash(session),randomUUID(),prefix+'account:',new Date().toISOString(),protectedToken,confirmed.email||'',ttl,identity.subjectHash);
   if(Number(ok)!==1)throw Error('This account is unavailable');
   return {session,accountId:id,expiresIn:ttl};
  },
  async authenticate(session,{allowDeleting=false}={}){
   if(!/^[a-f0-9]{64}$/.test(session||''))throw Error('Sign in with Apple to continue');
   const raw=await redis('GET',prefix+'session:'+hash(session));if(!raw)throw Error('Please sign in again');
   const credential=JSON.parse(raw),accountRaw=await redis('GET',prefix+'account:'+credential.accountId);
   if(!accountRaw)throw Error('Account no longer exists');const account=JSON.parse(accountRaw);
   if((account.state!=='active'&&!(allowDeleting&&account.state==='deleting'))||account.generation!==credential.generation)throw Error('Please sign in again');
   // Never return refresh tokens or internal account records to the client.
   return {accountId:account.id,email:account.email||''};
  },
  async signOut(session){if(/^[a-f0-9]{64}$/.test(session||''))await redis('DEL',prefix+'session:'+hash(session));},
 };
}
