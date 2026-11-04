import {redis,response,readBody,sha} from './_access.mjs';
export default async req=>{
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 try{const {name,email,reason='',website=''}=await readBody(req);if(website)return response({message:'Request received.'});
 const n=String(name||'').trim().slice(0,100),e=String(email||'').trim().toLowerCase(),r=String(reason||'').trim().slice(0,500);
 if(n.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)||e.length>254)return response({error:'Enter your name and a valid email address.'},400);
 const emailHash=await sha(e),guard=await redis('SET',`verio:request-guard:${emailHash}`,'1','EX',86400,'NX');if(guard!=='OK')return response({message:'If eligible, your request is already awaiting review.'});
 const id=crypto.randomUUID(),record={id,name:n,email:e,reason:r,status:'pending',createdAt:new Date().toISOString()};await redis('SET',`verio:request:${id}`,JSON.stringify(record));await redis('LPUSH','verio:requests',id);
 return response({message:'Request submitted for manual review. You will receive a code only after approval.'},202);
 }catch{return response({error:'Unable to submit request. Please try later.'},503)}
};
export const config={path:'/api/access-request',rateLimit:{windowLimit:5,windowSize:3600,aggregateBy:['ip']}};
