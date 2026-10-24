import '../../styles/simpleSessionsV8.css';
import '../../styles/privacyV103.css';
import '../../styles/sharePlanV104.css';
import {mountRoomPlannerV9} from '../../components/RoomPlannerV9.js';
import {getEvents,addEvent,updateEvent} from '../../services/eventService.js';
import {fetchRoomDraft} from '../../services/roomDraftV91.js';
import {getRoomShareStatus,publishRoomShare,getSharedCodeStatus,issueSharedCode,disableSharedCode} from '../../services/sharePlanV102.js';
import {toUtc} from '../../lib/matching.js';
import {getSessionSettings,saveSessionSettings} from '../../services/simpleSessionService.js';
import {listSessionSignups,reviewSessionSignup} from '../../services/sessionRosterService.js';
import {updateRegistrationNames} from '../../services/sessionManagerService.js';
import {englishName} from '../../lib/simpleRoster.js';
import {canRemoveSessionV105} from '../../lib/sessionDeletionV105.js';
import {deleteFinishedSessionV105} from '../../services/sessionDeletionV105.js';
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
  <!-- GCC_V105_SESSION_DELETE: host-only confirmed deletion of finished sessions -->
  <div id="gcc-v105-delete-wrap" class="gcc-v8-modal-cover" hidden>
    <div class="gcc-v8-modal gcc-v105-delete-modal" role="dialog" aria-modal="true" aria-labelledby="gcc-v105-delete-heading">
      <h3 id="gcc-v105-delete-heading">Delete this session?</h3>
      <p id="gcc-v105-delete-summary" class="gcc-v8-help"></p>
      <p class="gcc-v105-delete-warning">The session, its signups, breakout room arrangements and sharing links will disappear. Global school and teacher profiles will remain. A private recovery snapshot will be kept by the administrator.</p>
      <form id="gcc-v105-delete-form">
        <label>Type the exact session title to confirm <input id="gcc-v105-delete-title" type="text" maxlength="140" autocomplete="off" required /></label>
        <p id="gcc-v105-delete-error" class="gcc-v8-error" role="alert" aria-live="polite"></p>
        <div class="gcc-v8-actions"><button type="button" class="gcc-v8-secondary" id="gcc-v105-delete-cancel">Cancel</button><button type="submit" class="gcc-v105-delete-confirm" id="gcc-v105-delete-confirm">Delete session permanently</button></div>
      </form>
    </div>
  </div>
