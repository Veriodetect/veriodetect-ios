export const RECEIPTS_KEY='veriodetect.access.deletion-receipts';
export function installAccessLifecycle({request,storage=localStorage,cryptoImpl=crypto,confirmDeletion=confirm,onDeleted=()=>{}}) {
 const $=selector=>document.querySelector(selector),codeKey='veriodetect.x.beta.code';
 const read=()=>{const value=JSON.parse(storage.getItem(RECEIPTS_KEY)||'[]');if(!Array.isArray(value)||value.some(x=>typeof x!=='string'||!/^[a-f0-9]{64}$/.test(x)))throw Error('Saved deletion receipts could not be read. Keep your access code safe.');return value;};
 const render=()=>{
  const receipts=read(),select=$('#deleteReceiptSelect');
  select.replaceChildren(new Option('Choose a saved receipt…',''));
  receipts.forEach((token,i)=>select.add(new Option(`Request ${i+1}`,token)));
  $('#deletionReceipts').value=receipts.join('\n\n');
 };
 $('#deleteCredential').value=storage.getItem(codeKey)||'';
 try{render()}catch(e){$('#deleteAccessMessage').textContent=e.message}
 $('#deleteReceiptSelect').onchange=event=>{$('#deleteCredential').value=event.target.value;};
 const form=$('#accessRequestForm');let attempt=null;
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button[type="submit"]'),status=$('#accessRequestMessage');button.disabled=true;
  try {
   const fields={name:$('#accessName').value,email:$('#accessEmail').value,reason:$('#accessReason').value};
   const signature=JSON.stringify(fields);
   if(attempt?.signature!==signature)attempt={signature,token:Array.from(cryptoImpl.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')};
   const receipts=read();if(!receipts.includes(attempt.token)){receipts.push(attempt.token);storage.setItem(RECEIPTS_KEY,JSON.stringify(receipts));}
   render();status.textContent='Submitting request…';
   const res=await request('/api/access-request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...fields,deletionToken:attempt.token})});
   const data=await res.json();if(!res.ok)throw Error(data.error||'Request failed');
   if(data.accepted!==true)throw Error(data.message||'Access request was not accepted. Keep any existing receipt or code.');
   status.textContent=data.message;$('#deleteCredential').value=attempt.token;form.reset();attempt=null;
  }catch(e){status.textContent=e.message}finally{button.disabled=false}
 });
 const deletion=$('#deleteAccessForm');
 deletion.addEventListener('submit',async event=>{
  event.preventDefault();const button=deletion.querySelector('button[type="submit"]'),status=$('#deleteAccessMessage');
  const token=$('#deleteCredential').value.trim()||$('#xAccessCode')?.value.trim()||storage.getItem(codeKey)||'';
  if(!$('#deleteConfirmed').checked){status.textContent='Confirm deletion before continuing.';return;}
  if(!/^(?:[a-f0-9]{48}|[a-f0-9]{64})$/.test(token)){status.textContent='Enter your individual access code or deletion receipt.';return;}
  if(!confirmDeletion('Permanently delete this access and its registration data? Saved analyses and access details on this device will also be cleared.'))return;
  button.disabled=true;status.textContent='Deleting…';
  try {
   const res=await request('/api/access-delete',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({confirm:true})});
   const data=await res.json();if(!res.ok||data.deleted!==true)throw Error(data.error||'Deletion was not confirmed. Your local data has been kept.');
   // Keep unrelated pending receipts so their deletion remains possible.
   let localCleared=true;
   try {
    const remaining=read().filter(value=>value!==token);
    storage.setItem(RECEIPTS_KEY,JSON.stringify(remaining));
    storage.removeItem(codeKey);storage.removeItem('veriodetect.v06.history');
   }catch{localCleared=false;}
   $('#xAccessCode').value='';$('#deleteCredential').value='';$('#deleteConfirmed').checked=false;
   attempt=null;form.reset();onDeleted();
   try{render()}catch{localCleared=false;}
   status.textContent=localCleared?'Deletion completed. Related server records and saved analyses on this device were removed. Receipts for other requests are kept.':'Server deletion completed. Device storage could not be cleared; clear History and remove the stored code on this device.';
  }catch(e){status.textContent=e.message}finally{button.disabled=false}
 });
}
