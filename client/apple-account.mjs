export function installAppleAccount({native,request,onAccountDeleted=()=>{}}){
 const $=id=>document.getElementById(id),status=$('appleAccountStatus');let session='',busy=false;
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
 }
 async function perform(action){
  if(busy)return;busy=true;
  const ids=['appleAccountSignIn','appleAccountRefresh','appleAccountSignOut','appleAccountDelete'];ids.forEach(id=>$(id).disabled=true);
  try{await action()}catch(e){showError(e)}finally{busy=false;ids.forEach(id=>$(id).disabled=false)}
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
 perform(refresh);
}