</section>`;}
export function bindSimpleSessionsPage(){
 const root=document.querySelector('.gcc-v8-host');if(!root)return;
 let events=[],settings=[],signups=[],edit=null;
 let shareToken='',shareEvent='';
 let deletingSessionV105=null;
 const current=()=>events.find(x=>x.id===activeEventId);
 const conf=()=>settings.find(s=>s.event_id===activeEventId)||defaultSettings();
 const party=()=>signups.filter(s=>s.event_id===activeEventId);
 const notify=(text,bad=false)=>{$('gcc-v8-host-message').textContent=text;$('gcc-v8-host-message').classList.toggle('bad',bad);};
 const btn=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
 const link=()=>`${location.origin}${location.pathname}#/session-register`;
 function currentLabel(){const p=$('gcc-v8-host-select');p.replaceChildren();$('gcc-v8-current-title').replaceChildren();if(!events.length){const o=el('option','','No sessions yet');o.value='';p.append(o);p.disabled=true;return;}
   p.disabled=false;for(const e of events){const o=el('option','',`${e.title}${e.status==='published'?' · Open':''}`);o.value=e.id;p.append(o);}p.value=activeEventId;
   const x=$('gcc-v8-current-title');x.replaceChildren();const e=current();if(e){
     x.append(el('strong','',e.title),el('span','',`${fmt(e.starts_at,e.timezone)} · ${e.status}`));
     if(canRemoveSessionV105(e))x.append(btn('Delete finished session…','gcc-v105-delete-open',()=>openRemoveSessionV105(e)));
   }
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
   const wrap=el('section','gcc-v104-host');panel.append(wrap);
   const heading=el('div','gcc-v104-host-intro');heading.append(el('h3','','One session. One code. All rooms.'));
   heading.append(el('p','','Publish once, then give everyone the same link and 6-digit code. Participants can view the complete room chart.'));
   wrap.append(heading);
   const body=el('div','gcc-v104-host-body');wrap.append(body);
   let liveToken=shareEvent===eventId?shareToken:'';
   let liveCode='';let busy=false;
   const alertMsg=(text,bad=false)=>notify(text,bad);
   const buildInvite=(code)=>`${session?.title||'Global Classroom'}\nBreakout room chart: ${location.origin}${location.pathname}#/room-plan?key=${liveToken}\nSession code: ${code}\nKeep this invitation within the participating schools.`;
   const copy=async(value,what)=>{try{await navigator.clipboard.writeText(value);alertMsg(`${what} copied.`);}
      catch{alertMsg('Clipboard not available. Please select and copy the information.',true);}};
   async function refresh(){
     body.replaceChildren(el('p','gcc-v104-loading','Checking your published room chart…'));
     try{
       const [draft,pub,gate]=await Promise.all([fetchRoomDraft(eventId),getRoomShareStatus(eventId),getSharedCodeStatus(eventId).catch(()=>({needsDatabase:true,ready:false}))]);
       if(!body.isConnected||current()?.id!==eventId)return;
       body.replaceChildren();
       const revision=Number(draft?.revision||0);
       if(!revision){body.append(el('p','gcc-v104-note','No saved rooms yet. Go back to Step 3 to arrange and save them.'));return;}
       const upToDate=pub?.is_active===true && pub.up_to_date===true;
       const ready=upToDate && gate?.ready===true;
       const sectionOne=el('section','gcc-v104-host-card');
       const oneHead=el('div','gcc-v104-card-title');oneHead.append(el('span','gcc-v104-number','1'),el('h4','','Publish your rooms'));
       sectionOne.append(oneHead);
       if(upToDate && liveToken){
         sectionOne.append(el('p','gcc-v104-good','✓ Current room arrangement is published.'));
         sectionOne.append(el('p','gcc-v104-meta',`Saved revision ${revision} · Zoom link connected`));
         const details=el('details','gcc-v104-secondary-details');details.append(el('summary','','Change the Zoom link or replace the private link'));
         addPublishForm(details,pub,revision);sectionOne.append(details);
       }else if(upToDate){
         sectionOne.append(el('p','gcc-v104-note','The private invitation link was not kept on this device. Create a fresh link to share it again.'));
         addPublishForm(sectionOne,pub,revision);
       }else{
         sectionOne.append(el('p','gcc-v104-note',pub?.is_active?'Rooms have changed. Publish the current arrangement.':'A saved room chart is ready to publish.'));
         addPublishForm(sectionOne,pub,revision);
       }
       body.append(sectionOne);
       const sectionTwo=el('section','gcc-v104-host-card');
       const twoHead=el('div','gcc-v104-card-title');twoHead.append(el('span','gcc-v104-number','2'),el('h4','','Share one invitation'));
       sectionTwo.append(twoHead);
       if(gate?.needsDatabase){sectionTwo.append(el('p','gcc-v104-note','V10.4 database update is not installed yet. Finish the SQL update before sharing.'));}
       else if(!upToDate || !liveToken){sectionTwo.append(el('p','gcc-v104-muted','Create the private invitation link in Step 1 first.'));}
       else if(!ready){
         sectionTwo.append(el('p','gcc-v104-muted','Generate one 6-digit code for everyone. No individual student codes.'));
         sectionTwo.append(btn('Create 6-digit session code →','gcc-v104-primary',async()=>{await createCode(false);}));
       }else{
         sectionTwo.append(el('p','gcc-v104-good','✓ Session code is active.'));
         if(gate?.expires_at){const until=new Date(gate.expires_at);sectionTwo.append(el('p','gcc-v104-meta',`Valid until ${Number.isNaN(until.getTime())?'the scheduled expiry':until.toLocaleString()}`));}
       }
       if(liveToken && liveCode && ready){
         const summary=el('div','gcc-v104-invitation');summary.append(el('p','gcc-v104-meta','ONE CODE FOR THE WHOLE SESSION'));
         summary.append(el('strong','gcc-v104-bigcode',liveCode));
         summary.append(btn('Copy invitation (link + code)','gcc-v104-primary',()=>copy(buildInvite(liveCode),'Invitation')));
         sectionTwo.append(summary);
       }else if(ready){
         sectionTwo.append(el('p','gcc-v104-muted','The code and private link are shown only when created. If you did not save them, use the replacement options below.'));
       }
       if(upToDate && liveToken){
         const extra=el('details','gcc-v104-secondary-details');extra.append(el('summary','','Replace or disable access'));
         const buttons=el('div','gcc-v104-small-actions');
         buttons.append(btn('Replace 6-digit code','gcc-v8-secondary',()=>createCode(true)));
         buttons.append(btn('Disable session code','gcc-v8-secondary',async()=>{
           if(!confirm('Stop participants from opening this session chart?'))return;
           try{await disableSharedCode(eventId);liveCode='';alertMsg('Session code disabled.');refresh();}
           catch(err){alertMsg(err.message,true);}
         }));
         extra.append(buttons);sectionTwo.append(extra);
       }
       body.append(sectionTwo);
       function addPublishForm(parent,pub,rev){
         const form=el('form','gcc-v104-publish-form');const label=el('label','','Zoom meeting link');
         const input=el('input');input.type='url';input.required=true;input.value=pub?.zoom_url||'';
         input.placeholder='https://zoom.us/j/123456789';input.maxLength=2000;label.append(input);form.append(label);
         const action=el('button','gcc-v104-primary',upToDate?(liveToken?'Replace private link':'Create fresh invitation link →'):'Publish current rooms →');action.type='submit';form.append(action);
         form.addEventListener('submit',async e=>{
           e.preventDefault();if(busy)return;
           let u;try{u=new URL(input.value.trim());}catch{alertMsg('Enter a valid Zoom link.',true);return;}
           if(u.protocol!=='https:' || !(u.hostname==='zoom.us'||u.hostname.endsWith('.zoom.us'))){alertMsg('Only HTTPS zoom.us links are accepted.',true);return;}
           if(!confirm(upToDate?'Replace the private link? The existing invitation will stop working.':'Publish the current room chart?'))return;
           busy=true;action.disabled=true;
           try{const saved=await publishRoomShare(eventId,rev,input.value.trim());shareToken=saved.token;shareEvent=eventId;liveToken=saved.token;liveCode='';
             alertMsg('Published. Next, create the shared 6-digit code.');await refresh();}
           catch(err){alertMsg(`Could not publish: ${err.message}`,true);action.disabled=false;}
           finally{busy=false;}
         });parent.append(form);
       }
       async function createCode(replace){
         if(busy)return;
         if(replace && !confirm('Replace the session code? The old code will stop working for everyone.'))return;
         busy=true;
         try{const r=await issueSharedCode(eventId);liveCode=String(r?.code||'');
           if(!/^[0-9]{6}$/.test(liveCode))throw Error('The database did not return a 6-digit code.');
           alertMsg(liveToken?'Shared code ready. Copy one invitation for all schools.':'Code created. Your existing private link is not recoverable here; replace the link to create a new invitation.');await refresh();}
         catch(err){alertMsg(`Cannot issue code: ${err.message}`,true);}
         finally{busy=false;}
       }
     }catch(err){if(body.isConnected){body.replaceChildren(el('p','gcc-v104-note',`Could not load sharing status: ${err.message}. Check the V10.4 SQL setup.`));}}
   }
   refresh();
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
 function openRemoveSessionV105(e){
   if(!canRemoveSessionV105(e)){notify('Only drafts and finished sessions may be deleted.',true);return;}
   deletingSessionV105={id:e.id,title:e.title};
   $('gcc-v105-delete-summary').textContent=`Session: ${e.title}`;
   $('gcc-v105-delete-title').value='';
   $('gcc-v105-delete-error').textContent='';
   $('gcc-v105-delete-wrap').hidden=false;
   $('gcc-v105-delete-title').focus();
 }
 function closeRemoveSessionV105(){deletingSessionV105=null;$('gcc-v105-delete-wrap').hidden=true;}
 $('gcc-v105-delete-cancel').addEventListener('click',closeRemoveSessionV105);
 $('gcc-v105-delete-form').addEventListener('submit',async event=>{
   event.preventDefault();
   const selected=deletingSessionV105;
   if(!selected)return;
   const typed=$('gcc-v105-delete-title').value.trim();
   if(typed!==selected.title){$('gcc-v105-delete-error').textContent='Type the exact session title to confirm.';return;}
   const submit=$('gcc-v105-delete-confirm');submit.disabled=true;
   $('gcc-v105-delete-error').textContent='Deleting session…';
   try{
     await deleteFinishedSessionV105(selected.id,selected.title);
     closeRemoveSessionV105();
     shareToken='';shareEvent='';activeEventId='';activeStage=0;
     await reload(true);
     notify('Session deleted. Its private recovery snapshot was saved.');
   }catch(error){$('gcc-v105-delete-error').textContent=error.message||'Could not delete session.';}
   finally{submit.disabled=false;}
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
