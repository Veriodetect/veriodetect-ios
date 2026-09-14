const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function parseDate(s){const d=new Date(s);return Number.isNaN(+d)?null:d}
function typeOf(x={}){const t=String(x.text??x.full_text??'').trim(); const refs=x.referenced_tweets||x.referencedTweets||[];
 if(refs.some(r=>r?.type==='retweeted')||/^RT\s+@/i.test(t))return 'repost';
 if(refs.some(r=>r?.type==='replied_to')||x.in_reply_to_status_id||x.in_reply_to_status_id_str||x.in_reply_to_user_id)return 'reply';
 return 'original';}
function norm(x){const raw=x?.tweet||x||{};const ds=raw.created_at||raw.createdAt||raw.timestamp||raw.date||raw.time;const d=parseDate(ds);if(!d)return null;return {time:+d,text:String(raw.full_text??raw.text??raw.content??''),type:typeOf(raw),id:String(raw.id_str??raw.id??'')};}
export function parseXStructured(data){let a=data;if(a?.data&&Array.isArray(a.data))a=a.data;if(a?.tweets&&Array.isArray(a.tweets))a=a.tweets;if(!Array.isArray(a))return [];return a.map(norm).filter(Boolean).sort((a,b)=>a.time-b.time)}
function stripJs(s){const i=s.indexOf('['),j=s.lastIndexOf(']');return i>=0&&j>i?s.slice(i,j+1):s}
export function parseXPosts(text){const t=text.trim();if(!t)return [];
 try{const j=JSON.parse(stripJs(t));const r=parseXStructured(j);if(r.length)return r}catch{}
 const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean),out=[];
 for(const line of lines){let m=line.match(/^\[?([^\]]{8,40})\]?\s*(?:[-–—|]\s*)?(.*)$/);if(m){const d=parseDate(m[1]);if(d){out.push({time:+d,text:m[2]||'',type:/^RT\s+@/i.test(m[2]||'')?'repost':'original'});continue}}
 const iso=line.match(/(20\d\d[-/]\d\d?[-/]\d\d?[T ,]\s*\d\d?:\d\d(?::\d\d)?(?:\.\d+)?(?:Z|\s*[+-]\d\d:?\d\d)?)/);if(iso){const d=parseDate(iso[1].replace(',',' '));if(d)out.push({time:+d,text:line.replace(iso[1],'').trim(),type:/^RT\s+@/i.test(line.replace(iso[1],'').trim())?'repost':'original'})}}
 return out.sort((a,b)=>a.time-b.time)}
export function filterXPosts(posts,mode='originals'){if(mode==='all')return posts;if(mode==='replies')return posts.filter(x=>x.type==='reply');if(mode==='reposts')return posts.filter(x=>x.type==='repost');if(mode==='originals_replies')return posts.filter(x=>x.type!=='repost');return posts.filter(x=>x.type==='original')}
function entropy(hours){const c=Array(24).fill(0);hours.forEach(h=>c[h]++);const n=hours.length;if(!n)return 0;return -c.reduce((s,x)=>x?s+(x/n)*Math.log(x/n):s,0)/Math.log(24)}
export function analyseM2(posts){
 const ordered=posts.map(p=>({...p,time:Number(p.time)})).filter(p=>Number.isFinite(p.time)).sort((a,b)=>a.time-b.time),n=ordered.length,gaps=[];
 for(let i=1;i<n;i++)gaps.push((ordered[i].time-ordered[i-1].time)/60000);
 const pos=gaps.filter(x=>Number.isFinite(x)&&x>0);
 if(n>=5&&pos.length<Math.max(3,n-2))throw new Error('Timestamp integrity check failed: too few positive inter-post intervals.');
 const mean=pos.reduce((a,b)=>a+b,0)/(pos.length||1),sd=Math.sqrt(pos.reduce((s,x)=>s+(x-mean)**2,0)/(pos.length||1)),cv=mean?sd/mean:NaN;
 const sortedGaps=[...pos].sort((a,b)=>a-b),median=sortedGaps.length?(sortedGaps[Math.floor((sortedGaps.length-1)/2)]+sortedGaps[Math.ceil((sortedGaps.length-1)/2)])/2:NaN;
 const burst=pos.length?pos.filter(x=>x<=5).length/pos.length:0,rounded=pos.map(x=>Math.round(x)),freq={};rounded.forEach(x=>freq[x]=(freq[x]||0)+1);const repeat=rounded.length?Math.max(0,...Object.values(freq))/rounded.length:0;
 const ent=entropy(ordered.map(p=>new Date(p.time).getUTCHours())),daily={};ordered.forEach(p=>{const k=new Date(p.time).toISOString().slice(0,10);daily[k]=(daily[k]||0)+1});const maxDay=Math.max(0,...Object.values(daily));
 const signals=[['Cadence regularity',clamp((.65-cv)/.65,-1,1),`Interval CV ${cv.toFixed(2)}; lower interval variability leans automation-like.`],['Repeated intervals',clamp((repeat-.18)/.42,-1,1),`${Math.round(repeat*100)}% of rounded intervals repeat at the most common cadence.`],['Burst activity',clamp((burst-.20)/.55,-1,1),`${Math.round(burst*100)}% of adjacent posts occur within 5 minutes.`],['Time-of-day spread',clamp((.58-ent)/.58,-1,1),`24-hour UTC activity entropy ${ent.toFixed(2)}; concentrated schedules can be automation-like.`],['Daily posting intensity',clamp((maxDay-12)/28,-1,1),`Maximum ${maxDay} timestamped posts in one UTC day.`]];
 const weights=[.8,.7,.45,.35,.35],score=signals.reduce((s,x,i)=>s+x[1]*weights[i],0),reliability=1-Math.exp(-n/35),first=ordered[0]?.time,last=ordered[n-1]?.time;
 const diagnostics={first,last,spanDays:first&&last?(last-first)/86400000:0,meanMinutes:mean,medianMinutes:median,sdMinutes:sd,cv,minMinutes:sortedGaps[0]??NaN,maxMinutes:sortedGaps.at(-1)??NaN,positiveIntervals:pos.length,totalIntervals:gaps.length};
 return {n,score,reliability,signals,gaps:pos,diagnostics}
}
