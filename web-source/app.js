import {parseWhatsApp,extractTemporalFeatures,evidenceIndex} from './engine.js?v=078';
import {detectHandoffs} from './handoff.js?v=078';
import {parseXPosts,parseXStructured,filterXPosts,analyseM2} from './m2.js?v=078';
import {unzipSync,strFromU8} from 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const HISTORY='veriodetect.v06.history';
const X_CODE='veriodetect.x.beta.code';
let latest=null;
const sg=x=>`${x>0?'+':''}${Number(x).toFixed(2)}`;
const fmt=x=>new Date(x).toLocaleString([],{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function show(name){$$('.screen').forEach(x=>x.classList.remove('active'));$('#'+name+'Screen').classList.add('active');$('#tabbar').style.display=['analysis','result','evidence','xAnalysis','xResult'].includes(name)?'none':'flex';$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));window.scrollTo({top:0,behavior:'instant'})}
function history(){try{return JSON.parse(localStorage.getItem(HISTORY)||'[]')}catch{return[]}}
function saveHistory(r){const h=history();const record={...r,id:(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()),at:Date.now()};h.unshift(record);localStorage.setItem(HISTORY,JSON.stringify(h.slice(0,30)));latest=record;renderHistory()}
function item(x){const reopenable=!!x.explanation;return `<button class="recent-item history-open" data-id="${esc(x.id||'')}" ${reopenable?'':'disabled'}><div><b>${esc(x.sender)}</b><small>${new Date(x.at).toLocaleString()}${reopenable?'':' · legacy summary'}</small></div><span class="chip">${esc(x.evidence||'Result')} ${reopenable?'›':''}</span></button>`}
function renderHistory(){const h=history();$('#historyList').innerHTML=h.length?h.map(item).join(''):'<div class="empty">No saved analyses yet.</div>';$('#recentList').innerHTML=h.length?h.slice(0,3).map(item).join(''):'<div class="empty">Your first result will appear here.</div>';$$('.history-open').forEach(b=>b.onclick=()=>{const r=history().find(x=>x.id===b.dataset.id);if(r?.explanation)renderResult(r)})}
function renderResult(r){latest=r;$('#resultMeta').textContent=`${r.sender} · ${r.at?fmt(r.at):'local analysis'}`;$('#m0Before').textContent=r.before;$('#m0After').textContent=r.after;$('#observations').textContent=r.obs;$('#candidateObs').textContent=r.obs;$('#seriesName').textContent=r.sender;$('#changeMagnitude').textContent=r.mag;
 const ps=Number.isFinite(Number(r.profileScore))?Number(r.profileScore):null, pr=Number.isFinite(Number(r.profileReliability))?Number(r.profileReliability):null;
 $('#profileLabel').textContent=r.profileLabel||'Profile unavailable';$('#profileCopy').textContent=r.profileCopy||'Re-run this conversation to calculate its overall counterparty profile.';$('#profileScore').textContent=ps===null?'M0 —':`Overall M0 ${sg(ps)}`;$('#profileReliability').textContent=pr===null?'Sample strength —':`Sample strength ${Math.round(pr*100)}%`;$('#profileMarker').style.left=(r.profilePosition??50)+'%';
 const pnum=parseFloat(r.p), tested=!!r.time&&Number.isFinite(pnum), strong=tested&&pnum<.05, moderate=tested&&pnum>=.05&&pnum<.10;
 const verdict=!r.time?'No reliable handoff detected':strong?'Statistically supported transition':moderate?'Possible transition — limited support':'No reliable handoff detected';
 const support=!r.time?'No testable transition':strong?'Strong statistical support':moderate?'Moderate statistical support':tested?'Low statistical support':'Insufficient data to validate';
 $('#conclusionProfile').textContent=r.profileLabel||'Profile unavailable';$('#conclusionTransition').textContent=verdict;$('#resultExplanation').textContent=strong?'VerioDetect found a behavioural transition that is unusual under the current no-change test. This is evidence consistent with a handoff, not proof of AI control.':r.time?'A more automation-like or human-like segment was found, but the statistical evidence is too weak to conclude that a real handoff occurred.':'No statistically testable control transition was found.';
 $('#handoffVerdict').textContent=verdict;$('#handoffCopy').textContent=strong?'The observed change is statistically unusual under the current permutation test.':moderate?'The candidate change deserves attention, but does not meet the stronger p < 0.05 threshold.':tested?`Changes this large occurred in about ${Math.round(pnum*100)}% of no-handoff tests, so VerioDetect cannot reliably distinguish this from normal variation.`:'There is not enough information to validate a handoff statistically.';
 $('#supportLabel').textContent=support;$('#pValue').textContent=tested?`p = ${pnum.toFixed(3)}`:'p —'; const strength=tested?Math.max(4,Math.min(96,(1-pnum)*100)):4;$('#evidenceMarker').style.left=strength+'%';$('#evidenceFill').style.width=strength+'%';
 $('#candidateDirection').textContent=r.time?`${(r.left||'Before').replace(/^./,c=>c.toUpperCase())} → ${(r.right||'After').replace(/^./,c=>c.toUpperCase())}`:'No candidate transition';$('#transitionDate').textContent=r.time?`Candidate transition · ${fmt(r.time)}`:'No testable transition';$('#transitionSupport').textContent=support+(tested?` · p = ${pnum.toFixed(3)}`:'');$('#timelineCard').classList.toggle('weak-transition',!!r.time&&!strong);show('result')}
