import '../styles/teacherRoomsV106.css';
import {setSessionTeacherCodeV107,disableSessionTeacherCodeV107,sessionTeacherCodeStatusV107} from '../services/teacherRoomEditV106.js';
const el=(tag,cls='',label='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=String(label);return n;};
export function mountHostRoomAuditV106(panel,eventId){
 if(!panel||!eventId)return;
 const box=el('section','gcc-v104-host-card gcc-v106-hosted');
 box.append(el('h3','','Teacher Mode · shared edit code'));
 box.append(el('p','gcc-v106-note','Choose one 4-digit code for this session. Share it privately with participating teachers. The session access code (6 digits) does not change.'));
 const configuration=el('p','gcc-v106-status','Loading code status…');box.append(configuration);
 const form=el('form');const codeLabel=el('label','','Set / replace shared 4-digit Teacher Mode code');
 const code=el('input');code.type='password';code.inputMode='numeric';code.pattern='[0-9]{4}';code.maxLength=4;code.required=true;code.autocomplete='new-password';code.name='gcc_session_teacher_pin';
 codeLabel.append(code);form.append(codeLabel);
 const submit=el('button','gcc-v106-tool','Save shared code');submit.type='submit';form.append(submit);
 const disable=el('button','gcc-v106-tool','Disable teacher edits');disable.type='button';disable.hidden=true;
 form.append(disable);box.append(form);
 box.append(el('p','gcc-v106-note','A simple code such as 0000 is allowed, but a less predictable code is safer. Five failed attempts temporarily lock Teacher Mode.'));
 const msg=el('p','gcc-v106-status');msg.setAttribute('aria-live','polite');box.append(msg);
 const history=el('div','gcc-v106-audit-list');box.append(el('h4','','Latest teacher changes'),history);
 panel.append(box);
 async function reload(){
  try{
   const result=await sessionTeacherCodeStatusV107(eventId);
   if(!box.isConnected)return;
   configuration.textContent=!result.configured?'Not configured yet':result.enabled?'Shared code is active.':'Shared code is disabled.';
   disable.hidden=!result.enabled;
   history.replaceChildren();
   if(!result.logs?.length)history.append(el('p','gcc-v106-note','No room edits yet.'));
   for(const item of result.logs||[]){
    const details=item.details||{};
    const moves=(details.before||[]).map(x=>`Room ${x.from} → ${x.to}`).join(', ');
    const names=(details.names||[]).map(n=>n.name).join(' + ');
    const stamp=new Date(item.at).toLocaleString('en-GB',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'});
    const identity=item.account?'Signed-in account': 'Self-reported name';
    history.append(el('div','gcc-v106-audit-row',`${stamp} JST · ${item.teacher} (${identity}) · ${item.action}${names?' · '+names:''}${moves?' · '+moves:''}`));
   }
  }catch(err){configuration.textContent='Cannot load Teacher Mode: '+err.message;}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();submit.disabled=true;msg.textContent='Saving shared code…';
  try{await setSessionTeacherCodeV107(eventId,code.value);code.value='';msg.textContent='Shared code saved. Send it privately to participating teachers.';await reload();}
  catch(err){msg.textContent=err.message;}finally{submit.disabled=false;}
 });
 disable.addEventListener('click',async()=>{
  if(!window.confirm('Disable Teacher Mode for this session? Published rooms remain available.'))return;
  disable.disabled=true;
  try{await disableSessionTeacherCodeV107(eventId);msg.textContent='Teacher Mode disabled.';await reload();}
  catch(err){msg.textContent=err.message;}finally{disable.disabled=false;}
 });
 reload();
}
