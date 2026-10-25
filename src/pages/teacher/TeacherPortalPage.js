import '../../styles/teacherSelfService.css';
import {teacherNetworkMarkupV116,mountTeacherNetworkV116} from './TeacherNetworkV116.js';
import {volunteerMarkupV117,mountVolunteerV117} from './VolunteerV117.js';
import {makeSlot} from '../../lib/matching.js';
import {timeRangeV112} from '../../lib/sessionTimeV112.js';
import {teacherIdentity,teacherSessions,teacherRequests,teacherCreateSession,teacherCloseSession,
 teacherApply,teacherReview,teacherSignOut} from '../../services/teacherSelfService.js';

const element=(name,cls='',text='')=>{const n=document.createElement(name);n.className=cls;n.textContent=text;return n;};
const flag=code=>/^[A-Z]{2}$/.test(code||'')?[...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join(''):'🌐';
function fmt(iso,zone){try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}catch{return String(iso||'');}}
function tomorrow(zone){const x=new Date(Date.now()+86400000);try{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(x).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}catch{return x.toISOString().slice(0,10);}}
export function TeacherPortalPage(){return `<section class="gct-workspace gct-portal">
 <header class="gct-banner"><div class="gct-banner-icon">🌍</div><div><p class="gct-eyebrow">GLOBAL CLASSROOM · TEACHER SPACE</p><h2>Connect your classroom</h2><p id="gctp-greeting">Loading your school…</p></div><button id="gctp-logout" type="button" class="gct-secondary gct-logout">Sign out</button></header>
 <nav class="gct-tabs" aria-label="Teacher actions"><button class="active" type="button" data-gct-tab="home">✦ Home</button><button type="button" data-gct-tab="create">＋ Register a Session</button><button type="button" data-gct-tab="find">⌕ Find a Session <span id="gctp-open-count"></span></button><button type="button" data-gct-tab="requests">✉ My Requests <span id="gctp-request-count"></span></button><button type="button" data-gct-tab="network">🌍 Teacher Network</button><button type="button" data-gct-tab="volunteer">🤝 Volunteer for GC</button></nav>
 <p id="gctp-message" class="gct-feedback" role="status" aria-live="polite"></p>
 <section class="gct-section gcc117-teacher-home" data-gct-view="home"><h3>What would you like to do today?</h3><p>Choose your next Global Classroom adventure.</p><div class="gcc117-home-cards">
 <button type="button" class="gcc117-home-card" data-gct-open="create"><span>📅</span><strong>Host a Session</strong><small>Choose your local date and time, introduce your students and publish an exchange.</small></button>
 <button type="button" class="gcc117-home-card" data-gct-open="find"><span>🌐</span><strong>Find a Session</strong><small>Discover partner schools, with meeting times shown in your time zone.</small></button>
 <button type="button" class="gcc117-home-card" data-gct-open="volunteer"><span>🎙️</span><strong>Be a Facilitator or GC Host</strong><small>Offer to help with Global Classroom-hosted events.</small></button></div></section>
 <div class="gct-section" data-gct-view="create" hidden><div class="gct-two-col"><form id="gctp-create" class="gct-panel gct-form" novalidate>
   <div class="gct-section-head"><span>01</span><div><h3>Share your available time</h3><p>Choose when your class can welcome a partner.</p></div></div>
   <div class="gct-wizard-progress"><span id="gctp-form-step">Step 1 of 3</span><div><span id="gctp-form-progress"></span></div></div>
   <section data-gctp-form-section="0" class="gct-form-section"><div class="gct-fields"><label>Date *<input id="gctp-date" type="date" required></label><label>Time zone *<input id="gctp-zone" readonly required></label></div>
   <div class="gct-fields"><label>From *<input id="gctp-from" type="time" value="09:00" required></label><label>Until *<input id="gctp-to" type="time" value="10:00" required></label></div></section>
   <section data-gctp-form-section="1" class="gct-form-section" hidden><div class="gct-fields"><label>Students *<input id="gctp-students" type="number" min="1" max="500" value="20" required></label><label>Breakout rooms *<input id="gctp-rooms" type="number" min="1" max="100" value="4" required></label></div>
   <label>School level *<select id="gctp-band"><option value="Upper Secondary">High school</option><option value="Lower Secondary">Junior high</option><option value="Primary">Primary</option><option value="University">University</option><option value="Mixed">Mixed</option></select></label>
   <label>Topic (optional)<input id="gctp-topic" maxlength="120" placeholder="e.g. Food, Culture, Environment"></label>
   <label>Notes to prospective partners (optional)<textarea id="gctp-notes" rows="2" maxlength="500"></textarea></label></section>
   <section data-gctp-form-section="2" class="gct-form-section" hidden><div class="gct-review" id="gctp-review"></div>
     <p class="gct-hint">Publishing makes your session visible to approved teachers. No email or meeting link is created automatically.</p></section>
   <div class="gct-form-actions"><button type="button" id="gctp-back" class="gct-secondary" hidden>← Back</button>
     <button type="button" id="gctp-next" class="gct-primary">Continue →</button>
     <button class="gct-primary" id="gctp-publish" type="submit" hidden>Publish session ✓</button></div>
 </form><aside class="gct-panel"><div class="gct-section-head"><span>02</span><div><h3>Your upcoming sessions</h3><p>Only you can close sessions you created.</p></div></div><div id="gctp-mine" class="gct-card-list"></div></aside></div></div>
 <div class="gct-section" data-gct-view="find" hidden><div class="gct-section-head"><span>⌕</span><div><h3>Find an international exchange</h3><p>Session times are shown in your own time zone.</p></div></div>
   <div class="gct-filterbar"><label>Available date (optional)<input id="gctp-find-date" type="date"></label><label>From<input id="gctp-find-from" type="time" value="09:00"></label><label>Until<input id="gctp-find-to" type="time" value="12:00"></label><label>Country<select id="gctp-find-country"><option value="">Any country</option></select></label><label>School level<select id="gctp-find-band"><option value="">Any level</option><option value="Primary">Primary / Elementary</option><option value="Lower Secondary">Junior high</option><option value="Upper Secondary">High school</option><option value="University">University</option><option value="Mixed">Mixed ages</option></select></label><label>Topic<input id="gctp-find-topic" placeholder="Any topic"></label><button id="gctp-find-button" type="button" class="gct-primary">Search sessions →</button></div>
   <div class="gct-section-subhead"><h3>Available sessions</h3><span id="gctp-search-count"></span></div><div id="gctp-results" class="gct-results"></div>
 </div>
 <div class="gct-section" data-gct-view="requests" hidden><div class="gct-section-head"><span>✉</span><div><h3>Join requests</h3><p>Review applications to your sessions, and track the requests you sent.</p></div></div>
 <div class="gct-request-columns"><div class="gct-panel"><h3>Received from other teachers</h3><div id="gctp-incoming" class="gct-card-list"></div></div><div class="gct-panel"><h3>Requests you sent</h3><div id="gctp-outgoing" class="gct-card-list"></div></div></div>
 <p class="gct-hint">Approval records interest only. Agree on the final arrangements separately; no notification, Zoom link, or event is automatically sent.</p></div>
 <section class="gct-section" data-gct-view="network" hidden>${teacherNetworkMarkupV116()}</section>
 <section class="gct-section" data-gct-view="volunteer" hidden>${volunteerMarkupV117()}</section>
 </section>`;}

