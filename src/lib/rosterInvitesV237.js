import {rosterInviteStatusV237,issueRosterInviteV237,revokeRosterInvitesV237,verifiedRosterPolicyV238,requireVerifiedRosterV238} from '../services/simpleSessionService.js';
// Existing global Host Admin authorization is enforced by every server RPC.
export function mountRosterInvitesV237(panel,eventId){
 const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
 const box=el('details');box.className='gcc-v104-secondary-details';
 box.append(el('summary','Registration invitations (optional)'));
 const hint=el('p','Issuing a code switches this session to invitation-only. Each school needs its own single-use code, valid up to seven days or the session start. Existing registrations are unchanged. Share each code privately; do not post it publicly. This setting cannot be undone from this screen.');
 const state=el('p','Checking invitation policy…');state.setAttribute('role','status');
 const issue=el('button','Issue one school invitation');issue.type='button';issue.className='gcc-v8-secondary';issue.disabled=true;
 const revoke=el('button','Revoke unused invitations');revoke.type='button';revoke.className='gcc-v8-secondary';revoke.disabled=true;
 const output=el('input');output.type='password';output.readOnly=true;output.hidden=true;output.autocomplete='off';output.setAttribute('aria-label','New invitation code');
 const reveal=el('button','Show code');reveal.type='button';reveal.hidden=true;reveal.className='gcc-v8-secondary';
 reveal.onclick=()=>{output.type=output.type==='password'?'text':'password';reveal.textContent=output.type==='password'?'Show code':'Hide code';};
 const verifyHint=el('p','Optional: require confirmed GCC teacher accounts with an active linked school. This is separate from invitation codes. Existing registrations are unchanged.');
 const verifyStatus=el('p','Checking account requirement…');verifyStatus.setAttribute('role','status');
 const verify=el('button','Require verified GCC teachers');verify.type='button';verify.className='gcc-v8-secondary';verify.disabled=true;
 box.append(hint,state,issue,revoke,output,reveal,el('hr'),verifyHint,verifyStatus,verify);panel.append(box);
 let verifyGeneration=0;
 const refreshVerified=async()=>{
  const generation=++verifyGeneration;verify.disabled=true;
  try{
   const required=await verifiedRosterPolicyV238(eventId);
   if(!box.isConnected||!box.open||generation!==verifyGeneration)return;
   verifyStatus.textContent=required?'Verified teacher accounts required':'Account verification is not required';
   verify.disabled=required;
  }catch{if(box.open&&generation===verifyGeneration)verifyStatus.textContent='Could not check account requirement.';}
 };
 verify.onclick=async()=>{
  if(!box.open||verify.disabled||!window.confirm('Require verified GCC teacher accounts for new registrations? Confirm participating teachers are eligible first. This cannot be undone from this screen.'))return;
  verify.disabled=true;verifyStatus.textContent='Saving account requirement…';
  try{await requireVerifiedRosterV238(eventId);if(box.isConnected&&box.open)verifyStatus.textContent='Verified teacher accounts required';}
  catch{if(box.isConnected&&box.open)verifyStatus.textContent='Could not confirm the change. Reopen this panel to check before retrying.';}
 };
 let required=false,busy=false;
 const clear=()=>{output.value='';output.hidden=true;output.type='password';reveal.hidden=true;reveal.textContent='Show code';};
 const refresh=async()=>{issue.disabled=true;revoke.disabled=true;try{required=Boolean(await rosterInviteStatusV237(eventId));if(!box.isConnected||!box.open)return;state.textContent=required?'Invitation-only registration':'Open registration';issue.disabled=false;revoke.disabled=!required;}catch{if(box.open)state.textContent='Invitation controls unavailable. Ask the GCC administrator to check the database setup.';}};
 box.addEventListener('toggle',()=>{clear();++verifyGeneration;if(box.open){if(!busy)void refresh();void refreshVerified();}});
 issue.onclick=async()=>{
  if(busy||!box.open)return;
  if(!required&&!window.confirm('Switch this session to invitation-only? Schools using old registration links will need a new code.'))return;
  busy=true;issue.disabled=true;revoke.disabled=true;clear();
  try{const code=await issueRosterInviteV237(eventId);if(!box.isConnected||!box.open)return;required=true;output.value=code;output.hidden=false;reveal.hidden=false;state.textContent='Invitation-only. Copy the new code now; it cannot be retrieved later.';}
  catch{if(box.open)state.textContent='Could not confirm issuance. Reopen this panel before trying again.';}
  finally{busy=false;if(box.open){issue.disabled=false;revoke.disabled=!required;}}
 };
 revoke.onclick=async()=>{
  if(busy||!box.open||!window.confirm('Revoke all unused invitations? The session will remain invitation-only.'))return;
  busy=true;issue.disabled=true;revoke.disabled=true;clear();
  try{const n=await revokeRosterInvitesV237(eventId);if(box.open)state.textContent=n+' unused invitations revoked. Issue new codes as needed.';}
  catch{if(box.open)state.textContent='Could not confirm revocation. Reopen to check the policy.';}
  finally{busy=false;if(box.open){issue.disabled=false;revoke.disabled=false;}}
 };
}
