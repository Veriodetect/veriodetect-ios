const X_API='https://api.x.com/2';
const out=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache}});
export default async (req)=>{
  if(req.method!=='GET') return out({error:'Method not allowed'},405);
  const token=Netlify.env.get('X_BEARER_TOKEN');
  if(!token) return out({error:'X integration is not configured. X_BEARER_TOKEN is missing from the Netlify Function environment.'},503);
  let username='',requested=250;
  try{const u=new URL(req.url);username=(u.searchParams.get('username')||'').replace(/^@/,'').trim();requested=Math.max(5,Math.min(1000,Number(u.searchParams.get('count'))||250));}
  catch{return out({error:'VerioDetect received an invalid request URL.'},400)}
  if(!/^[A-Za-z0-9_]{1,15}$/.test(username)) return out({error:'Enter a valid X handle.'},400);
  const headers={authorization:`Bearer ${token}`};
  try{
    const ur=await fetch(`${X_API}/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username`,{headers});
    let uj={};try{uj=await ur.json()}catch{}
    if(!ur.ok||!uj.data?.id){const m=ur.status===401?'X authentication failed (HTTP 401).':ur.status===403?'X API access denied (HTTP 403). Check your X API plan/permissions.':ur.status===404?'X account not found.':ur.status===429?'X API rate/usage limit reached (HTTP 429).':uj.detail||uj.title||`Could not resolve this X account (HTTP ${ur.status}).`;return out({error:m},ur.status||502)}
    const posts=[];let next;
    while(posts.length<requested){
      const max=Math.min(100,requested-posts.length),q=new URLSearchParams({max_results:String(Math.max(5,max)),'tweet.fields':'id,created_at,text,referenced_tweets'});if(next)q.set('pagination_token',next);
      const tr=await fetch(`${X_API}/users/${uj.data.id}/tweets?${q.toString()}`,{headers});let tj={};try{tj=await tr.json()}catch{}
      if(!tr.ok){const m=tr.status===401?'X authentication failed (HTTP 401).':tr.status===403?'X API access denied (HTTP 403). Check your X API plan/permissions.':tr.status===429?'X API rate/usage limit reached (HTTP 429).':tj.detail||tj.title||`X did not return posts (HTTP ${tr.status}).`;return out({error:m},tr.status||502)}
      for(const t of tj.data||[]){const refs=t.referenced_tweets||[];let type='original';if(refs.some(r=>r.type==='retweeted'))type='repost';else if(refs.some(r=>r.type==='replied_to'))type='reply';posts.push({id:t.id,created_at:t.created_at,text:t.text||'',type})}
      next=tj.meta?.next_token;if(!next||!(tj.data||[]).length)break;
    }
    return out({account:uj.data,posts:posts.slice(0,requested),count:posts.length},200,'public, max-age=300, s-maxage=3600');
  }catch{return out({error:'Netlify Function is running, but the request to X failed.'},502)}
};
export const config={path:'/api/x-posts'};
