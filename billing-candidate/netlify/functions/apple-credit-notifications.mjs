import {redis,response} from '../../../backend-candidate/netlify/functions/_access.mjs';
import {CATALOG} from '../../catalog.mjs';
import {createLedger} from '../../ledger.mjs';
import {verifyNotification} from '../../apple-verification.mjs';

const environments=new Map([
 ['https://veriodetect-staging.netlify.app','Sandbox'],
 ['https://veriodetectbeta.netlify.app','Production'],
]);

export default async function handleNotification(request){
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 const environment=environments.get(new URL(request.url).origin);
 if(!environment||Netlify.env.get('APPLE_REFUND_NOTIFICATIONS_ENABLED')!=='1'){
  return response({error:'Refund notifications are disabled'},503);
 }

 const raw=await request.text();
 if(raw.length>65000)return response({error:'Request too large'},413);
 let verified;
 try{
  verified=await verifyNotification(JSON.parse(raw).signedPayload,{environment});
 }catch{
  return response({error:'Apple notification could not be verified'},400);
 }
 const {notification,transaction}=verified;
 if(!transaction||transaction.productId!==CATALOG.productId)return response({received:true});
 if(transaction.environment!==environment||transaction.bundleId!==CATALOG.bundleId||
    transaction.type!=='Consumable'||transaction.quantity!==1){
  return response({error:'Unexpected credit transaction'},400);
 }
 const reversed=notification.notificationType==='REFUND_REVERSED';
 if(!reversed&&!Number.isSafeInteger(transaction.revocationDate))return response({error:'Missing refund date'},400);
 const percentage=reversed?0:(transaction.revocationPercentage??100000);
 if(!Number.isInteger(percentage)||percentage<0||percentage>100000)return response({error:'Invalid refund percentage'},400);

 try{
  const ledger=createLedger(redis,{environment,accountId:transaction.appAccountToken});
  await ledger.applyVerifiedRefund(transaction.transactionId,{
   signedAt:notification.signedDate,
   refundedCredits:Math.round(CATALOG.credits*percentage/100000),
  });
  return response({received:true});
 }catch{
  return response({error:'Refund could not be recorded'},503);
 }
}

export const config={path:'/api/apple-credit-notifications'};
