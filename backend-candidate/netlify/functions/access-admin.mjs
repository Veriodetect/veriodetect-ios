import {admin,redis,response,readBody,sha} from './_access.mjs';
export const ADMIN_SCRIPT=`
local raw=redis.call('GET',KEYS[1]);if not raw then return {0,404} end
local r=cjson.decode(raw);local action=ARGV[1]
if action=='approve' and r.status=='pending' then
 local access={email=r.email,status='active',quota=tonumber(ARGV[2]),expires=ARGV[3],requestId=r.id}
 redis.call('SET','verio:code:'..ARGV[4],cjson.encode(access))
 r.status='approved';r.codeHash=ARGV[4];r.approvedAt=ARGV[5]
elseif action=='reject' and r.status=='pending' then r.status='rejected'
elseif action=='revoke' and r.status=='approved' and r.codeHash then
 local ckey='verio:code:'..r.codeHash;local craw=redis.call('GET',ckey)
 if craw then local a=cjson.decode(craw);a.status='revoked';redis.call('SET',ckey,cjson.encode(a)) end
 r.status='revoked'
else return {0,409} end
redis.call('SET',KEYS[1],cjson.encode(r));return {1,cjson.encode(r)}
`;
export default async req=>{
 if(!admin(req))return response({error:'Unauthorized'},401);
 try {
  if(req.method==='GET') {
   const ids=await redis('LRANGE','verio:requests','0','199')||[],requests=[];
   for(const id of ids){const raw=await redis('GET',`verio:request:${id}`);if(raw)requests.push(JSON.parse(raw))}
   return response({requests});
  }
  if(req.method!=='POST')return response({error:'Method not allowed'},405);
  const {id,action,quota=10,expires=''}=await readBody(req);
  if(!/^[0-9a-f-]{36}$/i.test(String(id||''))||!['approve','reject','revoke'].includes(action))return response({error:'Invalid request'},400);
  const q=Number(quota);if(action==='approve'&&(!Number.isInteger(q)||q<1||q>100||expires&&!/^\d{4}-\d{2}-\d{2}$/.test(expires)))return response({error:'Invalid quota or expiry'},400);
  const code=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
  const out=await redis('EVAL',ADMIN_SCRIPT,'1',`verio:request:${id}`,action,String(q),expires,await sha(code),new Date().toISOString());
  if(Number(out?.[0])!==1)return response({error:Number(out?.[1])===404?'Request not found':'Action is not allowed for current status'},Number(out?.[1])===404?404:409);
  return response({request:JSON.parse(out[1]),...(action==='approve'?{code,notice:'Copy this code now and send it privately. It cannot be recovered.'}:{})});
 }catch{return response({error:'Administrator operation failed'},503)}
};
export const config={path:'/api/access-admin'};
