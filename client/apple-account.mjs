export function installAppleAccount({native,request,onAccountDeleted=()=>{}}){
 const $=id=>document.getElementById(id),status=$('appleAccountStatus');let session='',busy=false;
 const showError=e=>{status.textContent=e.message||'Account request failed.'};
 async function api(action,extra={}){
  const result=await request('/api/live-x-account',{method:'POST',headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session}:{})},body:JSON.stringify({action,...extra})});
  const data=await result.json();if(!result.ok)throw Error(data.error||'Account request failed');return data;
 }
 async function refresh(){
  session=(await native.session()).session||'';
  if(!session){status.textContent='Not signed in. Local analysis remains available.';return}
  const account=await api('status');status.textContent=account.message;
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
  await native.clearSession();session='';onAccountDeleted();status.textContent='Preview account deleted and Apple sign-in revoked.';
 });
 refresh().catch(showError);
}
