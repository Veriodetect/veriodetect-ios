import assert from 'node:assert/strict';
import fs from 'node:fs';
import {installAccessLifecycle,RECEIPTS_KEY} from '../client/access-lifecycle.mjs';
assert(fs.readFileSync('www/app.js','utf8').includes('installAccessLifecycle({'));
const values=new Map(),elements={};let reply,request,deleted=0,confirmation=true;
function element(value=''){return {value,checked:false,disabled:false,textContent:'',listeners:{},addEventListener(k,v){this.listeners[k]=v},querySelector(){return this.button??=element()},replaceChildren(){this.options=[]},add(x){this.options.push(x)},reset(){this.resetCalled=true}}}
for(const id of ['accessRequestForm','accessRequestMessage','accessName','accessEmail','accessReason','deleteAccessForm','deleteCredential','deleteConfirmed','deleteAccessMessage','deleteReceiptSelect','deletionReceipts','xAccessCode'])elements['#'+id]=element();
elements['#accessName'].value='Test User';elements['#accessEmail'].value='tester@example.invalid';
const priorDocument=globalThis.document,priorOption=globalThis.Option;
globalThis.document={querySelector:s=>elements[s]};globalThis.Option=class {constructor(label,value){this.label=label;this.value=value}};
const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
let sequence=0;
const requestFn=async(path,options)=>{request={path,...options};if(reply instanceof Error)throw reply;return {ok:reply.status>=200&&reply.status<300,json:async()=>reply.data}};
try{
 installAccessLifecycle({request:requestFn,storage,cryptoImpl:{getRandomValues:b=>b.fill(++sequence)},confirmDeletion:()=>confirmation,onDeleted:()=>deleted++});
 const submit=()=>elements['#accessRequestForm'].listeners.submit({preventDefault(){}});
 const remove=()=>elements['#deleteAccessForm'].listeners.submit({preventDefault(){}});
 reply={status:202,data:{accepted:true,message:'Submitted'}};await submit();
 assert.equal(request.path,'/api/access-request');assert.equal(request.headers.authorization,undefined);
 const body=JSON.parse(request.body);assert.match(body.deletionToken,/^[a-f0-9]{64}$/);
 assert.equal(JSON.parse(values.get(RECEIPTS_KEY))[0],body.deletionToken);
 assert.equal(elements['#deleteCredential'].value,body.deletionToken);
 reply=new Error('Offline');await submit();const uncertain=JSON.parse(request.body).deletionToken;
 reply={status:202,data:{accepted:true,message:'Submitted'}};await submit();assert.equal(JSON.parse(request.body).deletionToken,uncertain,'Retry must reuse the saved receipt');
 values.set('veriodetect.v06.history','saved');values.set('veriodetect.x.beta.code','a'.repeat(48));
 elements['#deleteCredential'].value='a'.repeat(48);
 await remove();assert.equal(deleted,0);assert.match(elements['#deleteAccessMessage'].textContent,/Confirm deletion/);
 elements['#deleteConfirmed'].checked=true;confirmation=false;await remove();assert.equal(deleted,0);
 confirmation=true;reply={status:503,data:{error:'Try later'}};await remove();
 assert.equal(values.get('veriodetect.v06.history'),'saved');assert.equal(deleted,0);
 reply={status:200,data:{deleted:true}};await remove();
 assert.equal(request.path,'/api/access-delete');assert.equal(request.headers.authorization,'Bearer '+'a'.repeat(48));
 assert.deepEqual(JSON.parse(request.body),{confirm:true});assert.equal(deleted,1);
 assert(!values.has('veriodetect.x.beta.code'));assert(!values.has('veriodetect.v06.history'));
 assert.equal(elements['#deleteAccessForm'].button.disabled,false);
 console.log('PASS: saved private receipt, retry, explicit deletion confirmation, native POST auth, failure preserves local data, successful cleanup.');
}finally{globalThis.document=priorDocument;globalThis.Option=priorOption}
