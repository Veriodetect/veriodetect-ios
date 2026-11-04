import {admin,redis,response,readBody,sha} from './_access.mjs';
export default async req=>{
 if(!admin(req))return response({error:'Unauthorized'},401);
 try{
 if(req.method==='GET'){
  const ids=await redis('LRANGE','verio:requests','0','199')||[];const requests=[];for(const id of ids){const raw=await redis('GET',`verio:request:${id}`);if(raw)requests.push(JSON.parse(raw))}return response({requests});
 }
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 const {id,action,quota=10,expires=''}=await readBody(req);
 if(!/^[0-9a-f-]{36}$/i.test(String(id||''))||!['approve','reject','revoke'].includes(action))return response({error:'Invalid request'},400);
 const key=`verio:request:${id}`,raw=await redis('GET',key);if(!raw)return response({error:'Request not found'},404);
 const record=JSON.parse(raw);
 if(action==='approve'){
  if(record.status!=='pending')return response({error:'Request is no longer pending'},409);
  const q=Number(quota);if(!Number.isInteger(q)||q<1||q>100)return response({error:'Quota must be 1–100'},400);
  if(expires&&!/^\d{4}-\d{2}-\d{2}$/.test(expires))return response({error:'Invalid expiry date'},400);
  const code=Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b=>b.toString(16).padStart(2,'0')).join('');const hash=await sha(code);
  const access={email:record.email,status:'active',quota:q,expires,requestId:id};await redis('SET',`verio:code:${hash}`,JSON.stringify(access));
  record.status='approved';record.codeHash=hash;record.approvedAt=new Date().toISOString();await redis('SET',key,JSON.stringify(record));
  // Shown once. Admin must securely deliver code; never stored in plaintext.
  return response({request:record,code,notice:'Copy this code now and send it privately to the approved user. It cannot be recovered.'});
 }
 if(action==='reject'&&record.status==='pending'){record.status='rejected';await redis('SET',key,JSON.stringify(record));return response({request:record})}
 if(action==='revoke'&&record.status==='approved'&&record.codeHash){const ckey=`verio:code:${record.codeHash}`,value=await redis('GET',ckey);if(value){const access=JSON.parse(value);access.status='revoked';await redis('SET',ckey,JSON.stringify(access))}record.status='revoked';await redis('SET',key,JSON.stringify(record));return response({request:record})}
 return response({error:'Action is not allowed for current status'},409);
 }catch{return response({error:'Administrator operation failed'},503)}
};
export const config={path:'/api/access-admin'};
