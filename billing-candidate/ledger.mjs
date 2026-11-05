// Candidate only: not imported by deployed functions until purchase verification is ready.
// redis is injected. All balance mutations are atomic and server-controlled.
import {CATALOG,quoteFetch} from './catalog.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const holdDurationMs=5*60*1000;
export const PURCHASE_SCRIPT=`
if KEYS[4] then
 local account=redis.call('GET',KEYS[4])
 if not account or cjson.decode(account).state~='active' then return {-3,0} end
end
local owner=redis.call('GET',KEYS[2]);if owner then
 if owner~=ARGV[1] then return {-1,0} end
 return {0,tonumber(redis.call('GET',KEYS[1]) or '0')} end
local current=tonumber(redis.call('GET',KEYS[1]) or '0')
local refundOwner=redis.call('HGET',KEYS[3],'owner')
if refundOwner and refundOwner~=ARGV[1] then return {-1,0} end
local grant=tonumber(ARGV[2])-tonumber(redis.call('HGET',KEYS[3],'credits') or '0')
if current+grant>1000000000 then return {-2,current} end
redis.call('SET',KEYS[2],ARGV[1])
local balance=redis.call('INCRBY',KEYS[1],grant)
return {1,balance}`;
const APPLY_REFUND_SCRIPT=`
local owner=redis.call('GET',KEYS[2]) or redis.call('HGET',KEYS[3],'owner')
if owner and owner~=ARGV[1] then return -1 end
local previousDate=tonumber(redis.call('HGET',KEYS[3],'signedAt') or '0')
if previousDate>=tonumber(ARGV[2]) then return 0 end
local previousCredits=tonumber(redis.call('HGET',KEYS[3],'credits') or '0')
local refundedCredits=tonumber(ARGV[3])
if redis.call('EXISTS',KEYS[2])==1 then
 redis.call('INCRBY',KEYS[1],previousCredits-refundedCredits)
end
redis.call('HSET',KEYS[3],'owner',ARGV[1],'signedAt',ARGV[2],'credits',ARGV[3])
return 1`;
export const RESERVE_SCRIPT=`
if redis.call('EXISTS',KEYS[2])==1 then return {0,redis.call('HGET',KEYS[2],'state')} end
local balance=tonumber(redis.call('GET',KEYS[1]) or '0')
if balance<tonumber(ARGV[1]) then return {-1,tostring(balance)} end
redis.call('DECRBY',KEYS[1],ARGV[1])
redis.call('HSET',KEYS[2],'state','reserved','held',ARGV[1],'at',ARGV[2])
redis.call('ZADD',KEYS[3],ARGV[3],KEYS[2])
return {1,tostring(balance-tonumber(ARGV[1]))}`;
export const SETTLE_SCRIPT=`
local state=redis.call('HGET',KEYS[2],'state');if not state then return {-1,0} end
if state~='reserved' then return {0,tonumber(redis.call('GET',KEYS[1]) or '0')} end
local held=tonumber(redis.call('HGET',KEYS[2],'held'));local charge=tonumber(ARGV[1]);if charge<0 or charge>held then return {-2,0} end
local balance=redis.call('INCRBY',KEYS[1],held-charge)
redis.call('HSET',KEYS[2],'state',ARGV[2],'charged',ARGV[1])
redis.call('ZREM',KEYS[3],KEYS[2])
return {1,balance}`;
const RELEASE_EXPIRED_SCRIPT=`
local expired=redis.call('ZRANGEBYSCORE',KEYS[2],'-inf',ARGV[1],'LIMIT',0,100)
for _,operation in ipairs(expired) do
 if redis.call('HGET',operation,'state')=='reserved' then
  local held=redis.call('HGET',operation,'held')
  redis.call('INCRBY',KEYS[1],held)
  redis.call('HSET',operation,'state','expired','charged',0)
 end
 redis.call('ZREM',KEYS[2],operation)
end
return tonumber(redis.call('GET',KEYS[1]) or '0')`;
export function createLedger(redis,{environment,accountId,requireActiveAccount=false}){
 if(!['Production','Sandbox'].includes(environment)||!uuid.test(accountId))throw Error('Invalid billing account');
 const root='verio:billing:'+environment.toLowerCase()+':',owner=accountId.toLowerCase(),balanceKey=root+'balance:'+owner;
 const holdsKey=root+'holds:'+owner;
 const releaseExpired=async()=>Number(await redis('EVAL',RELEASE_EXPIRED_SCRIPT,2,balanceKey,holdsKey,Date.now()));
 const operationKey=id=>{if(!uuid.test(id))throw Error('Invalid operation');return root+'operation:'+owner+':'+id.toLowerCase()};
 const purchaseKeys=transactionId=>{
  if(!/^\d{1,30}$/.test(transactionId))throw Error('Invalid transaction');
  return [balanceKey,root+'transaction:'+transactionId,root+'refund:'+transactionId];
 };
 return {
  balance:releaseExpired,
  async creditVerifiedPurchase(transactionId){
   // The credit amount is never accepted from the client. Transactions never expire.
   const keys=purchaseKeys(transactionId);
   if(requireActiveAccount)keys.push('verio:identity:account:'+owner);
   const [state,balance]=await redis('EVAL',PURCHASE_SCRIPT,keys.length,...keys,owner,CATALOG.credits);
   if(Number(state)<0)throw Error('Purchase claim rejected');return {credited:Number(state)===1,balance:Number(balance)};
  },
  async applyVerifiedRefund(transactionId,{signedAt,refundedCredits}){
   if(!Number.isSafeInteger(signedAt)||signedAt<=0||
      !Number.isInteger(refundedCredits)||refundedCredits<0||refundedCredits>CATALOG.credits)throw Error('Invalid refund');
   const keys=purchaseKeys(transactionId);
   const result=Number(await redis('EVAL',APPLY_REFUND_SCRIPT,keys.length,...keys,owner,signedAt,refundedCredits));
   if(result<0)throw Error('Refund account mismatch');
   return {applied:result===1};
  },
  async reserve(operationId){
   const key=operationKey(operationId);
   await releaseExpired();
   const now=Date.now();
   const [state,detail]=await redis('EVAL',RESERVE_SCRIPT,3,balanceKey,key,holdsKey,quoteFetch().credits,now,now+holdDurationMs);
   if(Number(state)<0)throw Error('Insufficient credits');
   return {started:Number(state)===1,...(Number(state)===1?{balance:Number(detail)}:{state:detail})};
  },
  async settle(operationId,posts){
   const [state,balance]=await redis('EVAL',SETTLE_SCRIPT,3,balanceKey,operationKey(operationId),holdsKey,quoteFetch(posts).credits,'settled');
   if(Number(state)<0)throw Error('Credit settlement rejected');return {settled:Number(state)===1,balance:Number(balance)};
  },
  async refundFailedFetch(operationId){
   const [state,balance]=await redis('EVAL',SETTLE_SCRIPT,3,balanceKey,operationKey(operationId),holdsKey,0,'refunded');
   if(Number(state)<0)throw Error('Credit refund rejected');return {refunded:Number(state)===1,balance:Number(balance)};
  },
 };
}
