import assert from 'node:assert/strict';
import {createLedger} from '../billing-candidate/ledger.mjs';
// Called only inside verify-backend-redis's fresh disposable service guard.
export async function verifyBillingRedis(redis){
 const accountId='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222';
 const ledger=createLedger(redis,{environment:'Sandbox',accountId});
 const other=createLedger(redis,{environment:'Sandbox',accountId:otherId});
 const prod=createLedger(redis,{environment:'Production',accountId});
 const op=i=>'33333333-3333-4333-8333-'+String(i).padStart(12,'0');
 assert.equal(await ledger.balance(),0);
 await assert.rejects(ledger.reserve(op(1)),/Insufficient/);
 const purchases=await Promise.all(Array.from({length:12},()=>ledger.creditVerifiedPurchase('123456789')));
 assert.equal(purchases.filter(x=>x.credited).length,1);assert.equal(await ledger.balance(),1020);
 await assert.rejects(other.creditVerifiedPurchase('123456789'),/claim rejected/);
 assert.equal(await prod.balance(),0);assert.equal(await other.balance(),0);
 // Reserve the IDs used by later assertions before racing the remaining balance.
 for(const id of [10,11,12])assert.equal((await ledger.reserve(op(id))).started,true);
 const reservations=await Promise.allSettled(Array.from({length:12},(_,i)=>ledger.reserve(op(i+13))));
 assert.equal(reservations.filter(x=>x.status==='fulfilled'&&x.value.started).length,7);
 for(const failure of reservations.filter(x=>x.status==='rejected'))assert.match(failure.reason.message,/Insufficient credits/);
 assert.equal(await ledger.balance(),0);
 // A repeated request ID never triggers a second fetch or debit.
 const repeated=await ledger.reserve(op(10));assert.equal(repeated.started,false);assert.equal(repeated.state,'reserved');
 const settled=await Promise.all([ledger.settle(op(10),5),ledger.settle(op(10),5)]);
 assert.equal(settled.filter(x=>x.settled).length,1);assert.equal(await ledger.balance(),95);
 assert.equal((await ledger.refundFailedFetch(op(10))).refunded,false);assert.equal(await ledger.balance(),95);
 const refunds=await Promise.all([ledger.refundFailedFetch(op(11)),ledger.refundFailedFetch(op(11))]);
 assert.equal(refunds.filter(x=>x.refunded).length,1);assert.equal(await ledger.balance(),197);
 assert.equal((await ledger.settle(op(11),100)).settled,false);assert.equal(await ledger.balance(),197);
 await assert.rejects(ledger.settle(op(999),100),/rejected/);
 await assert.rejects(ledger.settle(op(12),101),/Invalid post count/);
 // Simulate a worker stopping after it reserves credits. Concurrent balance
 // checks must release the hold once, and a late worker cannot bill it.
 const root='verio:billing:sandbox:';
 await redis('ZADD',root+'holds:'+accountId,0,root+'operation:'+accountId+':'+op(12));
 const recovered=await Promise.all([ledger.balance(),ledger.balance()]);
 assert.deepEqual(recovered,[299,299]);
 assert.equal((await ledger.reserve(op(12))).state,'expired');
 assert.equal((await ledger.settle(op(12),5)).settled,false);
 assert.equal(await ledger.balance(),299);
 // Apple can deliver refunds before claim and retry older events after reversal.
 const refundId='987654321';
 assert.equal((await other.applyVerifiedRefund(refundId,{signedAt:100,refundedCredits:510})).applied,true);
 assert.equal(await other.balance(),0);
 await assert.rejects(ledger.creditVerifiedPurchase(refundId),/claim rejected/);
 assert.equal((await other.creditVerifiedPurchase(refundId)).balance,510);
 assert.equal((await other.applyVerifiedRefund(refundId,{signedAt:100,refundedCredits:510})).applied,false);
 assert.equal((await other.applyVerifiedRefund(refundId,{signedAt:200,refundedCredits:1020})).applied,true);
 assert.equal(await other.balance(),0);
 assert.equal((await other.applyVerifiedRefund(refundId,{signedAt:300,refundedCredits:0})).applied,true);
 assert.equal((await other.applyVerifiedRefund(refundId,{signedAt:200,refundedCredits:1020})).applied,false);
 assert.equal(await other.balance(),1020);
 assert.equal(await prod.balance(),0);
 assert.equal(await redis('TTL','verio:billing:sandbox:balance:'+accountId),-1,'Purchased credits must not expire');
 assert.equal(await redis('TTL','verio:billing:sandbox:transaction:123456789'),-1,'Replay protection must not expire');
 console.log('PASS: real Redis concurrent purchase replay/ownership, environment isolation, overspend prevention, idempotent settlement and failed-fetch refund, non-expiry.');
}
