export function installAppleAccount({native,request,accessCode=()=>'',onAccountDeleted=()=>{}}){
 const $=id=>document.getElementById(id),status=$('appleAccountStatus');let session='',busy=false;
 const buy=$('sandboxBuyCredits'),retry=$('sandboxCheckCredits'),balance=$('sandboxCreditBalance');
 let maxFetchCredits=102, productAvailable=false;
 const panels=['appleAccountSignedOut','appleAccountSignedIn','appleAccountRetry'];
 function showPanel(id){
  if(id!=='appleAccountSignedIn')$('appleAccountSignedIn').querySelector('details').open=false;
  panels.forEach(panel=>{$(panel).hidden=panel!==id});
 }
 const showError=e=>{status.textContent=e.message||'Account request failed.'};
 async function api(action,extra={}){
  const result=await request('/api/live-x-account',{method:'POST',headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session}:{})},body:JSON.stringify({action,...extra})});
  const data=await result.json();if(!result.ok)throw Error(data.error||'Account request failed');return data;
 }
 function showBalance(value){balance.textContent=`${value} Verio Credits available`}
 async function deliver(transaction){
  const claim=await api('claim',{signedTransaction:transaction.signedTransaction});
  if(claim.transactionId!==transaction.transactionId)throw Error('Purchase delivery was not confirmed.');
  showBalance(claim.balance);
  await native.finish({transactionId:transaction.transactionId});
 }
 async function refreshCredits(){
  const credits=await api('credits');
  maxFetchCredits=credits.maxFetchCredits;
  showBalance(credits.balance);
  for(const transaction of (await native.unfinished()).transactions)await deliver(transaction);
  const product=(await native.products()).products.find(item=>item.id===credits.productId);
  productAvailable=Boolean(product);
  buy.textContent=product?'Buy 1,020 Verio Credits':'Verio Credits pack unavailable';
 }
 async function refresh(){
  try{
   session=(await native.session()).session||'';
   if(session){
    try{await api('status')}catch(e){
     if(e.message!=='Please sign in again'&&e.message!=='Sign in with Apple to continue')throw e;
     await native.clearSession();session='';
     status.textContent='Your session ended. Please sign in again.';
     showPanel('appleAccountSignedOut');return;
    }
   }
   showPanel(session?'appleAccountSignedIn':'appleAccountSignedOut');
   status.textContent=session?'Signed in with Apple.':'Not signed in.';
  }catch(e){showPanel('appleAccountRetry');throw e}
  if(session&&buy)await refreshCredits();
 }
 async function perform(action){
  if(busy)return;busy=true;
  const buttons=['appleAccountSignIn','appleAccountRefresh','appleAccountSignOut','appleAccountDelete','sandboxBuyCredits','sandboxCheckCredits','sandboxRequestRefund'].map($).filter(Boolean);
  buttons.forEach(button=>{button.disabled=true});
  try{await action()}catch(e){showError(e)}finally{
   busy=false;
   buttons.forEach(button=>{button.disabled=button===buy&&!productAvailable});
  }
 }
 $('appleAccountSignIn').onclick=()=>perform(async()=>{
  status.textContent='Signing in…';const challenge=await api('challenge'),result=await native.signIn(challenge);
  if(result.status==='cancelled'){status.textContent='Sign-in cancelled. Local analysis remains available.';return}
  const login=await api('signin',{challengeId:challenge.challengeId,identityToken:result.identityToken,authorizationCode:result.authorizationCode});
  await native.saveSession({session:login.session});session=login.session;await refresh();
 });
 $('appleAccountRefresh').onclick=()=>perform(refresh);
 $('appleAccountSignOut').onclick=()=>perform(async()=>{
  if(session)await api('signout');await native.clearSession();session='';await refresh();
 });
 $('appleAccountDelete').onclick=()=>perform(async()=>{
  if(!session)throw Error('Sign in to the preview account first.');
  if(!confirm('Permanently delete this Apple-linked preview account and revoke its Apple sign-in? Existing beta access-code registrations are separate.'))return;
  const result=await api('delete',{confirm:true});if(result.deleted!==true)throw Error('Deletion was not confirmed.');
  await native.clearSession();session='';showPanel('appleAccountSignedOut');onAccountDeleted();status.textContent='Preview account deleted and Apple sign-in revoked.';
 });
 if(buy){
  retry.onclick=()=>perform(refresh);
  $('sandboxRequestRefund').onclick=()=>perform(async()=>{
   const account=await api('status');
   const result=await native.requestSandboxRefund({accountId:account.accountId});
   status.textContent=result.submitted
    ?'Sandbox refund requested. Check your balance after Apple processes it.'
    :'Sandbox refund request cancelled.';
  });
  buy.onclick=()=>perform(async()=>{
   const approval=await api('preparePurchase',{accessCode:accessCode()});
   const result=await native.purchase({accountId:approval.accountId});
   if(result.status==='purchased'){await deliver(result);status.textContent='Verio Credits added.'}
   else if(result.status==='pending')status.textContent='Sandbox purchase pending. Tap Check balance to try again.';
   else if(result.status==='cancelled')status.textContent='Sandbox purchase cancelled.';
  });
 }
 perform(refresh);
 return {
  async fetchWithCredits(username){
   if(!session)throw Error('Sign in with Apple under About before using Verio Credits.');
   if(busy)throw Error('Wait for the current account operation to finish.');
   if(!confirm(`Fetch from X for up to ${maxFetchCredits} Verio Credits?`))throw Error('Fetch cancelled.');
   const result=await api('fetchWithCredits',{username,accessCode:accessCode(),operationId:crypto.randomUUID()});
   showBalance(result.balance);
   return result;
  }
 };
}
