import {authorize} from './_access.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async(req)=>{
 let access;try{access=await authorize(req,false)}catch{return json({error:'Access service unavailable.'},503)}if(!access.ok)return json({error:access.error},access.status);
 const token=Netlify.env.get('X_BEARER_TOKEN');if(!token)return json({error:'X API token missing.'},503);
 return json({message:'Authorized X beta access configured ✓',fetch_limit:100,daily_ip_limit:10,daily_user_limit:access.quota,used_today:access.used});
};
export const config={path:'/api/x-status',rateLimit:{windowLimit:30,windowSize:86400,aggregateBy:['ip']}};
