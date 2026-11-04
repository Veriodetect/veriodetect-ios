// Run only against a fresh disposable Redis service; never a deployed database.
import net from 'node:net';
import assert from 'node:assert/strict';
if(process.env.REDIS_TEST_DISPOSABLE!=='1')throw Error('Set REDIS_TEST_DISPOSABLE=1 only for a fresh disposable local Redis service.');
const port=Number(process.env.REDIS_TEST_PORT||6379);
function parse(buffer,at=0){
 const end=buffer.indexOf('\r\n',at);if(end<0)return null;
 const type=String.fromCharCode(buffer[at]),text=buffer.toString('utf8',at+1,end);let next=end+2;
 if(type==='-' )throw Error(text);
 if(type==='+'||type===':')return {value:type===':'?Number(text):text,next};
 if(type==='$'){const size=Number(text);if(size===-1)return {value:null,next};if(buffer.length<next+size+2)return null;return {value:buffer.toString('utf8',next,next+size),next:next+size+2};}
 if(type==='*'){const count=Number(text);if(count===-1)return {value:null,next};const value=[];for(let i=0;i<count;i++){const item=parse(buffer,next);if(!item)return null;value.push(item.value);next=item.next;}return {value,next};}
 throw Error('Unexpected Redis reply');
}
function command(...args){return new Promise((resolve,reject)=>{
 const socket=net.createConnection({host:'127.0.0.1',port});let data=Buffer.alloc(0);
 socket.setTimeout(10000,()=>socket.destroy(Error('Redis test timed out')));socket.on('error',reject);
 socket.on('connect',()=>{const parts=[Buffer.from(`*${args.length}\r\n`)];for(const arg of args){const b=Buffer.from(String(arg));parts.push(Buffer.from(`$${b.length}\r\n`),b,Buffer.from('\r\n'));}socket.write(Buffer.concat(parts));});
 socket.on('data',chunk=>{try{data=Buffer.concat([data,chunk]);const out=parse(data);if(out){socket.end();resolve(out.value)}}catch(e){socket.destroy();reject(e)}});
});}
assert.equal(await command('DBSIZE'),0,'Refusing to test against a non-empty Redis database.');
globalThis.Netlify={env:{get:name=>({UPSTASH_REDIS_REST_URL:'https://redis.test.invalid',UPSTASH_REDIS_REST_TOKEN:'disposable-test-token',VERIO_ADMIN_TOKEN:'disposable-admin'})[name]||''}};
globalThis.fetch=async(url,options)=>{
 assert.equal(url,'https://redis.test.invalid');assert.equal(options.headers.authorization,'Bearer disposable-test-token');
 const result=await command(...JSON.parse(options.body));return {ok:true,json:async()=>({result})};
};
const {default:register}=await import('../backend-candidate/netlify/functions/access-request.mjs');
const {default:admin}=await import('../backend-candidate/netlify/functions/access-admin.mjs');
const {default:remove}=await import('../backend-candidate/netlify/functions/access-delete.mjs');
const {sha,authorize,dateKey}=await import('../backend-candidate/netlify/functions/_access.mjs');
const req=(path,body,token,method='POST')=>new Request('https://example.invalid'+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)})});
const registration=async(email,receipt)=>{const r=await register(req('/api/access-request',{name:'Test User',email,deletionToken:receipt}));assert.equal(r.status,202);assert.equal((await r.json()).accepted,true);return command('GET','verio:delete:'+await sha(receipt));};
const action=async(id,action,quota=1)=>admin(req('/api/access-admin',{id,action,quota},'disposable-admin'));
const deletion=async(token)=>remove(req('/api/access-delete',{confirm:true},token));
try {
 const receipt='a'.repeat(64),id=await registration('one@example.invalid',receipt);
 assert(id);await registration('one@example.invalid',receipt);assert.equal(await command('LLEN','verio:requests'),1,'Lost-response retry must not create a duplicate');
 await command('DEL','verio:request-guard:'+await sha('one@example.invalid'));
 assert.equal(await registration('one@example.invalid',receipt),id,'Retry after a guard expires must still use the same record');
 const otherReceipt='b'.repeat(64),otherId=await registration('other@example.invalid',otherReceipt);
 assert.equal((await remove(req('/api/access-delete',{confirm:true,email:'one@example.invalid'}))).status,401);
 assert.equal((await deletion('c'.repeat(48))).status,401);assert(await command('GET','verio:request:'+id));
 assert.equal((await remove(req('/api/access-delete',{confirm:false},receipt))).status,400);
 const approved=await action(id,'approve');assert.equal(approved.status,200);const code=(await approved.json()).code;
 assert.equal((await authorize(req('/api/x-posts',{},code),true)).ok,true);
 assert.equal((await authorize(req('/api/x-posts',{},code),true)).status,429);
 assert.equal((await action(id,'revoke')).status,200);assert.equal((await authorize(req('/api/x-status',{},code))).status,401);
 // An unapproved registration for somebody else's email cannot erase their account.
 await command('DEL','verio:request-guard:'+await sha('one@example.invalid'));
 const impostorReceipt='d'.repeat(64),impostorId=await registration('one@example.invalid',impostorReceipt);
 assert.equal((await deletion(impostorReceipt)).status,200);assert.equal(await command('GET','verio:request:'+impostorId),null);
 assert(await command('GET','verio:request:'+id));assert(await command('GET','verio:code:'+await sha(code)));
 // A revoked access code remains proof for erasure; it cannot be used to fetch X.
 assert.equal((await deletion(code)).status,200);
 for(const key of ['verio:request:'+id,'verio:code:'+await sha(code),'verio:delete:'+await sha(receipt),'verio:usage:'+dateKey()+':'+await sha(code)])assert.equal(await command('GET',key),null,key);
 assert(await command('GET','verio:request:'+otherId),'Another user must remain untouched');
 // Concurrent approval/deletion is serialized: never leave an orphan live code.
 const racingReceipt='e'.repeat(64),raceId=await registration('race@example.invalid',racingReceipt);
 const [approveRace,deleteRace]=await Promise.all([action(raceId,'approve'),deletion(racingReceipt)]);
 assert.equal(deleteRace.status,200);assert([200,404].includes(approveRace.status));
 assert.equal(await command('GET','verio:request:'+raceId),null);
 if(approveRace.status===200){const c=(await approveRace.json()).code;assert.equal(await command('GET','verio:code:'+await sha(c)),null);}
 assert.equal((await action(raceId,'approve')).status,404);
 // Pending/rejected applicants can delete using their saved receipt without approval.
 assert.equal((await action(otherId,'reject')).status,200);assert.equal((await deletion(otherReceipt)).status,200);
 assert.equal(await command('LLEN','verio:requests'),0);assert.equal(await command('DBSIZE'),0);
 console.log('PASS: real Redis Lua registration retry, confirmation/auth, quota/revocation, scoped receipts, cross-user isolation, erasure and concurrent approval/deletion.');
}finally{
 // The empty-service assertion above plus explicit opt-in confines cleanup to test data.
 await command('FLUSHDB');
}
