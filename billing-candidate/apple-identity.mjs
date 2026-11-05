import {createPublicKey,verify,sign,createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {CATALOG} from './catalog.mjs';
const APPLE='https://appleid.apple.com';
const digest=s=>createHash('sha256').update(s).digest('hex');
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
// Caller must fetch keys only from Apple's fixed HTTPS endpoint. Never honor jku/x5u.
export function verifyIdentityToken(token,{keys,nonce,now=Math.floor(Date.now()/1000)}){
 if(typeof token!=='string'||token.length>16000||!Array.isArray(keys))throw Error('Invalid Apple identity');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid Apple identity');
 let header,payload;try{header=JSON.parse(Buffer.from(parts[0],'base64url'));payload=JSON.parse(Buffer.from(parts[1],'base64url'))}catch{throw Error('Invalid Apple identity')}
 if(header.alg!=='RS256'||typeof header.kid!=='string'||header.crit||header.jku||header.jwk||header.x5u)throw Error('Unsupported Apple signature');
 const key=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.use==='sig'&&(!k.alg||k.alg==='RS256'));
 if(!key||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('Apple identity signature rejected');
 if(payload.iss!==APPLE||payload.aud!==CATALOG.bundleId||!Number.isInteger(payload.exp)||payload.exp<=now||!Number.isInteger(payload.iat)||payload.iat>now+60||payload.iat<now-600||payload.nonce!==nonce||typeof nonce!=='string'||nonce.length!==64||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255)throw Error('Apple identity claims rejected');
 return {subjectHash:digest(payload.sub),...(payload.email&&(payload.email_verified===true||payload.email_verified==='true')?{email:payload.email}:{})};
}
let cachedKeys;
export async function loadAppleKeys(fetchImpl=fetch){
 if(cachedKeys&&cachedKeys.until>Date.now())return cachedKeys.keys;
 const response=await fetchImpl(APPLE+'/auth/keys',{redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Apple identity service unavailable');
 const data=await response.json();if(!Array.isArray(data.keys)||data.keys.length>20)throw Error('Invalid Apple signing keys');
 cachedKeys={keys:data.keys,until:Date.now()+300000};return data.keys;
}
export function appleClientSecret({privateKey,keyId,teamId,now=Math.floor(Date.now()/1000)}){
 if(!/^[A-Z0-9]{10}$/.test(keyId||'')||!/^[A-Z0-9]{10}$/.test(teamId||'')||!privateKey?.includes('BEGIN PRIVATE KEY'))throw Error('Apple sign-in service is not configured');
 const input=encode({alg:'ES256',kid:keyId})+'.'+encode({iss:teamId,iat:now,exp:now+300,aud:APPLE,sub:CATALOG.bundleId});
 return input+'.'+sign('sha256',Buffer.from(input),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
}
export async function exchangeAppleCode(code,configuration,{fetchImpl=fetch}={}){
 if(typeof code!=='string'||code.length<10||code.length>4000)throw Error('Invalid Apple authorization code');
 const body=new URLSearchParams({client_id:CATALOG.bundleId,client_secret:appleClientSecret(configuration),code,grant_type:'authorization_code'});
 const response=await fetchImpl(APPLE+'/auth/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/x-www-form-urlencoded'},body});
 if(!response.ok)throw Error('Apple sign-in could not be completed');
 const value=await response.json();if(typeof value.refresh_token!=='string'||typeof value.id_token!=='string')throw Error('Apple sign-in response was incomplete');
 return {refreshToken:value.refresh_token,identityToken:value.id_token};
}
export async function revokeAppleToken(refreshToken,configuration,{fetchImpl=fetch}={}){
 const body=new URLSearchParams({client_id:CATALOG.bundleId,client_secret:appleClientSecret(configuration),token:refreshToken,token_type_hint:'refresh_token'});
 const response=await fetchImpl(APPLE+'/auth/revoke',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/x-www-form-urlencoded'},body});
 if(!response.ok)throw Error('Apple account revocation is temporarily unavailable');
}
function encryptionKey(secret){if(typeof secret!=='string'||secret.length<32)throw Error('Account token encryption is not configured');return createHash('sha256').update(secret).digest()}
export function protectRefreshToken(token,secret){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(secret),iv);
 cipher.setAAD(Buffer.from(CATALOG.bundleId));
 const ciphertext=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
 return [iv,cipher.getAuthTag(),ciphertext].map(x=>x.toString('base64url')).join('.');
}
export function recoverRefreshToken(protectedToken,secret){
 const parts=protectedToken.split('.');if(parts.length!==3)throw Error('Invalid protected token');
 const [iv,tag,data]=parts.map(x=>Buffer.from(x,'base64url'));if(iv.length!==12||tag.length!==16)throw Error('Invalid protected token');
 const decipher=createDecipheriv('aes-256-gcm',encryptionKey(secret),iv);decipher.setAAD(Buffer.from(CATALOG.bundleId));decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');
}
