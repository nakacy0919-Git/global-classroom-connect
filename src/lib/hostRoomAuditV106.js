import '../styles/teacherRoomsV106.css';
import '../styles/teacherRoomsV108.css';
import {listTeacherCodesV108,generateTeacherCodesV108,toggleTeacherCodeV108} from '../services/teacherRoomEditV106.js';
const el=(tag,cls='',label='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=String(label);return n;};
const action=(label,callback,cls='gcc-v106-tool')=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',callback);return b;};
export function mountHostRoomAuditV106(panel,eventId){
 if(!panel||!eventId)return;
 const box=el('section','gcc-v104-host-card gcc-v108-host');
 box.append(el('div','gcc-v108-eyebrow','TEACHER ACCESS'));
 box.append(el('h3','','Individual editing codes'));
 box.append(el('p','gcc-v106-note','Each approved teacher gets a different 4-digit code. They can edit only students from their registered school. The 6-digit session viewing code stays the same.'));
 const banner=el('p','gcc-v108-host-status','Loading approved schools…');box.append(banner);
 const toolbar=el('div','gcc-v108-host-toolbar');
 const all=action('Generate missing teacher codes',()=>generate(null,false),'gcc-v108-main');
 toolbar.append(all);box.append(toolbar);
 const issued=el('section','gcc-v108-issued');issued.hidden=true;
 issued.append(el('strong','','New codes — copy before leaving this page'));
 issued.append(el('p','gcc-v106-note','For safety, issued PINs cannot be viewed again. You can regenerate a teacher code if needed.'));
 const issuedList=el('div','gcc-v108-code-list');issued.append(issuedList);box.append(issued);
 const notice=el('p','gcc-v106-status');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');box.append(notice);
 const schools=el('div','gcc-v108-school-list');box.append(schools);
 box.append(el('h4','','Teacher edit history'));
 const logs=el('div','gcc-v106-audit-list');box.append(logs);
 panel.append(box);
 let busy=false;
 async function generate(signupId,rotate){
  if(busy)return;busy=true;all.disabled=true;notice.textContent='Generating secure codes…';
  try{
   const result=await generateTeacherCodesV108(eventId,signupId,rotate);
   issuedList.replaceChildren();issued.hidden=!result.codes?.length;
   for(const row of result.codes||[]){
    const item=el('div','gcc-v108-issued-row');
    const who=el('div','',`${row.teacher} · ${row.school}`);
    const code=el('strong','gcc-v108-pin',row.code);
    const copy=action('Copy',async()=>{try{await navigator.clipboard.writeText(row.code);notice.textContent='Code copied. Share it privately.';}catch{notice.textContent='Select and copy the displayed code.';}});
    item.append(who,code,copy);issuedList.append(item);
   }
   notice.textContent=result.generated?`${result.generated} code(s) created. Copy them before leaving.`:'All approved teachers already have codes. Use Regenerate to replace a lost code.';
   await reload();
  }catch(err){notice.textContent=err.message||'Could not generate codes.';}
  finally{busy=false;all.disabled=false;}
 }
 async function reload(){
  try{
   const data=await listTeacherCodesV108(eventId);
   if(!box.isConnected)return;
   const registrations=data.registrations||[];
   banner.textContent=`${registrations.length} approved teacher registration(s) · ${registrations.filter(r=>r.issued).length} code(s) issued`;
   schools.replaceChildren();
   for(const row of registrations){
    const card=el('div','gcc-v108-school');
    const who=el('div','gcc-v108-school-main');
    who.append(el('strong','',row.teacher),el('span','',`${row.school} · ${row.country} · ${row.students} students`));
    const state=el('span',row.enabled?'gcc-v108-enabled':'gcc-v108-disabled',row.issued?(row.enabled?'Code active':'Code disabled'):'Not issued');
    const controls=el('div','gcc-v108-school-actions');
    const regen=action(row.issued?'Regenerate code':'Generate code',()=>{
      if(row.issued&&!window.confirm(`Replace the edit code for ${row.teacher}? The old code will stop working.`))return;
      generate(row.signup_id,true);
    });
    controls.append(regen);
    if(row.issued){const toggle=action(row.enabled?'Disable':'Enable',async()=>{
      toggle.disabled=true;try{await toggleTeacherCodeV108(eventId,row.signup_id,!row.enabled);await reload();notice.textContent=`${row.teacher}: ${row.enabled?'disabled':'enabled'}.`;}catch(err){notice.textContent=err.message;}finally{toggle.disabled=false;}
    });controls.append(toggle);}
    card.append(who,state,controls);schools.append(card);
   }
   if(!registrations.length)schools.append(el('p','gcc-v106-note','No approved teachers yet. Approve school registrations first.'));
   logs.replaceChildren();
   for(const entry of data.logs||[]){
    const d=entry.details||{};const stamp=new Date(entry.at).toLocaleString('en-GB',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'});
    const names=(d.names||[]).map(x=>x.name).join(' + ');
    const moves=(d.before||[]).map(x=>`Room ${x.from} → ${x.to}`).join(', ');
    logs.append(el('div','gcc-v106-audit-row',`${stamp} JST · ${entry.teacher}${d.school?' · '+d.school:''} · ${entry.action}${names?' · '+names:''}${moves?' · '+moves:''}`));
   }
   if(!data.logs?.length)logs.append(el('p','gcc-v106-note','No edits recorded yet. Teacher names are attributed to issued code holders, not personally verified accounts.'));
  }catch(err){banner.textContent=`Teacher access unavailable: ${err.message}`;}
 }
 reload();
}
