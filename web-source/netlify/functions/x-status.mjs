const X_API='https://api.x.com/2';
const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export default async ()=>{
  const token=Netlify.env.get('X_BEARER_TOKEN');
  if(!token) return out({error:'X API token missing. X_BEARER_TOKEN is not available to this Function.'},503);
  try{
    const r=await fetch(`${X_API}/users/by/username/X?user.fields=id`,{headers:{authorization:`Bearer ${token}`}});
    if(r.ok) return out({ok:true,message:'X API connected ✓'});
    let j={}; try{j=await r.json()}catch{}
    const msg=r.status===401?'X authentication failed (HTTP 401). Check the bearer token.':r.status===403?'X API access denied (HTTP 403). Check your X API plan/permissions.':r.status===429?'X API rate/usage limit reached (HTTP 429).':`X API returned HTTP ${r.status}${j.detail?': '+j.detail:''}`;
    return out({error:msg},r.status);
  }catch(e){return out({error:'Netlify Function is running, but it could not reach the X API.'},502)}
};
export const config={path:'/api/x-status'};
