// Server catalog. Monetary arithmetic uses integer micro-USD; no client prices.
export const CATALOG=Object.freeze({
 version:'x-2026-11-05',bundleId:'com.veriodetect.app',appAppleId:6811957622,
 productId:'com.veriodetect.app.xcredits1020',credits:1020,
 postCostMicroUSD:5000,userCostMicroUSD:10000,markupPercent:200,
 maxPosts:100,lookupCredits:2,basePriceMicroUSD:15490000,
});
export function quoteFetch(posts=CATALOG.maxPosts){
 if(!Number.isInteger(posts)||posts<0||posts>CATALOG.maxPosts)throw Error('Invalid post count');
 const apiCostMicroUSD=CATALOG.userCostMicroUSD+posts*CATALOG.postCostMicroUSD;
 return {rateVersion:CATALOG.version,credits:CATALOG.lookupCredits+posts,apiCostMicroUSD,targetPriceMicroUSD:apiCostMicroUSD*3};
}
export function quoteOperation(operation,posts){
 if(operation!=='live-x-fetch')return {credits:0,apiCostMicroUSD:0,targetPriceMicroUSD:0};
 return quoteFetch(posts);
}
export function validateVerifiedPurchase(transaction,{accountId,environment,now=Date.now()}){
 // Call only after Apple's SignedDataVerifier succeeds, never on decoded client JSON.
 if(!['Production','Sandbox'].includes(environment))throw Error('Invalid store environment');
 if(transaction.environment!==environment||transaction.bundleId!==CATALOG.bundleId||transaction.productId!==CATALOG.productId||transaction.type!=='Consumable')throw Error('Unexpected purchase');
 if(transaction.appAccountToken?.toLowerCase()!==accountId.toLowerCase())throw Error('Purchase belongs to another account');
 if(!/^\d{1,30}$/.test(transaction.transactionId||'')||transaction.quantity!==1||transaction.revocationDate||!Number.isSafeInteger(transaction.purchaseDate)||transaction.purchaseDate>now+300000)throw Error('Invalid or revoked purchase');
 return {transactionId:transaction.transactionId,credits:CATALOG.credits};
}
