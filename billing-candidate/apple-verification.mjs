import fs from 'node:fs';
import path from 'node:path';
import {SignedDataVerifier,Environment} from '@apple/app-store-server-library';
import {CATALOG,validateVerifiedPurchase} from './catalog.mjs';
let cached;
function verifier(environment){
 if(!['Production','Sandbox'].includes(environment))throw Error('Billing is not enabled');
 const roots=['AppleIncRootCertificate.pem','AppleRootCA-G2.pem','AppleRootCA-G3.pem'].map(name=>fs.readFileSync(path.join(process.cwd(),'billing-candidate','apple-roots',name)));
 cached??=new Map();
 if(!cached.has(environment))cached.set(environment,new SignedDataVerifier(roots,true,environment==='Production'?Environment.PRODUCTION:Environment.SANDBOX,CATALOG.bundleId,CATALOG.appAppleId));
 return cached.get(environment);
}
export async function verifyPurchase(jws,{accountId,environment}){
 if(typeof jws!=='string'||jws.length>30000||jws.split('.').length!==3)throw Error('Invalid purchase proof');
 let transaction;try{transaction=await verifier(environment).verifyAndDecodeTransaction(jws)}catch{throw Error('Apple purchase verification failed')}
 return validateVerifiedPurchase(transaction,{accountId,environment});
}
export async function verifyNotification(jws,{environment}){
 if(typeof jws!=='string'||jws.length>60000)throw Error('Invalid notification');
 const v=verifier(environment),notification=await v.verifyAndDecodeNotification(jws);
 if(!notification.data?.signedTransactionInfo)throw Error('Missing notification transaction');
 const transaction=await v.verifyAndDecodeTransaction(notification.data.signedTransactionInfo);
 return {notification,transaction};
}
