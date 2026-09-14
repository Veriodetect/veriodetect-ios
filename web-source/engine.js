
/*
 Verio temporal evidence engine v0.3
 IMPORTANT: output is an uncalibrated evidence index, NOT a probability.
*/
const clamp=(x,a=-Infinity,b=Infinity)=>Math.max(a,Math.min(b,x));
const mean=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const median=x=>{
  if(!x.length)return null; const a=[...x].sort((p,q)=>p-q),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
};
const quantile=(x,q)=>{
  if(!x.length)return null; const a=[...x].sort((p,q)=>p-q);
  const p=(a.length-1)*q,b=Math.floor(p),r=p-b;
  return a[b+1]===undefined?a[b]:a[b]+r*(a[b+1]-a[b]);
};
const sd=x=>{
  if(x.length<2)return null; const m=mean(x);
  return Math.sqrt(x.reduce((s,v)=>s+(v-m)**2,0)/(x.length-1));
};
const cv=x=>{const m=mean(x),s=sd(x);return m&&s!==null?s/m:null};
const corr=(x,y)=>{
  if(x.length<3||x.length!==y.length)return null;
  const mx=mean(x),my=mean(y);
  let n=0,dx=0,dy=0;
  for(let i=0;i<x.length;i++){const a=x[i]-mx,b=y[i]-my;n+=a*b;dx+=a*a;dy+=b*b}
  return dx&&dy?n/Math.sqrt(dx*dy):null;
};

export function parseWhatsApp(text){
 const re=/^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s+([^:]+):\s*(.*)$/;
 const rows=[];let cur=null;
 for(const raw of text.split(/\n/)){
   const m=raw.match(re);
   if(m){
     if(cur)rows.push(cur);
     let y=+m[3];if(y<100)y+=2000;
     cur={ts:new Date(y,+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0)).getTime(),
          sender:m[7].trim(),text:m[8].trim()};
   }else if(cur&&raw.trim())cur.text+="\n"+raw.trim();
 }
 if(cur)rows.push(cur);
 return rows.sort((a,b)=>a.ts-b.ts);
}

export function extractTemporalFeatures(msgs){
 if(!msgs.length)return {n_messages:0};
 const senders=[...new Set(msgs.map(m=>m.sender))];

 // Analyze both sides symmetrically. This avoids asking the user to choose a participant.
 // A "turn" is one or more consecutive messages by the same sender.
 const turns=[];
 for(const m of msgs){
   const last=turns.at(-1);
   if(last&&last.sender===m.sender&&m.ts-last.end<=120000){
     last.end=m.ts;last.text+=" "+m.text;last.message_count++;
   }else turns.push({sender:m.sender,start:m.ts,end:m.ts,text:m.text,message_count:1});
 }

 const responses=[];
 for(let i=1;i<turns.length;i++){
   const prev=turns[i-1],cur=turns[i];
   if(cur.sender===prev.sender)continue;
   const latency=Math.max(0,(cur.start-prev.end)/1000);
   responses.push({
     sender:cur.sender,
     latency_s:latency,
     response_chars:cur.text.length,
     prompt_chars:prev.text.length,
     response_words:cur.text.trim()?cur.text.trim().split(/\s+/).length:0,
     prompt_words:prev.text.trim()?prev.text.trim().split(/\s+/).length:0,
     hour:new Date(cur.start).getHours()
   });
 }

 const bySender={};
 for(const s of senders){
   const r=responses.filter(x=>x.sender===s);
   const lat=r.map(x=>x.latency_s);
   const loglat=lat.map(x=>Math.log1p(x));
   const len=r.map(x=>x.response_chars);
   const plen=r.map(x=>x.prompt_chars);
   const cps=r.filter(x=>x.latency_s>0).map(x=>x.response_chars/x.latency_s);
   const hours=Array(24).fill(0);r.forEach(x=>hours[x.hour]++);
   const total=r.length||1;
   let entropy=0;
   for(const c of hours)if(c){const p=c/total;entropy-=p*Math.log2(p)}
   bySender[s]={
     n_responses:r.length,
     latency_median_s:median(lat),
     latency_p10_s:quantile(lat,.1),
     latency_p90_s:quantile(lat,.9),
     latency_cv:cv(lat),
     log_latency_sd:sd(loglat),
     response_length_median_chars:median(len),
     chars_per_second_median:median(cps),
     corr_latency_response_length:corr(loglat,len),
     corr_latency_prompt_length:corr(loglat,plen),
     instant_5s_rate:r.length?r.filter(x=>x.latency_s<=5).length/r.length:null,
     instant_30s_rate:r.length?r.filter(x=>x.latency_s<=30).length/r.length:null,
     activity_hour_entropy:entropy,
     overnight_rate:r.length?r.filter(x=>x.hour<6).length/r.length:null
   };
 }
 return {n_messages:msgs.length,n_turns:turns.length,n_responses:responses.length,senders,by_sender:bySender};
}

/*
 Evidence index:
 Positive -> more automation-like under our current hypotheses.
 Negative -> more human-like.
 It deliberately uses broad monotonic transforms, not fake probabilities.
 Calibration parameters are absent until labelled data exist.
*/
export function evidenceIndex(f){
 let z=0,parts=[];
 const add=(name,v,w,why)=>{if(v===null||Number.isNaN(v))return;const c=w*v;z+=c;parts.push({name,contribution:c,why})};

 // Near-instant responses are agent-like, but only modestly weighted.
 add("instant_response_rate", clamp(((f.instant_5s_rate??0)-.15)/.45,-1,1), .55,
     "Share of turns answered within five seconds");

 // Very low timing variability is suspicious; high variability is human-like.
 if(f.log_latency_sd!==null)
   add("latency_variability", clamp((.75-f.log_latency_sd)/.75,-1,1), .65,
       "Variability of log response latency");

 // Key hypothesis: response latency should tend to increase with output length for humans.
 if(f.corr_latency_response_length!==null)
   add("length_latency_coupling", clamp((.18-f.corr_latency_response_length)/.35,-1,1), .85,
       "Coupling between response length and response latency");

 // Incoming complexity should often affect human response time.
 if(f.corr_latency_prompt_length!==null)
   add("prompt_latency_coupling", clamp((.12-f.corr_latency_prompt_length)/.35,-1,1), .55,
       "Coupling between incoming-message length and response latency");

 // Extremely high apparent output speed can be suspicious.
 if(f.chars_per_second_median!==null)
   add("apparent_output_speed", clamp((f.chars_per_second_median-3)/12,-1,1), .45,
       "Characters in reply divided by observed response latency");

 // Evidence quantity controls reliability separately from direction.
 const n=f.n_responses||0;
 const reliability=1-Math.exp(-n/20);
 return {
   evidence_index:+z.toFixed(3),
   reliability:+reliability.toFixed(3),
   n_responses:n,
   contributions:parts.sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution))
 };
}
