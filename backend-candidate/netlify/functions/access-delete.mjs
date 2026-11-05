import {redis,response,readBody,sha} from './_access.mjs';
// Resolve proof again and validate every target before mutating any record.
export const DELETE_SCRIPT=`
local proof=redis.call('GET',KEYS[1]);if not proof then return {0} end
local kind=ARGV[1];local id=ARGV[2];local email=ARGV[3]
local raw=redis.call('GET','verio:request:'..id);if not raw then return {0} end
local root=cjson.decode(raw);if root.email~=email then return {0} end
if kind=='code' then
 local a=cjson.decode(proof);if a.requestId~=id or a.email~=email then return {0} end
elseif kind=='receipt' then
 if proof~=id or root.deletionHash~=ARGV[8] then return {0} end
else return {0} end
if redis.call('LLEN',KEYS[2])>10000 then return {2} end
local targets={};local ids=redis.call('LRANGE',KEYS[2],0,-1)
for _,rid in ipairs(ids) do
 local rraw=redis.call('GET','verio:request:'..rid)
 if rraw then
  local r=cjson.decode(rraw)
  if (kind=='code' and r.email==email) or (kind=='receipt' and rid==id) then
   if r.codeHash then
    local craw=redis.call('GET','verio:code:'..r.codeHash)
    if craw then local a=cjson.decode(craw);if a.email~=email or a.requestId~=rid then return {2} end end
   end
   table.insert(targets,{id=rid,record=r})
  end
 end
end
local found=false;for _,t in ipairs(targets) do if t.id==id then found=true end end
if not found then return {2} end
for _,t in ipairs(targets) do
 local r=t.record
 if r.codeHash then
  redis.call('DEL','verio:code:'..r.codeHash)
  for i=5,7 do redis.call('DEL','verio:usage:'..ARGV[i]..':'..r.codeHash) end
 end
 if r.deletionHash then redis.call('DEL','verio:delete:'..r.deletionHash) end
 redis.call('DEL','verio:request:'..t.id);redis.call('LREM',KEYS[2],0,t.id)
end
local guard='verio:request-guard:'..ARGV[4]
if kind=='code' or redis.call('GET',guard)==id then redis.call('DEL',guard) end
return {1}
`;
export default async req=>{
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
 if(!/^(?:[a-f0-9]{48}|[a-f0-9]{64})$/.test(token))return response({error:'Enter your individual access code or deletion receipt.'},401);
 try {
  const body=await readBody(req);if(body.confirm!==true)return response({error:'Confirm deletion before continuing.'},400);
  const hash=await sha(token),kind=token.length===48?'code':'receipt',key=`verio:${kind==='code'?'code':'delete'}:${hash}`;
  const proof=await redis('GET',key);if(!proof)return response({error:'Access code or deletion receipt is not recognized.'},401);
  const id=kind==='code'?JSON.parse(proof).requestId:proof;
  if(!/^[0-9a-f-]{36}$/i.test(String(id)))throw Error('Invalid stored reference');
  const raw=await redis('GET',`verio:request:${id}`);if(!raw)return response({error:'Access code or deletion receipt is not recognized.'},401);
  const record=JSON.parse(raw);if(typeof record.email!=='string')throw Error('Missing identity');
  const days=[0,1,2].map(n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10));
  const out=await redis('EVAL',DELETE_SCRIPT,'2',key,'verio:requests',kind,id,record.email,await sha(record.email),...days,hash);
  if(Number(out?.[0])===0)return response({error:'Access code or deletion receipt is not recognized.'},401);
  if(Number(out?.[0])!==1)throw Error('Deletion incomplete');
  return response({deleted:true,message:'Registration data and related access deleted.'});
 }catch{return response({error:'Deletion could not be completed. Your local data has been kept. Please try again.'},503)}
};
export const config={path:'/api/access-delete',rateLimit:{windowLimit:30,windowSize:3600,aggregateBy:['ip']}};
