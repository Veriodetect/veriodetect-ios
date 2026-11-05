import assert from 'node:assert/strict';
import fs from 'node:fs';
import {X509Certificate} from 'node:crypto';
import {verifyPurchase} from '../billing-candidate/apple-verification.mjs';
for(const file of fs.readdirSync('billing-candidate/apple-roots')){
 const cert=new X509Certificate(fs.readFileSync('billing-candidate/apple-roots/'+file));
 assert(cert.ca);assert(cert.verify(cert.publicKey));assert(cert.subject.includes('Apple'));
 assert(Date.parse(cert.validTo)>Date.now());
}
const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const forged=encoded({alg:'none'})+'.'+encoded({productId:'com.veriodetect.app.xcredits1020',quantity:1,environment:'Sandbox',transactionId:'123456'})+'.fake';
await assert.rejects(verifyPurchase(forged,{accountId:'11111111-1111-4111-8111-111111111111',environment:'Sandbox'}),/verification failed/);
await assert.rejects(verifyPurchase('{}',{accountId:'11111111-1111-4111-8111-111111111111',environment:'Sandbox'}),/Invalid purchase proof/);
console.log('PASS: pinned public Apple roots are CA/self-signed/unexpired; forged and unsigned purchase proofs rejected.');
