// Shared server-only authorization. Requires Upstash Redis REST credentials.
const env = name => (Netlify.env.get(name) || '').trim();
export const response = (body,status=200) => new Response(JSON.stringify(body), {status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function redis(...command){
 const url=env('UPSTASH_REDIS_REST_URL'),token=env('UPSTASH_REDIS_REST_TOKEN');
 if(!url||!token)throw new Error('Access database not configured');
 if(!/^https:\/\/[^\s/?#@]+\/?$/.test(url))throw new Error('Access database URL is invalid');
 let res;try{res=await fetch(url.replace(/\/$/,'') ,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(command)});}catch{throw new Error('Access database connection failed')}
 if(res.status===401||res.status===403)throw new Error('Access database token was rejected');
 if(!res.ok)throw new Error('Access database unavailable');
 const data=await res.json();if(data.error)throw new Error('Access database error');return data.result;
}
export function admin(req){const expected=env('VERIO_ADMIN_TOKEN'),actual=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();if(!expected||!actual)return false;const a=new TextEncoder().encode(expected),b=new TextEncoder().encode(actual);let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a[i]||0)^(b[i]||0);return diff===0}
export const sha=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export const readBody=async req=>{const raw=await req.text();if(raw.length>4096)throw new Error('Request too large');return JSON.parse(raw||'{}')};
export const dateKey=()=>new Date().toISOString().slice(0,10);
export async function authorize(req,charge=false){
 const code=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
 if(!/^[a-f0-9]{48}$/.test(code))return {ok:false,status:401,error:'A valid individual access code is required.'};
 const key='verio:code:'+await sha(code);const today=dateKey();
 // Atomic Redis Lua check-and-increment: concurrent requests cannot exceed the daily quota.
 const script=`local raw=redis.call('GET',KEYS[1]);if not raw then return {0,'invalid'} end;local a=cjson.decode(raw);if a.status~='active' then return {0,'revoked'} end;if a.expires and a.expires~='' and a.expires<ARGV[2] then return {0,'expired'} end;local quota=tonumber(a.quota) or 10;local used=tonumber(redis.call('GET',KEYS[2]) or '0');if ARGV[1]=='1' then if used>=quota then return {0,'quota'} end;used=redis.call('INCR',KEYS[2]);redis.call('EXPIRE',KEYS[2],172800) end;return {1,tostring(used),tostring(quota),a.email or ''}`;
 const out=await redis('EVAL',script,'2',key,`verio:usage:${today}:${await sha(code)}`,charge?'1':'0',today);
 if(!Array.isArray(out)||Number(out[0])!==1){const reason=out?.[1];return {ok:false,status:reason==='quota'?429:401,error:reason==='quota'?'Your daily X retrieval quota has been reached.':'Access code is invalid, expired or revoked.'}}
 return {ok:true,used:Number(out[1]),quota:Number(out[2])};
}