export function bindTeacherPortalPage(){
 const root=document.querySelector('.gct-portal');if(!root)return;
 const $=id=>root.querySelector('#'+id),notice=$('gctp-message');
 let identity=null,offers=[],requests=[],mode='home',formStep=0;
 const inform=(value,error=false)=>{notice.textContent=value;notice.classList.toggle('error',error);};
 const display=(id)=>{for(const view of root.querySelectorAll('[data-gct-view]'))view.hidden=view.dataset.gctView!==id;
   for(const tab of root.querySelectorAll('[data-gct-tab]')){const active=tab.dataset.gctTab===id;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));}mode=id;};
 function showFormStep(index){
  formStep=index;
  for(const section of root.querySelectorAll('[data-gctp-form-section]'))section.hidden=Number(section.dataset.gctpFormSection)!==index;
  $('gctp-form-step').textContent=`Step ${index+1} of 3`;$('gctp-form-progress').style.width=`${(index+1)*33.34}%`;
  $('gctp-back').hidden=index===0;$('gctp-next').hidden=index===2;$('gctp-publish').hidden=index!==2;
  if(index===2){const review=$('gctp-review');review.replaceChildren();
   for(const [label,value] of [
    ['Your school',identity?.school||''],['When',`${$('gctp-date').value} · ${$('gctp-from').value}–${$('gctp-to').value}`],
    ['Time zone',identity?.timezone||''],['Class size',`${$('gctp-students').value} students · ${$('gctp-rooms').value} rooms`],
    ['School level',$('gctp-band').selectedOptions[0]?.textContent||''],['Topic',$('gctp-topic').value||'Open exchange']
   ]){const row=element('div','gct-review-line');row.append(element('span','',label),element('strong','',value));review.append(row);}
  }
 }
 function validateFormStep(i){
  if(!identity)return 'Teacher profile not loaded yet.';
  if(i===0){const slot=makeSlot({date:$('gctp-date').value,startTime:$('gctp-from').value,endTime:$('gctp-to').value,timezone:identity.timezone});
   if(slot.error)return slot.error;if(Date.parse(slot.startsAt)<=Date.now())return 'Choose a future date and time.';
  }else if(i===1){const n=Number($('gctp-students').value),r=Number($('gctp-rooms').value);
   if(!Number.isInteger(n)||n<1||n>500)return 'Enter a student count between 1 and 500.';
   if(!Number.isInteger(r)||r<1||r>100)return 'Enter 1 to 100 breakout rooms.';
  }return '';
 }
 $('gctp-next').addEventListener('click',()=>{const error=validateFormStep(formStep);if(error){inform(error,true);return;}inform('');showFormStep(Math.min(2,formStep+1));});
 $('gctp-back').addEventListener('click',()=>{inform('');showFormStep(Math.max(0,formStep-1));});
 const upcoming=()=>offers.filter(o=>new Date(o.ends_at).getTime()>Date.now());
 async function refresh(){
  const [mine,applications]=await Promise.all([teacherSessions(),teacherRequests()]);
  offers=Array.isArray(mine)?mine:[];requests=Array.isArray(applications)?applications:[];
  $('gctp-open-count').textContent=String(upcoming().filter(o=>o.status==='open'&&!o.is_mine).length);
  $('gctp-request-count').textContent=String(requests.filter(r=>r.direction==='incoming'&&r.status==='pending').length);
  renderMine();renderResults();renderRequests();
 }
 function renderMine(){const list=$('gctp-mine');list.replaceChildren();
  const mine=upcoming().filter(o=>o.is_mine);if(!mine.length){list.append(element('p','gct-empty','No sessions yet. Choose a date and publish your first session.'));return;}
  for(const o of mine){const card=element('article','gct-session-card');card.append(element('strong','',o.topic||'Open classroom exchange'),
    element('p','',`${timeRangeV112(o.starts_at,o.ends_at,identity.timezone)} (${identity.timezone})`),
    element('small','',`${o.student_count} students · ${o.room_count} rooms · ${o.status}`));
    if(o.status==='open'){const close=element('button','gct-secondary','Close session');close.type='button';close.addEventListener('click',async()=>{
     if(!confirm('Close this session to new applicants?'))return;close.disabled=true;try{await teacherCloseSession(o.id);await refresh();inform('Session closed.');}catch(e){inform(e.message,true);close.disabled=false;}
    });card.append(close);}list.append(card);}
 }
 function searchFiltered(){const code=$('gctp-find-country').value,band=$('gctp-find-band').value,topic=$('gctp-find-topic').value.trim().toLowerCase();
   const date=$('gctp-find-date').value;let window=null;
   if(date){window=makeSlot({date,startTime:$('gctp-find-from').value,endTime:$('gctp-find-to').value,timezone:identity.timezone});
    if(window.error){inform(window.error,true);return null;}}
   return upcoming().filter(o=>!o.is_mine&&o.status==='open'&&(!code||o.country_code===code)&&(!band||o.age_band===band)&&
     (!topic||`${o.topic} ${o.school_name} ${o.country_name}`.toLowerCase().includes(topic))&&
     (!window||(new Date(o.starts_at)<new Date(window.endsAt)&&new Date(o.ends_at)>new Date(window.startsAt))));
 }
 function renderResults(){if(!identity)return;const list=$('gctp-results');list.replaceChildren();
  const results=searchFiltered();if(results===null)return;
  $('gctp-search-count').textContent=`${results.length} session${results.length===1?'':'s'}`;
  if(!results.length){list.append(element('p','gct-empty','No sessions match these conditions. Try another date or leave the date blank.'));return;}
  const previously=new Set(requests.filter(r=>r.direction==='outgoing').map(r=>r.offer_id));
  for(const o of results){const card=element('article','gct-session-card');card.append(element('span','gct-eyebrow',`${flag(o.country_code)} ${o.country_name}`),
   element('h3','',o.topic||'Open classroom exchange'),element('p','',`${o.school_name} · ${o.teacher_name}`),
   element('strong','gct-session-time',`${timeRangeV112(o.starts_at,o.ends_at,identity.timezone)} (your local time)`),
   element('small','',`${o.student_count} students · ${o.room_count} rooms · ${o.age_band}`));
   if(previously.has(o.id)){card.append(element('span','gct-status approved','✓ Request already submitted'));}
   else {const detail=element('details','gct-request-form');const summary=element('summary','','Request to Join →');detail.append(summary);
    const input=element('textarea');input.rows=2;input.maxLength=500;input.placeholder='Optional message to the host teacher';input.setAttribute('aria-label','Message to the session host');
    const submit=element('button','gct-primary','Send join request →');submit.type='button';submit.addEventListener('click',async()=>{
     submit.disabled=true;try{await teacherApply(o.id,input.value.trim());await refresh();inform('Request sent! Track it in My Requests. No email was sent.');display('requests');}
     catch(e){inform(e.message||'Request failed.',true);submit.disabled=false;}
    });detail.append(input,submit);card.append(detail);}list.append(card);
  }
 }
 function renderRequests(){const incoming=$('gctp-incoming'),outgoing=$('gctp-outgoing');incoming.replaceChildren();outgoing.replaceChildren();
  const dirs={incoming,outgoing};for(const [direction,list] of Object.entries(dirs)){
   const matches=requests.filter(r=>r.direction===direction);
   if(!matches.length){list.append(element('p','gct-empty','No requests yet.'));continue;}
   for(const r of matches){const card=element('article','gct-session-card');card.append(element('span',`gct-status ${r.status}`,r.status.toUpperCase()),
     element('strong','',direction==='incoming'?`${r.guest_name} would like to join`:`${r.host_name} · ${r.topic||'Open exchange'}`),
     element('small','',fmt(r.starts_at,identity.timezone)));
     if(r.message)card.append(element('p','',r.message));
     if(direction==='incoming'&&r.status==='pending'){
      const actions=element('div','gct-card-actions');for(const [decision,label] of [['approved','Approve interest'],['declined','Decline']]){
       const btn=element('button',decision==='approved'?'gct-primary':'gct-secondary',label);btn.type='button';
       btn.addEventListener('click',async()=>{if(!confirm(`${label}? This does not send a notification.`))return;btn.disabled=true;
         try{await teacherReview(r.id,decision);await refresh();inform(`Request ${decision}.`);}catch(e){inform(e.message,true);btn.disabled=false;}
       });actions.append(btn);}card.append(actions);
     }list.append(card);
   }
  }
 }
 async function init(){try{identity=await teacherIdentity();$('gctp-greeting').textContent=`${flag(identity.country_code)} ${identity.name} · ${identity.school}`;
  $('gctp-zone').value=identity.timezone;$('gctp-date').value=tomorrow(identity.timezone);
  await refresh();inform('');await mountVolunteerV117(root,display);const networkProfile=await mountTeacherNetworkV116(root);if(!networkProfile?.timezone){$('gctp-zone').value='';$('gctp-next').disabled=true;inform('Your school time zone is missing. Ask the host to set it before publishing a session.',true);}}catch(e){inform(e.message||'Could not load teacher profile.',true);}}
 for(const tab of root.querySelectorAll('[data-gct-tab]'))tab.addEventListener('click',()=>display(tab.dataset.gctTab));
 for(const card of root.querySelectorAll('[data-gct-open]'))card.addEventListener('click',()=>display(card.dataset.gctOpen));
 $('gctp-create').addEventListener('submit',async e=>{e.preventDefault();if(!identity)return;
   const slot=makeSlot({date:$('gctp-date').value,startTime:$('gctp-from').value,endTime:$('gctp-to').value,timezone:identity.timezone});
   if(slot.error){inform(slot.error,true);return;}if(Date.parse(slot.startsAt)<=Date.now()){inform('Choose a future date and time.',true);return;}
   const data={zone:identity.timezone,students:Number($('gctp-students').value),rooms:Number($('gctp-rooms').value),band:$('gctp-band').value,topic:$('gctp-topic').value.trim(),notes:$('gctp-notes').value.trim()};
   if(!Number.isInteger(data.students)||data.students<1||data.students>500||!Number.isInteger(data.rooms)||data.rooms<1||data.rooms>100){inform('Check student and room counts.',true);return;}
   const btn=$('gctp-publish');btn.disabled=true;
   try{await teacherCreateSession(slot,data);await refresh();inform('Session published to approved teachers. No email sent.');showFormStep(0);display('create');}
   catch(err){inform(err.message||'Could not publish the session.',true);}finally{btn.disabled=false;}
 });
 $('gctp-find-button').addEventListener('click',()=>{inform('');renderResults();});
 $('gctp-find-country').addEventListener('change',renderResults);$('gctp-find-band').addEventListener('change',renderResults);
 $('gctp-logout').addEventListener('click',async()=>{try{await teacherSignOut();window.location.hash='#/teacher-access';}catch(e){inform(e.message,true);}});
 const view=new URLSearchParams(window.location.hash.split('?')[1]||'').get('view');
 showFormStep(0);display(['home','create','find','volunteer','network','requests'].includes(view)?view:'home');init().then(()=>{if(!identity)return;const select=$('gctp-find-country');const codes=new Map(upcoming().filter(o=>!o.is_mine).map(o=>[o.country_code,o.country_name]));
  for(const [code,label] of [...codes].sort((a,b)=>a[1].localeCompare(b[1]))){const opt=element('option','',label);opt.value=code;select.append(opt);}
 }).catch(e=>inform(e.message,true));
}
