import {authorize} from './_access.mjs';
const X_API='https://api.x.com/2';
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':cache}});
const env=name=>(Netlify.env.get(name)||'').trim();
export default async function legacyXPosts(req){
 if(env('LIVE_X_PRODUCTION_CREDITS_REQUIRED')==='1'){
  return json({error:'This version cannot use Verio Credits. Update VerioDetect to retrieve fresh X activity.'},426);
 }
 return fetchApprovedXPosts(req);
}

// The credit endpoint calls this only after successfully reserving credits.
export async function fetchApprovedXPosts(req){
 let access;try{access=await authorize(req,true)}catch{return json({error:'Access service unavailable.'},503)}if(!access.ok)return json({error:access.error},access.status);
 const token=env('X_BEARER_TOKEN');if(!token)return json({error:'X integration is not configured.'},503);
 const u=new URL(req.url),username=(u.searchParams.get('username')||'').replace(/^@/,'').trim();
 if(!/^[A-Za-z0-9_]{1,15}$/.test(username))return json({error:'Enter a valid X username.'},400);
 const headers={authorization:`Bearer ${token}`};
 try{
  const ur=await fetch(`${X_API}/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username`,{headers});let uj={};try{uj=await ur.json()}catch{}
  if(!ur.ok||!uj.data?.id)return json({error:ur.status===429?'X API rate/usage limit reached.':uj.detail||uj.title||`Could not resolve this X account (HTTP ${ur.status}).`},ur.status||502);
  // Security boundary: exactly one timeline request, server-fixed maximum of 100. No client count/cursor/pagination is accepted.
  const q=new URLSearchParams({max_results:'100','tweet.fields':'id,created_at,text,referenced_tweets'});
  const tr=await fetch(`${X_API}/users/${uj.data.id}/tweets?${q}`,{headers});let tj={};try{tj=await tr.json()}catch{}
  if(!tr.ok)return json({error:tr.status===429?'X API rate/usage limit reached.':tj.detail||tj.title||`X did not return posts (HTTP ${tr.status}).`},tr.status||502);
  const posts=(tj.data||[]).slice(0,100).map(t=>{const refs=t.referenced_tweets||[];let type='original';if(refs.some(r=>r.type==='retweeted'))type='repost';else if(refs.some(r=>r.type==='replied_to'))type='reply';return{id:t.id,created_at:t.created_at,text:t.text||'',type}});
  return json({account:uj.data,posts,count:posts.length,limit:100},200);
 }catch{return json({error:'Netlify Function is running, but the request to X failed.'},502)}
}
// Beta cost guard: max 10 live-X fetches/day from one source IP. Authorization is checked before X is called.
export const config={path:'/api/x-posts',rateLimit:{windowLimit:10,windowSize:86400,aggregateBy:['ip']}};
