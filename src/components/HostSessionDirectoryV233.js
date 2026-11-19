// GCC V23.3 — accessible, low-color Host Admin session directory.
import {loadHostSessionDirectoryV233,updateHostTeacherSessionV233,deleteHostSessionV233} from '../services/hostSessionDirectoryV233.js';
import {filterHostSessionsV233} from '../lib/hostSessionDirectoryV233.js';
import {timePartsV112} from '../lib/sessionTimeV112.js';
import {makeSlot,toUtc} from '../lib/matching.js';
import {canRemoveSessionV105} from '../lib/sessionDeletionV105.js';
import '../styles/hostSessionDirectoryV233.css';

const el=(tag,cls='',value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;};
const dateView=(iso,zone)=>{if(!iso)return 'Not scheduled';try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone||'UTC',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}catch{return 'Time unavailable';}};
const localDateTime=(iso,zone)=>{try{const p=timePartsV112(iso,zone||'UTC');return {date:p.date,time:p.time,input:p.date+'T'+p.time};}catch{return {date:'',time:'',input:''};}};
const shownStatus=x=>x==='open'?'Open':x==='closed'?'Closed':x==='published'?'Published':x==='draft'?'Draft':x==='completed'?'Completed':x||'Unknown';
const formatSource=x=>x==='teacher'?'Teacher-hosted':'GCC Host';

