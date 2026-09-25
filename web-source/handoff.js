import {extractTemporalFeatures,evidenceIndex} from './engine.js';

// Verio M1.1 — statistically corrected change-point layer.
// M0 remains frozen in engine.js. M1.1 tests the strongest observed temporal
// regime change against within-conversation no-handoff surrogate sequences.

const PERMUTATIONS=100;
const MIN_RESPONSES_PER_SIDE=8;
const HIGH_P=.02;   // 100-surrogate engineering resolution
const MEDIUM_P=.05;
const HIGH_MAG=1.0;
const MEDIUM_MAG=.8;

function turns(msgs){
  const o=[];
  for(const m of msgs){
    const l=o.at(-1);
    if(l&&l.sender===m.sender&&m.ts-l.end<=120000){l.end=m.ts;l.text+=' '+m.text}
    else o.push({sender:m.sender,start:m.ts,end:m.ts,text:m.text});
  }
  return o;
}

function score(ts,s){
  if(ts.length<2)return null;
  const f=extractTemporalFeatures(ts.map(t=>({sender:t.sender,ts:t.start,text:t.text}))).by_sender?.[s];
  if(!f||f.n_responses<3)return null;
  return {score:evidenceIndex(f).evidence_index,n:f.n_responses};
}

const state=s=>s>=.25?'automation-like':s<=-.75?'human-like':'mixed';

function candidates(t,sender,minResponses=MIN_RESPONSES_PER_SIDE){
  const cs=[];
  for(let cut=2;cut<=t.length-2;cut++){
    const a=score(t.slice(0,cut),sender),b=score(t.slice(cut),sender);
    if(!a||!b||a.n<minResponses||b.n<minResponses)continue;
    const d=b.score-a.score;
    cs.push({cut,a,b,d,mag:Math.abs(d)});
  }
  return cs.sort((a,b)=>b.mag-a.mag);
}

// Sparse diagnostic only. It never receives a p-value or statistical confidence.
// This preserves extreme short-conversation transitions without weakening M1.1.
function sparseCandidate(t,sender){
  return candidates(t,sender,3)[0]||null;
}

// Deterministic PRNG so repeated assessment of the same pasted thread is stable.
function hashSeed(sender,t){
  let h=2166136261>>>0;
  const s=sender+'|'+t.map(x=>`${x.sender}:${x.start}:${x.text.length}`).join('|');
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function shuffle(a,rng){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}

// Shuffle whole turns while preserving each turn's sender, text, and original
// inter-turn gap. This destroys a persistent change point while retaining the
// conversation's observed turn-level material and gap distribution.
function surrogateTurns(t,rng){
  if(t.length<2)return [...t];
  const gaps=t.slice(1).map((x,i)=>Math.max(0,x.start-t[i].end));
  const order=shuffle(t.map((_,i)=>i),rng);
  const gs=shuffle(gaps,rng);
  let clock=t[0].start;
  return order.map((idx,k)=>{
    const src=t[idx],dur=Math.max(0,src.end-src.start);
    if(k)clock+=gs[k-1]||0;
    const out={sender:src.sender,start:clock,end:clock+dur,text:src.text};
    clock=out.end;
    return out;
  });
}

function nullPValue(t,sender,observedMag){
  const rng=mulberry32(hashSeed(sender,t));
  let ge=0,valid=0;
  for(let i=0;i<PERMUTATIONS;i++){
    const c=candidates(surrogateTurns(t,rng),sender)[0];
    if(!c)continue;
    valid++;
    if(c.mag>=observedMag)ge++;
  }
  return {p:(1+ge)/(1+valid),valid};
}

export function detectHandoffs(msgs,targetSender=null){
  const t=turns(msgs),all=[...new Set(t.map(x=>x.sender))],ss=targetSender?[targetSender]:all,out=[],sparse=[];
  for(const sender of ss){
    const cs=candidates(t,sender);
    if(!cs.length){
      const sc=sparseCandidate(t,sender);
      if(sc&&sc.mag>=1.5){
        sparse.push({sender,before_score:sc.a.score,after_score:sc.b.score,
          before_state:state(sc.a.score),after_state:state(sc.b.score),magnitude:sc.mag,delta:sc.d,
          before_n:sc.a.n,after_n:sc.b.n,boundary_time:t[sc.cut].start,boundary_index:sc.cut});
      }
      continue;
    }
    const c=cs[0],m=c.mag;
    const nullTest=nullPValue(t,sender,m);
    // Generic separation gate validated in the synthetic M1.1 harness:
    // one regime must be automation-like and the other at most neutral/mixed.
    const separated=(c.a.score>=.25&&c.b.score<=0)||(c.b.score>=.25&&c.a.score<=0);
    let conf='LOW';
    if(separated&&m>=MEDIUM_MAG&&nullTest.p<=MEDIUM_P)conf='MEDIUM';
    if(separated&&m>=HIGH_MAG&&nullTest.p<=HIGH_P)conf='HIGH';
    out.push({
      sender,confidence:conf,before_score:c.a.score,after_score:c.b.score,
      before_state:state(c.a.score),after_state:state(c.b.score),magnitude:m,delta:c.d,
      before_n:c.a.n,after_n:c.b.n,boundary_time:t[c.cut].start,boundary_index:c.cut,
      p_value:nullTest.p,permutations:nullTest.valid,state_separation:separated,
      diagnostics:cs.slice(0,5).map(x=>({time:t[x.cut].start,before:x.a.score,after:x.b.score,delta:x.d,before_n:x.a.n,after_n:x.b.n}))
    });
  }
  const r={HIGH:3,MEDIUM:2,LOW:1};
  out.sort((a,b)=>r[b.confidence]-r[a.confidence]||a.p_value-b.p_value||b.magnitude-a.magnitude);
  sparse.sort((a,b)=>b.magnitude-a.magnitude);
  return {turns:t,best:out[0]||null,sparse_best:sparse[0]||null,version:'M1.1+sparse-diagnostic'};
}
