import '../../styles/simpleSessionsV8.css';
import {mountRoomPlannerV9} from '../../components/RoomPlannerV9.js';
import {getEvents,addEvent,updateEvent} from '../../services/eventService.js';
import {fetchRoomDraft} from '../../services/roomDraftV91.js';
import {getRoomShareStatus,publishRoomShare,revokeRoomShare} from '../../services/sharePlanV102.js';
import {toUtc} from '../../lib/matching.js';
import {getSessionSettings,saveSessionSettings} from '../../services/simpleSessionService.js';
import {listSessionSignups,reviewSessionSignup} from '../../services/sessionRosterService.js';
import {updateRegistrationNames} from '../../services/sessionManagerService.js';
import {englishName} from '../../lib/simpleRoster.js';
const $=id=>document.getElementById(id);
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=String(text);return n;};
const fmt=(iso,zone='Asia/Tokyo')=>{try{return new Intl.DateTimeFormat('en',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));}catch{return 'Date not set';}};
const defaultSettings=()=>({breakout_rooms:10,max_students:150,facilitators_per_room:1});
let activeEventId='';let activeStage=0;
export function SimpleSessionsPage(){return `
<section class="gcc-v8 gcc-v8-host" aria-label="Manage Global Classroom sessions">
  <header class="gcc-v8-top"><div><span class="gcc-v8-small">ONE SESSION · ONE TASK</span><p>Prepare your exchange, one step at a time.</p></div><button type="button" id="gcc-v8-new" class="gcc-v8-secondary">+ New session</button></header>
  <div id="gcc-v8-create-wrap" class="gcc-v8-new-form" hidden>
    <h2>Create a session</h2>
    <form id="gcc-v8-create">
      <div class="gcc-v8-fields">
        <label>Session title * <input name="title" required maxlength="140" placeholder="e.g. Global Friends — Food & Culture" /></label>
        <label>Date * <input name="date" required type="date" /></label>
        <label>Start time * <input name="time" required type="time" /></label>
        <label>Time zone <select name="timezone"><option value="Asia/Tokyo">Japan (JST)</option><option value="Asia/Manila">Philippines</option><option value="Asia/Ho_Chi_Minh">Vietnam</option><option value="Asia/Jakarta">Indonesia</option><option value="Asia/Kuala_Lumpur">Malaysia</option><option value="Asia/Colombo">Sri Lanka</option><option value="Europe/London">United Kingdom</option><option value="America/New_York">USA Eastern</option></select></label>
        <label>Breakout rooms <input type="number" name="rooms" min="1" max="60" value="10" required /></label>
        <label>Maximum students <input type="number" name="capacity" min="1" max="2000" value="150" required /></label>
        <label>Facilitators per room <select name="facs"><option value="1">1 person</option><option value="2">2 people</option><option value="0">No facilitator required</option></select></label>
      </div>
      <div class="gcc-v8-actions"><button type="button" id="gcc-v8-cancel-new" class="gcc-v8-secondary">Cancel</button><button type="submit" class="gcc-v8-primary">Create session →</button></div>
    </form>
  </div>
  <section class="gcc-v8-current"><label>YOUR SESSION <select id="gcc-v8-host-select"><option value="">Loading…</option></select></label><div id="gcc-v8-current-title"></div></section>
  <section class="gcc-v8-focus" id="gcc-v8-focus">
    <div class="gcc-v8-focus-head"><span id="gcc-v8-stage-counter" class="gcc-v8-small">STEP 1 OF 4</span><div id="gcc-v8-stage-progress" class="gcc-v8-progress"></div></div>
    <h2 id="gcc-v8-stage-title">Get ready</h2>
    <p id="gcc-v8-stage-explain" class="gcc-v8-desc"></p>
    <div id="gcc-v8-host-panel"></div>
    <footer class="gcc-v8-footer"><button id="gcc-v8-host-back" type="button" class="gcc-v8-secondary" hidden>← Back</button><button id="gcc-v8-host-next" type="button" class="gcc-v8-primary">Next: Registrations →</button></footer>
  </section>
  <p id="gcc-v8-host-message" class="gcc-v8-error" role="status" aria-live="polite"></p>
  <div id="gcc-v8-edit-wrap" class="gcc-v8-modal-cover" hidden>
    <div class="gcc-v8-modal" role="dialog" aria-modal="true" aria-labelledby="gcc-v8-edit-heading">
      <h3 id="gcc-v8-edit-heading">Edit names</h3>
      <p class="gcc-v8-help">English A–Z letters only. Approved students are updated in the Participant Pool.</p>
      <form id="gcc-v8-edit-form"><label>Teacher name <input id="gcc-v8-edit-teacher" maxlength="120" required /></label><div id="gcc-v8-edit-rows" class="gcc-v8-edit-rows"></div><p role="alert" id="gcc-v8-edit-error" class="gcc-v8-error"></p><div class="gcc-v8-actions"><button type="button" class="gcc-v8-secondary" id="gcc-v8-edit-cancel">Cancel</button><button type="submit" class="gcc-v8-primary">Save changes</button></div></form>
    </div>
  </div>
</section>`;}
export function bindSimpleSessionsPage(){
 const root=document.querySelector('.gcc-v8-host');if(!root)return;
 let events=[],settings=[],signups=[],edit=null;
 let shareToken='',shareEvent='';
 const current=()=>events.find(x=>x.id===activeEventId);
 const conf=()=>settings.find(s=>s.event_id===activeEventId)||defaultSettings();
 const party=()=>signups.filter(s=>s.event_id===activeEventId);
 const notify=(text,bad=false)=>{$('gcc-v8-host-message').textContent=text;$('gcc-v8-host-message').classList.toggle('bad',bad);};
 const btn=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
 const link=()=>`${location.origin}${location.pathname}#/session-register`;
 function currentLabel(){const p=$('gcc-v8-host-select');p.replaceChildren();if(!events.length){const o=el('option','','No sessions yet');o.value='';p.append(o);p.disabled=true;return;}
   p.disabled=false;for(const e of events){const o=el('option','',`${e.title}${e.status==='published'?' · Open':''}`);o.value=e.id;p.append(o);}p.value=activeEventId;
   const x=$('gcc-v8-current-title');x.replaceChildren();const e=current();if(e)x.append(el('strong','',e.title),el('span','',`${fmt(e.starts_at,e.timezone)} · ${e.status}`));
 }
 function formRow(label,value){const row=el('div','gcc-v8-information');row.append(el('span','',label),el('strong','',value));return row;}
 async function updateSettings(p){await saveSessionSettings({eventId:activeEventId,...p});await reload(false);notify('Session settings saved.');}
 function stagePrepare(panel,e){
   if(e.status==='draft'){
     panel.append(el('p','gcc-v8-info-box','This session is a draft. Publish it when the details are ready.'));
     panel.append(btn('Publish session →','gcc-v8-primary',async()=>{if(Date.parse(e.starts_at)<=Date.now()){notify('Choose a future date first.',true);return;}
       try{await updateEvent(e.id,{status:'published'});await reload(false);notify('Published. You can now share the registration link.');}catch(err){notify(err.message,true);}}));
   }else if(e.status==='published'){
     panel.append(el('h3','','Share one link with all teachers'));
     const url=el('input','gcc-v8-url');url.value=link();url.readOnly=true;url.setAttribute('aria-label','Teacher registration link');panel.append(url);
     panel.append(btn('Copy registration link','gcc-v8-primary',async()=>{try{await navigator.clipboard.writeText(link());notify(location.hostname==='localhost'?'Copied for local testing. Use your deployed website address for teachers.':'Link copied. Send it to participating teachers.');}catch{url.focus();url.select();notify('Select and copy the link above.',true);}}));
     panel.append(el('p','gcc-v8-help','Teachers choose a session and submit their own school and student names. No invitation codes.'));
   }else panel.append(el('p','gcc-v8-info-box','This session is not open for new registrations.'));
   const c=conf();const section=el('details','gcc-v8-config');section.append(el('summary','','Edit room settings'));
   const f=el('form','gcc-v8-config-form');
   for(const [name,label,val,min,max] of [['rooms','Breakout rooms',c.breakout_rooms,1,60],['capacity','Maximum students',c.max_students,1,2000]]){
     const l=el('label','',label),inp=el('input');inp.name=name;inp.type='number';inp.min=min;inp.max=max;inp.required=true;inp.value=val;l.append(inp);f.append(l);
   }
   const l=el('label','','Facilitators per room'),sel=el('select');sel.name='facs';for(const n of [0,1,2]){const o=el('option','',`${n}`);o.value=n;sel.append(o);}sel.value=c.facilitators_per_room;l.append(sel);f.append(l);
   const save=el('button','gcc-v8-secondary','Save settings');save.type='submit';f.append(save);
   f.addEventListener('submit',async evt=>{evt.preventDefault();const data=new FormData(f);save.disabled=true;try{await updateSettings({rooms:Number(data.get('rooms')),maxStudents:Number(data.get('capacity')),facilitatorsPerRoom:Number(data.get('facs'))});}catch(err){notify(err.message,true);}finally{save.disabled=false;}});
   section.append(f);panel.append(section);
 }
 function stageRosters(panel,e){const list=party();const pending=list.filter(s=>s.status==='pending');
   panel.append(el('div','gcc-v8-summary',`${pending.length} waiting · ${list.filter(s=>s.status==='approved').length} approved`));
   if(!list.length){panel.append(el('p','gcc-v8-info-box','No schools have registered yet. Share the link from the previous step.'));return;}
   for(const s of list){const card=el('article','gcc-v8-school-card');const n=(s.students||[]).length;
     card.append(el('h3','',`${s.school_name} · ${s.country_name}`),el('p','gcc-v8-help',`${s.teacher_name} · ${n} students · ${s.status}`));
     const details=el('details');details.append(el('summary','','View student names'));
     for(const st of s.students||[])details.append(el('div','gcc-v8-name',`${st.name}${st.grade?' · '+st.grade:''}`));
     details.append(el('p','gcc-v8-help',`Facilitators: ${(s.facilitators||[]).join(', ')||'None'}`));card.append(details);
     const actions=el('div','gcc-v8-actions');if(s.status!=='declined')actions.append(btn('Edit names','gcc-v8-secondary',()=>openEdit(s)));
     if(s.status==='pending'){
       actions.append(btn('Decline','gcc-v8-secondary',()=>review(s,false)),btn('Approve','gcc-v8-primary',()=>review(s,true)));
     }card.append(actions);panel.append(card);
   }
 }
 function stageRooms(panel,e){
   const mount=el('div','gcc-v9-mount');panel.append(mount);
   mountRoomPlannerV9({root:mount,event:e,settings:conf(),signups:party()});
 }
 function stageShare(panel){
   const session=current();const eventId=session?.id;
   const page=el('section','gcc-v8-share');panel.append(page);
   const title=el('h3','','Share the final seating plan');page.append(title);
   const guide=el('div','gcc-v8-share-notice','Only a saved room arrangement can be shared. Each student must enter their name and school to see their own room.');page.append(guide);
   const body=el('div','gcc-v8-share-card');body.append(el('p','gcc-v8-share-small','Checking the saved arrangement and sharing status…'));page.append(body);
   function repaintStatus(){
     body.replaceChildren();const line=el('p','gcc-v8-share-small','Checking saved arrangement…');body.append(line);
     Promise.all([fetchRoomDraft(eventId),getRoomShareStatus(eventId)]).then(([saved,shared])=>{
       if(!body.isConnected||current()?.id!==eventId)return;
       body.replaceChildren();
       if(!saved?.draft||!saved?.revision){
         body.append(el('div','gcc-v8-share-notice','No plan has been published. First finish and save your room arrangement in Step 3.'));
         body.append(btn('← Back to Arrange rooms','gcc-v8-secondary',()=>{activeStage=2;paint();}));return;
       }
       const revision=Number(saved.revision);
       body.append(el('div','gcc-v8-share-good',`✓ Saved arrangement ready · Revision ${revision}`));
       if(shared?.is_active){
         const upToDate=shared.up_to_date===true;
         body.append(el('p',upToDate?'gcc-v8-share-good':'gcc-v8-share-notice',
           upToDate?'Seating plan is published. Keep the private link with your teachers.':'Room assignments changed after publishing. The old link no longer shows rooms. Publish a new link below.'));
         body.append(el('p','gcc-v8-share-small','Old links are not recoverable here. Publishing again creates a new private link and revokes the previous one.'));
       }
       const form=el('form','');const label=el('label','','Zoom meeting link (HTTPS)');
       const url=el('input');url.type='url';url.required=true;url.placeholder='https://zoom.us/j/123456789';url.maxLength=2000;url.value=shared?.zoom_url||'';
       label.append(url);form.append(label);
       const bar=el('div','gcc-v8-share-actions');
       const publish=el('button','gcc-v102-primary',shared?.is_active?'Create a new private link →':'Publish seating plan →');publish.type='submit';bar.append(publish);
       if(shared?.is_active){const revoke=btn('Revoke previous link','gcc-v8-secondary',async()=>{
         if(!confirm('Disable the current seating-plan link? Students will no longer be able to open it.'))return;
         revoke.disabled=true;try{await revokeRoomShare(eventId);shareToken='';shareEvent='';notify('Previous link revoked.');repaintStatus();}
         catch(err){notify(`Could not revoke: ${err.message}`,true);revoke.disabled=false;}});bar.append(revoke);}
       form.append(bar);body.append(form);
       form.addEventListener('submit',async evt=>{evt.preventDefault();
         const raw=url.value.trim();let parsed;try{parsed=new URL(raw);}catch{notify('Enter a valid Zoom URL.',true);return;}
         if(parsed.protocol!=='https:' || !(parsed.hostname==='zoom.us'||parsed.hostname.endsWith('.zoom.us'))){notify('Use an HTTPS zoom.us meeting link.',true);return;}
         if(!confirm('Publish this saved room arrangement? A new private link will replace any previous link.'))return;
         publish.disabled=true;
         try{const result=await publishRoomShare(eventId,revision,raw);shareToken=result.token;shareEvent=eventId;
           notify('✓ Seating-plan link published. Copy and share it privately with your teachers.');repaintStatus();}
         catch(err){notify(`Could not publish: ${err.message}`,true);publish.disabled=false;}
       });
       if(shareEvent===eventId && shareToken){
         const secret=el('section','gcc-v8-share-secret');secret.append(el('strong','','Private seating-plan link — copy it now'));
         const shareUrl=`${location.origin}${location.pathname}#/room-plan?key=${encodeURIComponent(shareToken)}`;
         const copyField=el('input');copyField.readOnly=true;copyField.value=shareUrl;copyField.setAttribute('aria-label','Private seating-plan link');secret.append(copyField);
         secret.append(btn('Copy private link','gcc-v102-primary',async()=>{
           try{await navigator.clipboard.writeText(shareUrl);notify('✓ Private link copied.');}
           catch{copyField.focus();copyField.select();notify('Select and copy the link above.',true);}
         }));
         secret.append(el('p','gcc-v8-share-small','Share only with participating teachers and students. Anyone with this link and a matching name + school can see that student’s room and Zoom link.'));
         body.append(secret);
       }
     }).catch(err=>{if(body.isConnected){body.replaceChildren(el('div','gcc-v8-share-notice',`Could not load saved plan or sharing settings: ${err.message}. Please check the V10.2 Supabase SQL.`));}});
   }
   repaintStatus();
 }
 function paint(){const e=current(),panel=$('gcc-v8-host-panel');panel.replaceChildren();currentLabel();root.dataset.popStep=String(activeStage);
   $('gcc-v8-focus').hidden=!e;if(!e)return;
   const titles=['Invite teachers','Review registrations','Arrange rooms','Share final plan'];
   const details=['Publish your session, then copy one registration link.','Check each school and approve its student list.','Mix students and prepare your breakout rooms.','Publish your finished room chart and Zoom link.'];
   $('gcc-v8-stage-counter').textContent=`STEP ${activeStage+1} OF 4`;
   $('gcc-v8-stage-title').textContent=titles[activeStage];$('gcc-v8-stage-explain').textContent=details[activeStage];
   $('gcc-v8-stage-progress').replaceChildren(...[0,1,2,3].map(n=>el('span',n<=activeStage?'active':'')));
   $('gcc-v8-host-back').hidden=activeStage===0;
   $('gcc-v8-host-next').hidden=activeStage===3;
   $('gcc-v8-host-next').textContent=['Next: Registrations →','Next: Rooms →','Next: Share →'][activeStage]||'';
   if(activeStage===0)stagePrepare(panel,e);if(activeStage===1)stageRosters(panel,e);
   if(activeStage===2)stageRooms(panel,e);if(activeStage===3)stageShare(panel);
 }
 async function reload(resetStage){try{const [e,s,c]=await Promise.all([getEvents(),listSessionSignups(),getSessionSettings()]);events=e||[];settings=c||[];signups=s||[];
   if(!events.some(x=>x.id===activeEventId))activeEventId=events.find(x=>x.status==='published')?.id||events[0]?.id||'';
   if(resetStage)activeStage=0;paint();
 }catch(err){notify('Could not load sessions: '+err.message,true);}}
 async function review(s,yes){if(!confirm(`${yes?'Approve':'Decline'} the registration from ${s.school_name}?`))return;
   try{await reviewSessionSignup(s.id,yes);await reload(false);notify(yes?'Approved. Students added to this session.':'Registration declined.');}catch(err){notify(err.message,true);}}
 function openEdit(s){edit=s;$('gcc-v8-edit-teacher').value=s.teacher_name;$('gcc-v8-edit-error').textContent='';const rows=$('gcc-v8-edit-rows');rows.replaceChildren();
   for(const [i,student] of (s.students||[]).entries()){const row=el('div','gcc-v8-edit-row');row.dataset.studentId=student.id;row.append(el('span','',`${i+1}.`));
     const input=el('input');input.value=student.name;input.maxLength=120;input.required=true;input.setAttribute('aria-label',`Student ${i+1} name`);input.name='student_name';row.append(input);
     const grade=el('input');grade.value=student.grade||'';grade.maxLength=40;grade.name='student_grade';grade.setAttribute('aria-label',`Student ${i+1} grade`);row.append(grade);rows.append(row);
   }$('gcc-v8-edit-wrap').hidden=false;$('gcc-v8-edit-teacher').focus();}
 function closeEdit(){edit=null;$('gcc-v8-edit-wrap').hidden=true;}
 $('gcc-v8-edit-cancel').addEventListener('click',closeEdit);
 $('gcc-v8-edit-form').addEventListener('submit',async evt=>{evt.preventDefault();if(!edit)return;
   const teacher=$('gcc-v8-edit-teacher').value.trim();const students=[...root.querySelectorAll('.gcc-v8-edit-row')].map(x=>({id:x.dataset.studentId,name:x.querySelector('[name=student_name]').value.trim(),grade:x.querySelector('[name=student_grade]').value.trim()}));
   if(!englishName(teacher)||students.some(s=>!englishName(s.name))){$('gcc-v8-edit-error').textContent='Use English A–Z spelling for every name.';return;}
   const submit=evt.currentTarget.querySelector('[type=submit]');submit.disabled=true;
   try{await updateRegistrationNames(edit.id,teacher,students);closeEdit();await reload(false);notify('Names saved.');}
   catch(err){$('gcc-v8-edit-error').textContent=err.message;}finally{submit.disabled=false;}
 });
 $('gcc-v8-new').addEventListener('click',()=>{$('gcc-v8-create-wrap').hidden=false;$('gcc-v8-create').querySelector('[name=title]').focus();});
 $('gcc-v8-cancel-new').addEventListener('click',()=>{$('gcc-v8-create-wrap').hidden=true;});
 $('gcc-v8-create').addEventListener('submit',async evt=>{evt.preventDefault();const f=evt.currentTarget;const d=new FormData(f);
   const date=String(d.get('date')||''),time=String(d.get('time')||''),timezone=String(d.get('timezone')||'Asia/Tokyo'),title=String(d.get('title')||'').trim();
   const stamp=toUtc(date,time,timezone);if(stamp.error){notify(stamp.error,true);return;}if(Date.parse(stamp.iso)<=Date.now()){notify('Choose a future time.',true);return;}
   const button=f.querySelector('[type=submit]');button.disabled=true;
   try{const created=await addEvent({title,startsAt:stamp.iso,timezone,status:'draft'});activeEventId=created.id;activeStage=0;
     await saveSessionSettings({eventId:created.id,rooms:Number(d.get('rooms')),maxStudents:Number(d.get('capacity')),facilitatorsPerRoom:Number(d.get('facs'))});
     $('gcc-v8-create-wrap').hidden=true;f.reset();await reload(false);notify('Session created. Publish it when ready.');}
   catch(err){await reload(false);notify('Could not finish creating session: '+err.message,true);}finally{button.disabled=false;}
 });
 $('gcc-v8-host-select').addEventListener('change',event=>{activeEventId=event.target.value;shareToken='';shareEvent='';activeStage=0;paint();notify('');});
 $('gcc-v8-host-back').addEventListener('click',()=>{activeStage=Math.max(0,activeStage-1);paint();notify('');});
 $('gcc-v8-host-next').addEventListener('click',()=>{activeStage=Math.min(3,activeStage+1);paint();notify('');});
 reload(true);
}