export function mountHostSessionDirectoryV233(mount,{onSelectEvent=()=>{},onChange=()=>{}}={}){
 if(!mount)return {refresh:async()=>{}};
 mount.innerHTML=[
  '<section class="gcc-v233-directory" aria-label="All registered sessions">',
  '<header class="gcc-v233-head"><div><h2>All registered sessions</h2>',
  '<p>Sessions published by teachers and GCC Host Admin, including past records.</p></div>',
  '<button type="button" class="gcc-v233-refresh" id="gcc-v233-refresh">Refresh</button></header>',
  '<div class="gcc-v233-metrics" id="gcc-v233-metrics" aria-label="Session totals"></div>',
  '<div class="gcc-v233-filters" role="search">',
  '<label>Search<input id="gcc-v233-query" type="search" placeholder="Session, teacher, school, country"></label>',
  '<label>Type<select id="gcc-v233-source"><option value="all">All types</option><option value="teacher">Teacher-hosted</option><option value="host">GCC Host</option></select></label>',
  '<label>Status<select id="gcc-v233-status"><option value="all">All statuses</option><option value="open">Open</option><option value="closed">Closed</option><option value="published">Published</option><option value="draft">Draft</option><option value="completed">Completed</option></select></label>',
  '<label>When<select id="gcc-v233-period"><option value="all">All dates</option><option value="upcoming">Upcoming</option><option value="past">Past</option></select></label></div>',
  '<div class="gcc-v233-result-bar"><strong id="gcc-v233-count">Loading sessions…</strong><span>Times shown in each host school’s time zone</span></div>',
  '<div id="gcc-v233-list" class="gcc-v233-list" aria-live="polite"></div>',
  '<div class="gcc-v233-more"><button id="gcc-v233-more" type="button" hidden>Show more sessions</button></div>',
  '<p id="gcc-v233-notice" class="gcc-v233-notice" role="status" aria-live="polite"></p>',
  '<dialog id="gcc-v233-edit" class="gcc-v233-dialog" aria-labelledby="gcc-v233-edit-title">',
  '<form id="gcc-v233-edit-form"><h2 id="gcc-v233-edit-title">Edit teacher session</h2>',
  '<p class="gcc-v233-help">Changes to the schedule or status may notify joined teachers. The host school and time zone remain unchanged.</p>',
  '<div class="gcc-v233-edit-grid">',
  '<label class="wide">Session title<input name="title" required minlength="3" maxlength="120"></label>',
  '<label>Date<input name="date" type="date" required></label>',
  '<label>Start<input name="from" type="time" required></label>',
  '<label>End<input name="until" type="time" required></label>',
  '<label>Registration deadline<input name="deadline" type="datetime-local"></label>',
  '<label>Host students<input name="students" type="number" min="1" max="500" required></label>',
  '<label>Breakout rooms<input name="rooms" type="number" min="1" max="100" required></label>',
  '<label>Maximum total participants<input name="capacity" type="number" min="1" max="2000" required></label>',
  '<label>Status<select name="status"><option value="open">Open</option><option value="closed">Closed</option></select></label>',
  '<label class="wide">Topic<input name="topic" maxlength="120"></label>',
  '<label class="wide">Notes<textarea name="notes" maxlength="500" rows="3"></textarea></label></div>',
  '<p id="gcc-v233-edit-error" class="gcc-v233-error" role="alert"></p>',
  '<div class="gcc-v233-dialog-actions"><button type="button" data-cancel="edit">Cancel</button><button class="primary" type="submit">Save changes</button></div></form></dialog>',
  '<dialog id="gcc-v233-delete" class="gcc-v233-dialog" aria-labelledby="gcc-v233-delete-title">',
  '<form id="gcc-v233-delete-form"><h2 id="gcc-v233-delete-title">Delete session</h2>',
  '<p class="gcc-v233-help" id="gcc-v233-delete-desc"></p>',
  '<p class="gcc-v233-warning">This cannot be undone from the dashboard. Sessions with join requests cannot be permanently removed here; close them instead.</p>',
  '<label>Type the exact title to confirm<input name="confirmation" autocomplete="off" required></label>',
  '<p id="gcc-v233-delete-error" class="gcc-v233-error" role="alert"></p>',
  '<div class="gcc-v233-dialog-actions"><button type="button" data-cancel="delete">Cancel</button><button type="submit" class="danger">Delete permanently</button></div></form></dialog>',
  '</section>'
 ].join('');
 const $=id=>mount.querySelector('#'+id);
 let records=[],visible=12,editing=null,deleting=null,loading=false;
 const notify=(message,isError=false)=>{const n=$('gcc-v233-notice');n.textContent=message||'';n.classList.toggle('error',isError);};
 const filters=()=>({query:$('gcc-v233-query').value,source:$('gcc-v233-source').value,
   status:$('gcc-v233-status').value,period:$('gcc-v233-period').value});
 const action=(text,klass,click)=>{const b=el('button',klass,text);b.type='button';b.addEventListener('click',click);return b;};
 function metrics(){
   const total=records.length,upcoming=records.filter(x=>Date.parse(x.end)>Date.now()).length;
   const teachers=records.filter(x=>x.source==='teacher').length,hosts=total-teachers;
   const target=$('gcc-v233-metrics');target.replaceChildren();
   for(const [label,value] of [['All sessions',total],['Upcoming',upcoming],['Teacher-hosted',teachers],['GCC Host',hosts]]){
     const card=el('div','gcc-v233-metric');card.append(el('strong','',value),el('span','',label));target.append(card);
   }
 }
 function render(){
   metrics();
   const found=filterHostSessionsV233(records,filters());
   const list=$('gcc-v233-list');list.replaceChildren();
   $('gcc-v233-count').textContent=found.length+' matching sessions';
   const header=el('div','gcc-v233-row gcc-v233-table-head');
   for(const txt of ['Session','Host / school','Date & time','Status','Actions'])header.append(el('span','',txt));
   list.append(header);
   if(!found.length){
     list.append(el('p','gcc-v233-empty',records.length?'No sessions match these filters.':'No registered sessions yet.'));
   }
   for(const record of found.slice(0,visible)){
     const row=el('article','gcc-v233-row');
     const title=el('div','gcc-v233-primary');
     title.append(el('strong','',record.title),el('small','',formatSource(record.source)+' · '+(record.country||'Country not specified')));
     const owner=el('div','gcc-v233-owner');
     owner.append(el('strong','',record.teacher),el('small','',record.school));
     const when=el('div','gcc-v233-when');
     when.append(el('span','',dateView(record.start,record.timezone)),el('small','',record.timezone||'UTC'));
     const state=el('div','gcc-v233-state');
     const status=el('span','gcc-v233-status',shownStatus(record.status));
     status.dataset.status=record.status||'unknown';state.append(status);
     const actions=el('div','gcc-v233-row-actions');
     actions.append(action('Edit','gcc-v233-link',()=>record.source==='host'?onSelectEvent(record.id):openEdit(record)));
     const canDelete=record.source==='teacher'?record.requestStats.count===0:canRemoveSessionV105(record.original);
     if(canDelete)actions.append(action('Delete','gcc-v233-remove',()=>openDelete(record)));
     else if(record.source==='teacher'&&record.status==='open'){
       const hint=el('span','gcc-v233-hint','Requests received · edit status to close');actions.append(hint);
     }else if(record.source==='host')actions.append(el('span','gcc-v233-hint','Deletion protected'));
     row.append(title,owner,when,state,actions);list.append(row);
   }
   $('gcc-v233-more').hidden=found.length<=visible;
   $('gcc-v233-more').textContent='Show more ('+Math.max(0,found.length-visible)+' remaining)';
 }
 async function refresh(){
   if(loading)return;
   loading=true;$('gcc-v233-refresh').disabled=true;notify('');
   try{records=await loadHostSessionDirectoryV233();render();}
   catch(e){notify('Could not load all sessions: '+(e.message||e),true);if(!records.length)$('gcc-v233-count').textContent='Unable to load sessions';}
   finally{loading=false;$('gcc-v233-refresh').disabled=false;}
 }
 function openEdit(record){
   editing=record;const form=$('gcc-v233-edit-form'),offer=record.original,zone=record.timezone;
   const start=localDateTime(offer.starts_at,zone),end=localDateTime(offer.ends_at,zone);
   const deadline=localDateTime(offer.session_details?.registration_closes_at,zone);
   const set=(name,value)=>{form.elements.namedItem(name).value=String(value??'');};
   set('title',record.title);set('date',start.date);set('from',start.time);set('until',end.time);
   set('deadline',deadline.input);set('students',offer.student_count);set('rooms',offer.room_count);
   set('capacity',offer.session_details?.max_participants||'');
   set('topic',offer.topic);set('notes',offer.notes);set('status',offer.status);
   $('gcc-v233-edit-error').textContent='';
   $('gcc-v233-edit').showModal();
 }
 function openDelete(record){
   deleting=record;$('gcc-v233-delete-form').reset();
   $('gcc-v233-delete-desc').textContent='Session: '+record.title;
   $('gcc-v233-delete-error').textContent='';
   $('gcc-v233-delete').showModal();
 }
 $('gcc-v233-edit-form').addEventListener('submit',async event=>{
   event.preventDefault();if(!editing)return;
   const form=event.currentTarget,offer=editing.original,zone=editing.timezone;
   const get=name=>String(form.elements.namedItem(name).value||'').trim();
   const slot=makeSlot({date:get('date'),startTime:get('from'),endTime:get('until'),timezone:zone});
   const err=$('gcc-v233-edit-error');
   if(slot.error){err.textContent=slot.error;return;}
   let deadline='';
   if(get('deadline')){
     const input=get('deadline'),parsed=toUtc(input.slice(0,10),input.slice(11),zone);
     if(parsed.error){err.textContent=parsed.error;return;}deadline=parsed.iso;
   }
   const draft={title:get('title'),topic:get('topic'),notes:get('notes'),students:get('students'),
     rooms:get('rooms'),capacity:get('capacity'),status:get('status'),
     startsAt:slot.startsAt,endsAt:slot.endsAt,deadline};
   const scheduleChanged=Date.parse(draft.startsAt)!==Date.parse(offer.starts_at)||
     Date.parse(draft.endsAt)!==Date.parse(offer.ends_at);
   if(scheduleChanged&&editing.requestStats.approved>0&&!confirm(
     'Approved schools already joined. Changing the time will require reconfirmation. Continue?'))return;
   const button=form.querySelector('[type=submit]');button.disabled=true;err.textContent='';
   try{
     await updateHostTeacherSessionV233(editing,draft);
     $('gcc-v233-edit').close();editing=null;await refresh();
     notify('Session updated successfully.');onChange();
   }catch(e){err.textContent=e.message||'Could not save.';}
   finally{button.disabled=false;}
 });
 $('gcc-v233-delete-form').addEventListener('submit',async event=>{
   event.preventDefault();if(!deleting)return;
   const form=event.currentTarget,button=form.querySelector('[type=submit]');
   const err=$('gcc-v233-delete-error');
   button.disabled=true;err.textContent='';
   try{
     await deleteHostSessionV233(deleting,String(form.elements.namedItem('confirmation').value||'').trim());
     $('gcc-v233-delete').close();deleting=null;await refresh();
     notify('Session deleted.');onChange();
   }catch(e){err.textContent=e.message||'Could not delete.';}
   finally{button.disabled=false;}
 });
 mount.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click',()=>{
   const type=b.dataset.cancel;
   $(type==='edit'?'gcc-v233-edit':'gcc-v233-delete').close();
 }));
 for(const id of ['gcc-v233-query','gcc-v233-source','gcc-v233-status','gcc-v233-period'])
   $(id).addEventListener(id==='gcc-v233-query'?'input':'change',()=>{visible=12;render();});
 $('gcc-v233-refresh').addEventListener('click',refresh);
 $('gcc-v233-more').addEventListener('click',()=>{visible+=12;render();});
 refresh();
 return {refresh};
}
