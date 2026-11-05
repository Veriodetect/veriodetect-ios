// Adapt presentation around the preserved staging snapshot; model code is untouched.
export function addM2Results(code){
 const replace=(from,to)=>{if(!code.includes(from))throw Error('M2 presentation boundary changed');code=code.replace(from,to)};
 replace('function renderResult(r){latest=r;',"function renderResult(r){if(r.kind==='m2'){renderSavedM2(r);return}latest=r;");
 replace("show('xResult');", "const m2Record=captureM2Result();try{saveHistory(m2Record)}catch{latest=m2Record;alert('This result could not be saved on this device. You can still share it.')} $('#xResultMeta').textContent='M2 · Experimental posting-behaviour model'; show('xResult');");
 code+=`\n${m2Presentation}\n`;
 return code;
}
export function addM2ShareButton(html){
 const boundary='<button class="text-btn" id="backXResult">‹ Back</button>';
 if(!html.includes(boundary))throw Error('M2 header boundary changed');
 return html.replace(boundary,boundary+'<button class="icon-btn" id="shareXResult" aria-label="Share X analysis result">⇧</button>');
}
// Store only rendered, derived statistics. Never serialize imported posts or form fields.
export const m2Presentation=String.raw`
const m2TextFields=['xProfileLabel','xProfileScore','xProfileCopy','xReliability','xPostCount','xFilterSummary'];
function captureM2Result(){
 const fields=Object.fromEntries(m2TextFields.map(id=>[id,$('#'+id).textContent]));
 const rows=id=>Array.from($('#'+id).children,row=>Array.from(row.children,cell=>cell.textContent));
 return {kind:'m2',sender:xImportedName||'X analysis',headline:fields.xProfileLabel,evidence:fields.xProfileScore,explanation:fields.xProfileCopy,
  m2:{fields,marker:parseFloat($('#xProfileMarker').style.left),timing:rows('xTimingDiagnostics'),signals:rows('xEvidenceList')}};
}
function renderSavedM2(record){
 latest=record;
 for(const id of m2TextFields)$('#'+id).textContent=record.m2.fields[id]||'';
 $('#xProfileMarker').style.left=Math.max(6,Math.min(94,Number(record.m2.marker)||50))+'%';
 const rows=data=>data.map(cells=>'<div class="diagnostic-row"><span>'+esc(String(cells[0]||''))+'</span><b>'+esc(String(cells[1]||''))+'</b></div>').join('');
 $('#xTimingDiagnostics').innerHTML=rows(record.m2.timing);
 $('#xEvidenceList').innerHTML=rows(record.m2.signals);
 $('#xResultMeta').textContent='M2 · Experimental posting-behaviour model · '+fmt(record.at);
 show('xResult');
}
$('#shareXResult').onclick=()=>$('#shareResult').click();
`;