function enterAnalysis(text=''){show('analysis');if(text)$('#thread').value=text;$('#charCount').textContent=$('#thread').value.length;setTimeout(()=>$('#thread').focus(),100)}
let xImportedPosts=null,xImportedName='';
$('#xModeBtn').onclick=()=>show('xAnalysis');
$('#cancelXAnalysis').onclick=()=>show('home');
async function apiJSON(url,{xAuth=false}={}){
 const headers={accept:'application/json'}; if(xAuth){const code=$('#xAccessCode')?.value.trim()||localStorage.getItem(X_CODE)||'';if(!code)throw new Error('Enter your authorized beta tester code first.');headers.authorization='Bearer '+code;localStorage.setItem(X_CODE,code)}
 const res=await fetch(url,{headers});
 const text=await res.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{throw new Error(`Server returned ${res.status} instead of JSON. The Netlify Function may not be deployed.`)}
 if(!res.ok)throw new Error(data.error||`Request failed (HTTP ${res.status}).`); return data;
}
async function checkXConnection(){
 const el=$('#xConnectionStatus'); el.className='x-import-status status-checking'; el.textContent='Checking X connection…';
 try{const d=await apiJSON('/api/x-status',{xAuth:true});el.className='x-import-status status-ok';el.textContent=d.message||'X API connected ✓';return true}
 catch(e){el.className='x-import-status status-error';el.textContent=e.message;return false}
}
$('#xCheckBtn').onclick=checkXConnection;
$('#xFetchBtn').onclick=async()=>{
 const raw=$('#xHandle').value.trim(); const username=raw.replace(/^@/,''); if(!username){$('#xFetchStatus').textContent='Enter a public X handle first.';return}
 const btn=$('#xFetchBtn'); btn.disabled=true;btn.textContent='Fetching…';$('#xFetchStatus').textContent=`Requesting an authorized recent sample from @${username}…`;
 try{const data=await apiJSON(`/api/x-posts?username=${encodeURIComponent(username)}`,{xAuth:true});
  xImportedPosts=(data.posts||[]).map(p=>{const time=new Date(p.created_at).getTime();return {...p,time,timestamp:time}}).filter(p=>Number.isFinite(p.time));xImportedName='@'+(data.account?.username||username);if(!xImportedPosts.length)throw new Error('No timestamped public posts were returned.');
  const counts=xImportedPosts.reduce((a,p)=>(a[p.type]=(a[p.type]||0)+1,a),{});$('#xFetchStatus').className='x-import-status status-ok';$('#xFetchStatus').textContent=`Fetched ${xImportedPosts.length} activities from ${xImportedName}: ${counts.original||0} originals, ${counts.reply||0} replies, ${counts.repost||0} reposts.`;$('#xImportStatus').textContent='Public X account loaded. Choose an Activity filter, then Analyze.';$('#xSourceLabel').textContent='Public X account';$('#xPosts').value='';$('#xCharCount').textContent='0';
 }catch(err){xImportedPosts=null;xImportedName='';$('#xFetchStatus').className='x-import-status status-error';$('#xFetchStatus').textContent=err.message}finally{btn.disabled=false;btn.textContent='Fetch'}
};
$('#xPosts').oninput=e=>{xImportedPosts=null;xImportedName='';$('#xCharCount').textContent=e.target.value.length;$('#xImportStatus').textContent='Pasted input ready to parse.'};
$('#backXResult').onclick=()=>show('xAnalysis');
$('#xImportBtn').onclick=()=>$('#xFileInput').click();
$('#xFileInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{let posts=[];if(/\.zip$/i.test(f.name)){const z=unzipSync(new Uint8Array(await f.arrayBuffer()));const names=Object.keys(z).filter(n=>/(^|\/)data\/(tweets|tweet)\.js$/i.test(n)||/(^|\/)(tweets|tweet)\.js$/i.test(n));if(!names.length)throw new Error('No tweets.js found in this archive.');for(const n of names)posts.push(...parseXPosts(strFromU8(z[n])))}else{const text=await f.text();if(/\.csv$/i.test(f.name)){const lines=text.split(/\r?\n/),head=(lines.shift()||'').split(',').map(x=>x.trim().replace(/^"|"$/g,'').toLowerCase());const ti=head.findIndex(x=>['created_at','createdat','timestamp','date','time'].includes(x)),tx=head.findIndex(x=>['text','full_text','content'].includes(x));const rows=lines.map(line=>{const c=line.match(/(?:"(?:[^"]|"")*"|[^,])+/g)||[];return {created_at:(c[ti]||'').replace(/^"|"$/g,''),text:(c[tx]||'').replace(/^"|"$/g,'').replace(/""/g,'"')}});posts=parseXStructured(rows)}else posts=parseXPosts(text)}posts=posts.filter((p,i,a)=>!p.id||a.findIndex(q=>q.id===p.id)===i);if(!posts.length)throw new Error('No timestamped X posts could be parsed.');xImportedPosts=posts;xImportedName=f.name;$('#xImportStatus').textContent=`Imported ${posts.length} timestamped activities from ${f.name}.`;$('#xSourceLabel').textContent=/\.zip$/i.test(f.name)?'X archive':'Imported file';$('#xPosts').value='';$('#xCharCount').textContent='0'}catch(err){alert('Could not import this X file: '+err.message)}finally{e.target.value=''}};
$('#analyseXBtn').onclick=()=>{
 const status=$('#xImportStatus'); status.className='x-import-status status-checking'; status.textContent='Running M2 analysis…';
 try {
 const text=$('#xPosts').value.trim(); if(!xImportedPosts&&!text){status.className='x-import-status status-error';status.textContent='Import an X archive/file, fetch a public account, or paste timestamped posts first.';return}
 const all=xImportedPosts||parseXPosts(text), mode=$('#xActivityFilter').value, posts=filterXPosts(all,mode).filter(p=>Number.isFinite(Number(p.time))); if(posts.length<5){status.className='x-import-status status-error';status.textContent=`M2 found fewer than 5 valid timestamped posts for the selected activity filter (${posts.length}). Choose another filter or include more data.`;return}
 const r=analyseM2(posts), score=r.score, rel=r.reliability;
 let label,copy;if(r.n<15){label='Insufficient data';copy='M2 parsed the posts, but there are too few timestamps for a stable posting-behaviour profile.'}else if(score>=1){label='Strongly automation-like';copy='Posting cadence contains several automation-like behavioural signals under experimental M2.'}else if(score>=.3){label='Automation-leaning';copy='Posting behaviour leans automation-like, but this is an experimental evidence index—not a bot probability.'}else if(score<=-.65){label='Predominantly human-like';copy='Posting cadence is predominantly human-like under the current experimental M2 model.'}else{label='Mixed / inconclusive';copy='Posting behaviour is mixed and does not show a strong automation-like pattern.'}
 $('#xProfileLabel').textContent=label;$('#xProfileScore').textContent=`M2 ${sg(score)}`;$('#xProfileCopy').textContent=copy;$('#xProfileMarker').style.left=Math.max(6,Math.min(94,50+score*22))+'%';$('#xReliability').textContent=`Sample strength ${Math.round(rel*100)}%`;$('#xPostCount').textContent=`${r.n} posts`; const counts=all.reduce((a,p)=>(a[p.type]=(a[p.type]||0)+1,a),{});$('#xFilterSummary').textContent=`Analysed ${r.n} of ${all.length} activities · ${counts.original||0} originals · ${counts.reply||0} replies · ${counts.repost||0} reposts${xImportedName?' · '+xImportedName:''}`;
 const d=r.diagnostics||{}, fmtMin=v=>Number.isFinite(v)?(v<60?`${v.toFixed(1)} min`:`${(v/60).toFixed(1)} h`):'—', fmtDate=v=>Number.isFinite(v)?new Date(v).toLocaleString():'—';
 $('#xTimingDiagnostics').innerHTML=[['First post',fmtDate(d.first)],['Last post',fmtDate(d.last)],['Time span',Number.isFinite(d.spanDays)?`${d.spanDays.toFixed(1)} days`:'—'],['Median interval',fmtMin(d.medianMinutes)],['Mean interval',fmtMin(d.meanMinutes)],['Interval SD',fmtMin(d.sdMinutes)],['Interval CV',Number.isFinite(d.cv)?d.cv.toFixed(3):'—'],['Shortest / longest',`${fmtMin(d.minMinutes)} / ${fmtMin(d.maxMinutes)}`],['Valid intervals',`${d.positiveIntervals??'—'} / ${d.totalIntervals??'—'}`]].map(([a,b])=>`<div class="diagnostic-row"><span><b>${esc(a)}</b></span><b>${esc(String(b))}</b></div>`).join('');
 $('#xEvidenceList').innerHTML=r.signals.map(([name,v,why])=>`<div class="diagnostic-row"><span><b>${esc(name)}</b><small style="display:block;margin-top:3px">${esc(why)}</small></span><b>${sg(v)}</b></div>`).join(''); show('xResult');
 } catch(err) { $('#xImportStatus').textContent=`M2 analysis error: ${err.message}`; $('#xImportStatus').className='x-import-status status-error'; }
};
$('#pasteBtn').onclick=async()=>{try{const t=await navigator.clipboard.readText();enterAnalysis(t)}catch{enterAnalysis();setTimeout(()=>alert('Paste from the clipboard into the text box.'),150)}};
$('#importBtn').onclick=()=>$('#fileInput').click();
$('#fileInput').onchange=async e=>{const f=e.target.files?.[0];if(f)enterAnalysis(await f.text())};
$('#thread').oninput=e=>$('#charCount').textContent=e.target.value.length;
$('#cancelAnalysis').onclick=()=>show('home');$('#backResult').onclick=()=>show('analysis');
$('#settingsBtn').onclick=()=>show('about');$('#backAbout').onclick=()=>show('home');
$$('[data-tab]').forEach(b=>b.onclick=()=>show(b.dataset.tab));
$('#clearHistory').onclick=()=>{if(confirm('Clear locally saved result summaries?')){localStorage.removeItem(HISTORY);renderHistory()}};
$('#shareResult').onclick=async()=>{if(!latest)return;const text=`VerioDetect: ${latest.headline}. Evidence: ${latest.evidence}.`;try{if(navigator.share)await navigator.share({title:'VerioDetect result',text});else await navigator.clipboard.writeText(text)}catch{}};
$('#evidenceBtn').onclick=$('#detailBtn').onclick=()=>renderDetailedEvidence(latest);
$('#backEvidence').onclick=()=>show('result');
$('#shareEvidence').onclick=()=>$('#shareResult').click();
function classify(e){if(e.n_responses<8)return {headline:'Insufficient evidence',evidence:'LOW EVIDENCE'};if(e.evidence_index>=1)return{headline:'High automation signal',evidence:'ELEVATED EVIDENCE'};if(e.evidence_index>=.25)return{headline:'Elevated automation signal',evidence:'MODERATE EVIDENCE'};if(e.evidence_index<=-.75)return{headline:'Low automation signal',evidence:'LOW EVIDENCE'};return{headline:'Mixed behavioral signal',evidence:'LOW EVIDENCE'}}
$('#thread').addEventListener('input',()=>{ $('#participantRow').hidden=true;$('#participantSelect').innerHTML='<option value="">Choose participant…</option>'; });
$('#analyseBtn').onclick=()=>{
 const text=$('#thread').value.trim();if(!text){alert('Paste a conversation first.');return}
 const msgs=parseWhatsApp(text),f=extractTemporalFeatures(msgs),entries=Object.entries(f.by_sender||{}).sort((a,b)=>(b[1].n_responses||0)-(a[1].n_responses||0));
 if(!entries.length){alert('No timestamped participants could be parsed from this conversation.');return}
 const sel=$('#participantSelect'); if(entries.length>1&&!sel.value){sel.innerHTML='<option value="">Choose participant…</option>'+entries.map(([n,v])=>`<option value="${esc(n)}">${esc(n)} · ${v.n_responses||0} measurable responses</option>`).join('');$('#participantRow').hidden=false;sel.focus();alert('Choose the participant you want VerioDetect to assess.');return}
 const name=sel.value||entries[0][0],x=f.by_sender[name]||{n_responses:0},e=evidenceIndex(x),h=detectHandoffs(msgs,name),b=h.best,sb=h.sparse_best;
 let headline,evidence,explanation,mag='—',pv='—',before='—',after='—',obs='—',time=null,left='Human-like',right='Automation-like',cut=50;
 if(b){
   const strong=b.confidence!=='LOW'; headline=strong?'Possible control change':'No statistically strong control change'; evidence=`${b.confidence} EVIDENCE`; explanation=strong?'A behavioral transition is unusual under the current no-change test. Verify context before drawing conclusions.':'The largest observed behavioral transition is not statistically unusual under the current permutation test.';mag=b.magnitude.toFixed(2);pv=b.p_value.toFixed(3);before=sg(b.before_score);after=sg(b.after_score);obs=`${b.before_n} → ${b.after_n}`;time=b.boundary_time;left=b.before_state;right=b.after_state;cut=Math.max(12,Math.min(88,b.boundary_index/h.turns.length*100));
 } else if(sb){
   headline='Strong transition signal';evidence='INSUFFICIENT DATA TO VALIDATE';explanation='A large transition is visible, but there are too few measurable responses on at least one side for M1.1 to calculate a permutation p-value.';mag=sb.magnitude.toFixed(2);before=sg(sb.before_score);after=sg(sb.after_score);obs=`${sb.before_n} → ${sb.after_n}`;time=sb.boundary_time;left=sb.before_state;right=sb.after_state;cut=Math.max(12,Math.min(88,sb.boundary_index/h.turns.length*100));
 } else {const c=classify(e);headline=c.headline;evidence=c.evidence;explanation='No statistically testable control transition was found. The M0 temporal signature is shown as supporting experimental evidence.'}
 const profileScore=e.evidence_index??0, profileReliability=e.reliability??0, profilePosition=Math.max(6,Math.min(94,50+profileScore*22));
 let profileLabel,profileCopy;if(e.n_responses<8){profileLabel='Insufficient data';profileCopy='Too few measurable responses to characterize the overall behavioral profile reliably.'}else if(profileScore<=-.75){profileLabel='Predominantly human-like';profileCopy='The overall timing and response pattern leans human-like under the current experimental M0 model.'}else if(profileScore>=1){profileLabel='Strongly automation-like';profileCopy='The overall timing and response pattern contains a strong automation-like signal under the current experimental M0 model.'}else if(profileScore>=.25){profileLabel='Automation-leaning';profileCopy='The overall behavioral signature leans automation-like, but this is an evidence index rather than an authorship probability.'}else{profileLabel='Mixed / broadly human-like';profileCopy='The overall behavioral signature is mixed and does not show a strong automation-like pattern.'}
 latest={sender:name,headline,evidence,explanation,mag,p:pv,before,after,obs,time,left,right,cut,profileScore,profileReliability,profilePosition,profileLabel,profileCopy,m0Contributions:e.contributions||[],rawFeatures:x,m1Diagnostics:b?.diagnostics||[],m1Permutations:b?.permutations??null};
 saveHistory(latest);renderResult(latest);
};


function labelFeature(name){return ({instant_response_rate:'Instant replies ≤5s',latency_variability:'Latency variability',length_latency_coupling:'Reply length ↔ latency',prompt_latency_coupling:'Prompt length ↔ latency',apparent_output_speed:'Apparent output speed'})[name]||name.replaceAll('_',' ')}
function val(v,d=2){return v===null||v===undefined||Number.isNaN(Number(v))?'—':Number(v).toFixed(d)}
function renderDetailedEvidence(r){
 if(!r)return;
 $('#evidenceMeta').textContent=`${r.sender} · derived statistics only`;
 const parts=r.m0Contributions||[];
 $('#contributionList').innerHTML=parts.length?parts.map(x=>{const c=Number(x.contribution)||0,w=Math.min(50,Math.abs(c)/.85*50),left=c<0?50-w:50;return `<div class="contribution-row"><div class="contribution-head"><b>${esc(labelFeature(x.name))}</b><span>${sg(c)}</span></div><div class="contribution-why">${esc(x.why||'')}</div><div class="contribution-track"><div class="contribution-bar" style="left:${left}%;width:${w}%"></div></div></div>`}).join(''):'<div class="empty">Detailed M0 components were not saved for this older result. Re-run the conversation to populate them.</div>';
 const f=r.rawFeatures||{};
 const rows=[['Measurable responses',f.n_responses],['Median response latency',f.latency_median_s==null?'—':`${val(f.latency_median_s,1)} s`],['10th–90th percentile latency',f.latency_p10_s==null?'—':`${val(f.latency_p10_s,1)}–${val(f.latency_p90_s,1)} s`],['Replies within 5 seconds',f.instant_5s_rate==null?'—':`${Math.round(f.instant_5s_rate*100)}%`],['Median reply length',f.response_length_median_chars==null?'—':`${Math.round(f.response_length_median_chars)} chars`],['Apparent output speed',f.chars_per_second_median==null?'—':`${val(f.chars_per_second_median)} chars/s`],['Reply length ↔ latency correlation',val(f.corr_latency_response_length)],['Prompt length ↔ latency correlation',val(f.corr_latency_prompt_length)],['Log-latency variability',val(f.log_latency_sd)]];
 $('#rawDiagnostics').innerHTML=rows.map(([a,b])=>`<div class="diagnostic-row"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('');
 $('#detailReliability').textContent=`Overall M0 ${Number.isFinite(Number(r.profileScore))?sg(r.profileScore):'—'} · Sample strength ${Number.isFinite(Number(r.profileReliability))?Math.round(r.profileReliability*100)+'%':'—'}. Sample strength reflects evidence quantity, not probability that the classification is correct.`;
 const ds=r.m1Diagnostics||[];
 $('#candidateList').innerHTML=ds.length?ds.map((d,i)=>`<div class="candidate-detail"><div class="candidate-detail-head"><b>${i===0?'Strongest candidate':'Candidate '+(i+1)}</b><span>${d.time?fmt(d.time):'—'}</span></div><div class="candidate-detail-values"><span>M0 ${sg(d.before)} → ${sg(d.after)}</span><span>|Δ| ${Math.abs(Number(d.delta)).toFixed(2)} · ${d.before_n}→${d.after_n} obs.</span></div></div>`).join(''):'<div class="empty">No full M1 diagnostic series was saved for this result.</div>';
 const pn=Number.isFinite(Number(r.m1Permutations))?Number(r.m1Permutations):null, pp=parseFloat(r.p);
 $('#m1MethodSummary').textContent=pn?`M1 compared the strongest observed M0 change with ${pn} valid no-handoff surrogate conversations. ${Number.isFinite(pp)?`The resulting p-value was ${pp.toFixed(3)}.`:''}`:'M1 compares M0 before and after candidate boundaries, then tests the strongest change against no-handoff surrogate conversations when enough observations exist.';
 show('evidence');
}

const STAT_HELP={
 magnitude:{title:'Change magnitude',text:'How large the strongest detected behavioral shift is across the conversation. It is the absolute difference between the M0 score before and after the candidate handoff.',interpret:'Larger values mean a bigger change in behavior, but magnitude alone does not prove an AI handoff.'},
 pvalue:{title:'Permutation p-value',text:'How often a transition this strong would appear by chance if there were no real handoff. VerioDetect estimates it by comparing the observed change with shuffled no-handoff versions of the same conversation.',interpret:'Smaller is stronger evidence. A value of 0.248 means changes this large occurred in about 24.8% of the no-handoff tests, so it is not statistically unusual.'},
 m0before:{title:'M0 before',text:'The frozen M0 temporal evidence score calculated from responses before the strongest candidate transition.',interpret:'Negative values lean more human-like in the current model; positive values lean more automation-like. Treat this as a signal, not an identity test.'},
 m0after:{title:'M0 after',text:'The same M0 temporal evidence score, calculated from responses after the strongest candidate transition.',interpret:'Compare this with M0 before. The difference between the two contributes to the change magnitude.'},
 observations:{title:'Observations',text:'The number of measurable responses available on each side of the candidate transition.',interpret:'For example, 102 → 9 means 102 usable responses before the transition and 9 after it. A small side makes conclusions less robust.'},
 series:{title:'Series',text:'The participant whose response pattern VerioDetect selected for this analysis.',interpret:'The statistics on this screen describe this participant’s observable conversation behavior, not the identity of the person or system behind it.'},
 profile:{title:'Counterparty profile',text:'The overall M0 behavioral evidence index calculated across all measurable responses from the selected counterparty.',interpret:'Left means more human-like and right more automation-like under the current experimental model. This is not a probability that the counterparty is human or AI.'},
 timeline:{title:'Behavioral transition',text:'Shows where the strongest candidate behavioral transition occurs within the analysed conversation and the direction of the M0 change.',interpret:'The marker is a candidate change point, not an AI probability. When statistical support is low, VerioDetect deliberately mutes the marker; use the permutation p-value to judge whether the change is unusual.'}
};
function explainStat(key,button){const x=STAT_HELP[key];if(!x)return;$$('.stat-help').forEach(b=>b.classList.remove('selected'));button?.classList.add('selected');$('#explainTitle').textContent=x.title;$('#explainText').textContent=x.text;$('#explainInterpretation').textContent=x.interpret;$('#statExplainer').hidden=false;$('#statExplainer').scrollIntoView({behavior:'smooth',block:'nearest'});}
$$('.stat-help').forEach(b=>b.onclick=()=>explainStat(b.dataset.stat,b));
$('#closeExplainer').onclick=()=>{$('#statExplainer').hidden=true;$$('.stat-help').forEach(b=>b.classList.remove('selected'))};

renderHistory();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
