// Candidate only: not imported by deployed functions until purchase verification is ready.
// redis is injected. All balance mutations are atomic and server-controlled.
import {CATALOG,quoteFetch} from './catalog.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PURCHASE_SCRIPT=`
local owner=redis.call('GET',KEYS[2]);if owner then
 if owner~=ARGV[1] then return {-1,0} end
 return {0,tonumber(redis.call('GET',KEYS[1]) or '0')} end
local current=tonumber(redis.call('GET',KEYS[1]) or '0')
if current+tonumber(ARGV[2])>1000000000 then return {-2,current} end
redis.call('SET',KEYS[2],ARGV[1]);local balance=redis.call('INCRBY',KEYS[1],ARGV[2]);return {1,balance}`;
export const RESERVE_SCRIPT=`
if redis.call('EXISTS',KEYS[2])==1 then return {0,redis.call('HGET',KEYS[2],'state')} end
local balance=tonumber(redis.call('GET',KEYS[1]) or '0')
if balance<tonumber(ARGV[1]) then return {-1,tostring(balance)} end
redis.call('DECRBY',KEYS[1],ARGV[1]);redis.call('HSET',KEYS[2],'state','reserved','held',ARGV[1],'at',ARGV[2]);return {1,tostring(balance-tonumber(ARGV[1]))}`;
export const SETTLE_SCRIPT=`
local state=redis.call('HGET',KEYS[2],'state');if not state then return {-1,0} end
if state~='reserved' then return {0,tonumber(redis.call('GET',KEYS[1]) or '0')} end
local held=tonumber(redis.call('HGET',KEYS[2],'held'));local charge=tonumber(ARGV[1]);if charge<0 or charge>held then return {-2,0} end
local balance=redis.call('INCRBY',KEYS[1],held-charge);redis.call('HSET',KEYS[2],'state',ARGV[2],'charged',ARGV[1]);return {1,balance}`;
export function createLedger(redis,{environment,accountId}){
 if(!['Production','Sandbox'].includes(environment)||!uuid.test(accountId))throw Error('Invalid billing account');
 const root='verio:billing:'+environment.toLowerCase()+':',owner=accountId.toLowerCase(),balanceKey=root+'balance:'+owner;
 const operationKey=id=>{if(!uuid.test(id))throw Error('Invalid operation');return root+'operation:'+owner+':'+id.toLowerCase()};
 return {
  async balance(){return Number(await redis('GET',balanceKey)||0)},
  async creditVerifiedPurchase(transactionId){
   if(!/^\d{1,30}$/.test(transactionId))throw Error('Invalid transaction');
   // The credit amount is never accepted from the client. Transactions never expire.
   const [state,balance]=await redis('EVAL',PURCHASE_SCRIPT,2,balanceKey,root+'transaction:'+transactionId,owner,CATALOG.credits);
   if(Number(state)<0)throw Error('Purchase claim rejected');return {credited:Number(state)===1,balance:Number(balance)};
  },
  async reserve(operationId){
   const [state,detail]=await redis('EVAL',RESERVE_SCRIPT,2,balanceKey,operationKey(operationId),quoteFetch().credits,Date.now());
   if(Number(state)<0)throw Error('Insufficient credits');
   return {started:Number(state)===1,...(Number(state)===1?{balance:Number(detail)}:{state:detail})};
  },
  async settle(operationId,posts){
   const [state,balance]=await redis('EVAL',SETTLE_SCRIPT,2,balanceKey,operationKey(operationId),quoteFetch(posts).credits,'settled');
   if(Number(state)<0)throw Error('Credit settlement rejected');return {settled:Number(state)===1,balance:Number(balance)};
  },
  async refundFailedFetch(operationId){
   const [state,balance]=await redis('EVAL',SETTLE_SCRIPT,2,balanceKey,operationKey(operationId),0,'refunded');
   if(Number(state)<0)throw Error('Credit refund rejected');return {refunded:Number(state)===1,balance:Number(balance)};
  },
 };
}
