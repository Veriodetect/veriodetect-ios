import {redis,response,readBody,sha} from './_access.mjs';
export const REGISTER_SCRIPT=`
local existing=redis.call('GET','verio:delete:'..ARGV[3])
if existing then
 local raw=redis.call('GET','verio:request:'..existing)
 if raw then local r=cjson.decode(raw);if r.email==ARGV[4] and r.deletionHash==ARGV[3] then return {1} end end
 return {2}
end
local prior=redis.call('GET',KEYS[1])
if prior then
 local raw=redis.call('GET','verio:request:'..prior)
 if raw then local r=cjson.decode(raw);if r.deletionHash==ARGV[3] then return {1} end end
 return {0}
end
if redis.call('LLEN','verio:requests')>=10000 then return {2} end
redis.call('SET','verio:request:'..ARGV[1],ARGV[2])
redis.call('SET','verio:delete:'..ARGV[3],ARGV[1])
redis.call('LPUSH','verio:requests',ARGV[1])
redis.call('SET',KEYS[1],ARGV[1],'EX',86400)
return {1}
`;
export default async req=>{
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 try {
  const {name,email,reason='',website='',deletionToken}=await readBody(req);if(website)return response({message:'Request received.'});
  const n=String(name||'').trim().slice(0,100),e=String(email||'').trim().toLowerCase(),r=String(reason).trim().slice(0,500);
  if(n.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)||e.length>254)return response({error:'Enter your name and a valid email address.'},400);
  if(!/^[a-f0-9]{64}$/.test(String(deletionToken||'')))return response({error:'Update the app to request access and keep a deletion receipt.'},400);
  const id=crypto.randomUUID(),deletionHash=await sha(deletionToken),record={id,name:n,email:e,reason:r,status:'pending',createdAt:new Date().toISOString(),deletionHash};
  const out=await redis('EVAL',REGISTER_SCRIPT,'1',`verio:request-guard:${await sha(e)}`,id,JSON.stringify(record),deletionHash,e);
  if(Number(out?.[0])===0)return response({accepted:false,message:'A request for this email may already exist. Keep your existing deletion receipt or approved access code.'});
  if(Number(out?.[0])!==1)throw Error('Registration unavailable');
  return response({accepted:true,message:'Request submitted for manual review. Your private deletion receipt is saved on this device.'},202);
 }catch{return response({error:'Unable to submit request. Please try later.'},503)}
};
export const config={path:'/api/access-request',rateLimit:{windowLimit:5,windowSize:3600,aggregateBy:['ip']}};
