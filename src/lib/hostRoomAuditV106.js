import '../styles/teacherRoomsV106.css';
import {provisionTeacherV106,teacherEditAuditV106,toggleTeacherV106} from '../services/teacherRoomEditV106.js';
const el=(tag,cls='',label='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=String(label);return n};
export function mountHostRoomAuditV106(panel,eventId){
 if(!panel||!eventId)return;
 const box=el('section','gcc-v104-host-card gcc-v106-hosted');
 box.append(el('h3','','Teacher room editing & activity log'));
 box.append(el('p','gcc-v106-note','Assign an individual 4-digit PIN to each teacher. Their name appears in the edit history. Codes are never shown again.'));
 const form=el('form');const fields=el('div','gcc-v106-fields');
 const nameField=el('label','','Teacher name');const name=el('input');name.placeholder='Teacher Mari';name.required=true;name.maxLength=80;nameField.append(name);
 const pinField=el('label','','Four-digit edit code');const pin=el('input');pin.type='password';pin.inputMode='numeric';pin.pattern='[0-9]{4}';pin.maxLength=4;pin.required=true;pinField.append(pin);
 fields.append(nameField,pinField);form.append(fields);
 const submit=el('button','gcc-v106-tool','Add / reset teacher edit code');submit.type='submit';form.append(submit);box.append(form);
 const message=el('p','gcc-v106-status');message.setAttribute('aria-live','polite');box.append(message);
 const teacherList=el('div'),history=el('div','gcc-v106-audit-list');box.append(teacherList,el('h4','','Latest changes'),history);
 panel.append(box);
 async function reload(){
  teacherList.replaceChildren(el('p','gcc-v106-note','Loading teachers…'));
  try{
   const result=await teacherEditAuditV106(eventId);
   if(!box.isConnected)return;
   teacherList.replaceChildren(el('h4','','Authorized teachers'));
   if(!result.editors?.length)teacherList.append(el('p','gcc-v106-note','No teachers authorized yet.'));
   for(const e of result.editors||[]){
    const row=el('div','gcc-v106-teacher-row',`${e.name} · ${e.enabled?'Active':'Disabled'}`);
    const toggle=el('button','gcc-v106-tool',e.enabled?'Disable':'Enable');toggle.type='button';
    toggle.addEventListener('click',async()=>{toggle.disabled=true;try{await toggleTeacherV106(eventId,e.id,!e.enabled);await reload();}catch(err){message.textContent=err.message;}finally{toggle.disabled=false;}});
    row.append(toggle);teacherList.append(row);
   }
   history.replaceChildren();
   if(!result.logs?.length)history.append(el('p','gcc-v106-note','No room edits yet.'));
   for(const item of result.logs||[]){
    const details=item.details||{};
    const moved=(details.before||[]).map(x=>`Room ${x.from} → ${x.to}`).join(', ');
    const names=(details.names||[]).map(n=>n.name).join(' + ');
    const stamp=new Date(item.at).toLocaleString('en-GB',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'});
    history.append(el('div','gcc-v106-audit-row',`${stamp} JST · ${item.teacher} · ${item.action}${names?' · '+names:''}${moved?' · '+moved:''}`));
   }
  }catch(err){message.textContent='Teacher editor setup is not available: '+err.message;teacherList.replaceChildren();}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();submit.disabled=true;message.textContent='Registering teacher…';
  try{await provisionTeacherV106(eventId,name.value.trim(),pin.value);pin.value='';name.value='';
   message.textContent='Teacher edit code registered. Tell the teacher their private code securely.';await reload();}
  catch(err){message.textContent=err.message;}finally{submit.disabled=false;}
 });
 reload();
}
