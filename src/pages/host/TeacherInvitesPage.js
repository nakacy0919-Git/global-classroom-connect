import '../../styles/teacherSelfService.css';
import {supabase} from '../../services/supabase.js';
import {issueTeacherInvite} from '../../services/teacherSelfService.js';

const el=(tag,cls='',text='')=>{const o=document.createElement(tag);o.className=cls;o.textContent=text;return o;};
export function TeacherInvitesPage(){return `<section class="gct-workspace gct-admin-invites">
  <div class="gct-banner"><div class="gct-banner-icon">✉️</div><div><p class="gct-eyebrow">TEACHER ONBOARDING</p><h2>Invite a teacher</h2><p>Give approved teachers a private one-time code. Only a teacher using the matching email can activate access.</p></div></div>
  <div class="gct-panel gct-invites-panel"><label>Approved teacher / school<select id="gct-invite-teacher"><option value="">Loading teachers…</option></select></label>
   <button id="gct-invite-generate" type="button" class="gct-primary">Generate invitation code →</button>
   <p id="gct-invite-error" class="gct-feedback" role="status"></p>
   <div id="gct-invite-result" hidden class="gct-invite-result"><strong>Copy this code now</strong>
   <code id="gct-invite-code"></code><button id="gct-invite-copy" type="button" class="gct-secondary">Copy code</button>
   <p>Share privately with this teacher. The code cannot be viewed later, expires after 7 days, and a new code invalidates an earlier one.</p></div>
  </div><p class="gct-hint">Teachers can sign up and activate at <a href="#/teacher-access">Teacher Access →</a>. This page does not email invitations automatically.</p>
 </section>`;}
export function bindTeacherInvitesPage(){
 const root=document.querySelector('.gct-admin-invites');if(!root)return;
 const $=id=>root.querySelector('#'+id),select=$('gct-invite-teacher'),feedback=$('gct-invite-error'),output=$('gct-invite-result');
 async function init(){
  const {data,error}=await supabase.from('teachers').select('id,display_name,email,auth_user_id,is_active,schools(name)').eq('is_active',true).order('display_name');
  if(error)throw error;
  select.replaceChildren();const first=el('option','','Choose a teacher with an email');first.value='';select.append(first);
  for(const t of data||[]){const option=el('option','',`${t.display_name} · ${t.schools?.name||'School'} · ${t.email||'no email'}${t.auth_user_id?' (activated)':''}`);
   option.value=t.id;option.disabled=!t.email||Boolean(t.auth_user_id);select.append(option);}
 }
 $('gct-invite-generate').addEventListener('click',async()=>{
  if(!select.value){feedback.textContent='Choose an unlinked teacher with an email address.';return;}
  const btn=$('gct-invite-generate');btn.disabled=true;output.hidden=true;
  try{const code=await issueTeacherInvite(select.value);$('gct-invite-code').textContent=code;output.hidden=false;feedback.textContent='New code generated. Share it securely, not in a public post.';}
  catch(e){feedback.textContent=e.message||'Unable to issue the invitation.';}finally{btn.disabled=false;}
 });
 $('gct-invite-copy').addEventListener('click',async()=>{
  const code=$('gct-invite-code').textContent;
  try{await navigator.clipboard.writeText(code);feedback.textContent='Code copied.';}
  catch{feedback.textContent='Clipboard unavailable. Select and copy the displayed code manually.';}
 });
 init().catch(e=>{feedback.textContent=e.message||'Unable to load teachers.';});
}
