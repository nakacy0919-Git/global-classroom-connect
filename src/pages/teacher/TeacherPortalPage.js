import '../../styles/teacherSelfService.css';
import {prepareSuccessChime,showSuccessCelebration} from '../../lib/successCelebrationV142.js';
import {teacherNetworkMarkupV116,mountTeacherNetworkV116} from './TeacherNetworkV116.js';
import {teacherProfileMarkupV153,mountTeacherProfileV153} from './TeacherProfileV153.js';
import {myTeacherProfileV116} from '../../services/teacherNetworkV116.js';
import {volunteerMarkupV117,mountVolunteerV117} from './VolunteerV117.js';
import {makeSlot} from '../../lib/matching.js';
import {timeRangeV112} from '../../lib/sessionTimeV112.js';
import {mountCountryExplorerV151} from '../../lib/sessionCountryMapV151.js';

import {GCC_LEVELS_V150,GCC_SDG_V150,GCC_MODES_V150,detailsV150,sessionTitleV150,partnerLevelsV150,filterOffersV150,sessionDetailsPayloadV150} from '../../lib/sessionStudioV150.js';
import '../../styles/sessionStudioV150.css';
import '../../styles/sessionStudioV151.css';
import {teacherIdentity,teacherSessions,teacherRequests,teacherCreateSession,teacherCloseSession,
 teacherApply,teacherReview,teacherSignOut} from '../../services/teacherSelfService.js';

const element=(name,cls='',text='')=>{const n=document.createElement(name);n.className=cls;n.textContent=text;return n;};
const flag=code=>/^[A-Z]{2}$/.test(code||'')?[...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join(''):'🌐';
function fmt(iso,zone){try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}catch{return String(iso||'');}}
function tomorrow(zone){const x=new Date(Date.now()+86400000);try{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(x).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}catch{return x.toISOString().slice(0,10);}}
export function TeacherPortalPage(){return `<section class="gct-workspace gct-portal">
 <header class="gct-banner"><div class="gct-banner-icon">🌍</div><div><p class="gct-eyebrow">GLOBAL CLASSROOM · TEACHER SPACE</p><h2>Explore. Connect. Inspire.</h2><p id="gctp-greeting">Loading your school…</p></div><button id="gctp-logout" type="button" class="gct-secondary gct-logout">Sign out</button></header>
 <p id="gctp-message" class="gct-feedback" role="status" aria-live="polite"></p>
 <div class="gct-section" data-gct-view="create" hidden><div class="gcs150-create">
 <form id="gctp-create" class="gct-panel gct-form gcs150-wizard" novalidate>
  <div class="gct-section-head"><span>✦</span><div><h3>Create a global classroom session</h3><p>Four quick steps to bring the world into your classroom.</p></div></div>
  <nav class="gcs150-steps" aria-label="Session setup"><span data-gcs150-step-dot="0">1 · Basics</span><span data-gcs150-step-dot="1">2 · Format</span><span data-gcs150-step-dot="2">3 · Topics</span><span data-gcs150-step-dot="3">4 · Review</span></nav>
  <p class="gcs151-step-status" id="gctp-form-step" aria-live="polite">Step 1 of 4 · Tell us when you can connect</p>
  <section class="gct-form-section" data-gctp-form-section="0">
   <div class="gcs150-intro"><h4>Plan your session</h4><p>No need to enter your school or teacher details again.</p></div>
   <label>Session name *<input id="gctp-name" maxlength="120" required placeholder="e.g. Discover school life around the world"></label>
   <div class="gcs150-host"><span aria-hidden="true">🏫</span><div><strong id="gctp-host-school">Loading school…</strong><small id="gctp-host-identity">Approved teacher</small></div><span class="gcs150-verified">✓ Verified</span></div>
   <div class="gct-fields"><label>Date *<input id="gctp-date" type="date" required></label><label>School time zone<input id="gctp-zone" readonly required></label></div>
   <div class="gct-fields"><label>From *<input id="gctp-from" type="time" value="09:00" required></label><label>Until *<input id="gctp-to" type="time" value="10:00" required></label></div>
   <p class="gct-hint">Enter your school's local time. GCC automatically shows matching times to teachers abroad.</p>
  </section>
  <section class="gct-form-section" data-gctp-form-section="1" hidden>
   <div class="gcs150-intro"><h4>Choose your exchange format</h4><p>Pick one illustration, then choose the students you would like to meet.</p></div>
   <div class="gcs150-mode-grid" role="group" aria-label="Session format"><label class="gcs150-mode"><input type="radio" name="gctp-mode" value="device" ><span class="gcs150-mode-art" aria-hidden="true"><img src="/assets/session-formats/device.svg" width="110" height="80" alt="" loading="lazy"></span><strong>Individual devices</strong><small>Each student connects on a device</small></label><label class="gcs150-mode"><input type="radio" name="gctp-mode" value="classroom" checked><span class="gcs150-mode-art" aria-hidden="true"><img src="/assets/session-formats/classroom.svg" width="110" height="80" alt="" loading="lazy"></span><strong>Classroom to classroom</strong><small>One shared screen for the class</small></label><label class="gcs150-mode"><input type="radio" name="gctp-mode" value="hybrid" ><span class="gcs150-mode-art" aria-hidden="true"><img src="/assets/session-formats/hybrid.svg" width="110" height="80" alt="" loading="lazy"></span><strong>Flexible / hybrid</strong><small>Mix both formats</small></label></div>
   <div class="gct-fields"><label>Students *<input id="gctp-students" type="number" min="1" max="500" value="20" required></label><label>Breakout rooms *<input id="gctp-rooms" type="number" min="1" max="100" value="1" required></label></div>
   <label>Your school level *<select id="gctp-band"><option value="Upper Secondary">High school</option><option value="Lower Secondary">Junior high</option><option value="Primary">Elementary</option><option value="University">University</option><option value="Mixed">Mixed ages</option></select></label>
   <fieldset class="gcs150-targets"><legend>Partner school levels you welcome *</legend><p class="gct-hint">You can select several grades, such as junior high and high school.</p><div class="gcs150-levels"><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="Primary"><span>Elementary</span></label><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="Lower Secondary"><span>Junior high</span></label><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="Upper Secondary"><span>High school</span></label><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="University"><span>University</span></label><label class="gcs150-check"><input type="checkbox" name="gctp-target-level" value="Mixed"><span>Mixed ages</span></label></div></fieldset>
  </section>
  <section class="gct-form-section" data-gctp-form-section="2" hidden>
   <div class="gcs150-intro"><h4>Make your exchange memorable</h4><p>Choose a theme; language proficiency and learning goals are optional.</p></div>
   <label>Session theme *<select id="gctp-theme"><option value="Cultural Exchange">Culture and daily life</option><option value="SDGs">SDGs / global challenges</option><option value="Mystery Skype">Mystery Skype</option><option value="Language Exchange">Language exchange</option><option value="Global Citizenship">Global citizenship</option><option value="Free Topic">Free topic</option></select></label>
   <label id="gctp-sdg-wrap" hidden>SDG goal<select id="gctp-sdg"><option value="">Any SDG goal</option><option value="1">1. No Poverty</option><option value="2">2. Zero Hunger</option><option value="3">3. Good Health and Well-being</option><option value="4">4. Quality Education</option><option value="5">5. Gender Equality</option><option value="6">6. Clean Water and Sanitation</option><option value="7">7. Affordable and Clean Energy</option><option value="8">8. Decent Work and Economic Growth</option><option value="9">9. Industry, Innovation and Infrastructure</option><option value="10">10. Reduced Inequalities</option><option value="11">11. Sustainable Cities and Communities</option><option value="12">12. Responsible Consumption and Production</option><option value="13">13. Climate Action</option><option value="14">14. Life Below Water</option><option value="15">15. Life on Land</option><option value="16">16. Peace, Justice and Strong Institutions</option><option value="17">17. Partnerships for the Goals</option></select></label>
   <label>Specific topic (optional)<input id="gctp-topic" maxlength="90" placeholder="e.g. Climate, local food, school traditions"></label>
   <div class="gct-fields"><label>Languages spoken (optional)<input id="gctp-language" maxlength="100" placeholder="e.g. Japanese, English"></label><label>English level (optional)<select id="gctp-english"><option value="">Not specified</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Mixed levels</option></select></label></div>
   <label>Activities / goals (optional)<textarea id="gctp-goals" rows="2" maxlength="400" placeholder="What should students do during the exchange?"></textarea></label>
   <label>Notes to partner teachers (optional)<textarea id="gctp-notes" rows="2" maxlength="500" placeholder="Preparation and other details"></textarea></label>
  </section>
  <section class="gct-form-section" data-gctp-form-section="3" hidden>
   <div class="gcs150-intro"><h4>Ready to connect the world?</h4><p>Check the details. You can go back and change anything before publishing.</p></div><div class="gct-review" id="gctp-review"></div>
   <p class="gct-hint">Publishing makes this session visible to approved teachers. It does not automatically create a Zoom meeting or send invitations.</p>
  </section>
  <div class="gct-form-actions"><button type="button" id="gctp-back" class="gct-secondary" hidden>← Back</button><button type="button" id="gctp-next" class="gct-primary">Continue →</button><button class="gct-primary" id="gctp-publish" type="submit" hidden>Publish session ✓</button></div>
 </form><aside class="gct-panel"><div class="gct-section-head"><span>02</span><div><h3>Your upcoming sessions</h3><p>Sessions you can manage.</p></div></div><div id="gctp-mine" class="gct-card-list"></div></aside>
 </div></div>
 <div class="gct-section gcs151-find" data-gct-view="find" hidden>
  <header class="gcs151-find-hero">
   <div><span class="gcs151-kicker">DISCOVER GLOBAL CLASSROOMS</span>
   <h3>Where will your classroom connect next?</h3>
   <p>Find a partner by your available time or explore countries offering sessions.</p>
   <span id="gctp-find-zone-label" class="gcs150-zone-chip">Your school time zone</span></div>
   <div class="gcs151-hero-world" aria-hidden="true"><span>✦</span><span>🌏</span><span>✦</span></div>
  </header>
  <div class="gcs151-discover-modes" role="group" aria-label="Choose how to find a session">
   <button id="gctp-discover-time" class="gcs151-discover-card" type="button" aria-pressed="true" data-gcs151-discovery="time">
    <span class="gcs151-discover-icon" aria-hidden="true">🕒</span><span class="gcs151-discover-label"><strong>Find by time</strong><small>Start with the hours you're available</small></span><span aria-hidden="true">→</span>
   </button>
   <button id="gctp-discover-map" class="gcs151-discover-card" type="button" aria-pressed="false" data-gcs151-discovery="map">
    <span class="gcs151-discover-icon" aria-hidden="true">🌐</span><span class="gcs151-discover-label"><strong>Explore world map</strong><small>Choose a country with an open session</small></span><span aria-hidden="true">→</span>
   </button>
  </div>
  <section id="gctp-find-time-panel" class="gcs151-discover-panel" aria-label="Find by available time">
   <h4>When can your class join?</h4>
   <div class="gct-filterbar gcs150-main-filters">
    <label>Available time (your school time)<select id="gctp-find-preset"><option value="any">Any time</option><option value="morning">Morning · 08:00–12:00</option><option value="afternoon">Afternoon · 12:00–17:00</option><option value="evening">Evening · 17:00–22:00</option><option value="custom">Choose hours</option></select></label>
    <label>Date (optional)<input id="gctp-find-date" type="date"></label>
    <div id="gctp-find-custom" class="gcs150-custom" hidden><label>From<input id="gctp-find-from" type="time" value="09:00"></label><label>Until<input id="gctp-find-to" type="time" value="12:00"></label></div>
   </div>
   <p class="gcs151-small-help">Results update automatically. Time zones and daylight saving are calculated for each session date.</p>
  </section>
  <section id="gctp-find-map-panel" class="gcs151-discover-panel" aria-label="Find by country" hidden>
   <div class="gcs151-map-heading"><div><h4>Explore available countries</h4><p>Only countries with currently open sessions are marked on the map.</p></div><span id="gctp-map-status" role="status" aria-live="polite">Select the map to explore</span></div>
   <div id="gctp-country-map" class="gcs151-map-stage" aria-label="Interactive world map"></div>
   <label class="gcs151-country-select-label">Choose from the list instead
    <select id="gctp-find-country"><option value="">All available countries</option></select>
   </label>
   <div id="gctp-country-list" class="gcs151-country-list" aria-label="Countries with open sessions"></div>
  </section>
  <details class="gcs150-advanced"><summary>More options · school level, SDGs, format &amp; topic</summary>
   <div class="gct-filterbar">
    <label>Partner school level<select id="gctp-find-band"><option value="">Any level</option><option value="Primary">Elementary</option><option value="Lower Secondary">Junior high</option><option value="Upper Secondary">High school</option><option value="University">University</option><option value="Mixed">Mixed ages</option></select></label>
    <label>Session format<select id="gctp-find-mode"><option value="">Any format</option><option value="device">Individual devices</option><option value="classroom">Classroom to classroom</option><option value="hybrid">Flexible / hybrid</option></select></label>
    <label>SDG topic<select id="gctp-find-sdg"><option value="">Any SDG</option><option value="1">1. No Poverty</option><option value="2">2. Zero Hunger</option><option value="3">3. Good Health and Well-being</option><option value="4">4. Quality Education</option><option value="5">5. Gender Equality</option><option value="6">6. Clean Water and Sanitation</option><option value="7">7. Affordable and Clean Energy</option><option value="8">8. Decent Work and Economic Growth</option><option value="9">9. Industry, Innovation and Infrastructure</option><option value="10">10. Reduced Inequalities</option><option value="11">11. Sustainable Cities and Communities</option><option value="12">12. Responsible Consumption and Production</option><option value="13">13. Climate Action</option><option value="14">14. Life Below Water</option><option value="15">15. Life on Land</option><option value="16">16. Peace, Justice and Strong Institutions</option><option value="17">17. Partnerships for the Goals</option></select></label>
    <label>Keyword<input id="gctp-find-topic" type="search" placeholder="Culture, climate, language…"></label>
    <label class="gcs150-match"><input id="gctp-find-compatible" type="checkbox"><span>Partner accepts my school level</span></label>
   </div>
  </details>
  <div class="gcs151-results-heading"><div><h3>Matching sessions</h3><span id="gctp-search-count" role="status" aria-live="polite"></span></div><button id="gctp-reset-filters" class="gct-secondary" type="button">Clear filters</button></div>
  <div id="gctp-results" class="gct-results"></div>
 </div>
 <div class="gct-section" data-gct-view="requests" hidden><div class="gct-section-head"><span>✉</span><div><h3>Join requests</h3><p>Review applications to your sessions, and track the requests you sent.</p></div></div>
 <div class="gct-request-columns"><div class="gct-panel"><h3>Received from other teachers</h3><div id="gctp-incoming" class="gct-card-list"></div></div><div class="gct-panel"><h3>Requests you sent</h3><div id="gctp-outgoing" class="gct-card-list"></div></div></div>
 <p class="gct-hint">Approval records interest only. Agree on the final arrangements separately; no notification, Zoom link, or event is automatically sent.</p></div>
 <section class="gct-section" data-gct-view="profile" hidden>${teacherProfileMarkupV153()}</section>
 <section class="gct-section" data-gct-view="network" hidden>
  <div class="gcc153-directory-head"><div><h3>Teacher Network</h3><p>Meet verified educators from around the world.</p></div><a class="gct-secondary" href="#/teacher-portal?view=profile">✎ Edit my profile</a></div>
  ${teacherNetworkMarkupV116()}</section>
 <section class="gct-section" data-gct-view="volunteer" hidden>${volunteerMarkupV117()}</section>
 </section>`;}

export function bindTeacherPortalPage(){
 const root=document.querySelector('.gct-portal');if(!root)return;
 const $=id=>root.querySelector('#'+id),notice=$('gctp-message');
 let identity=null,offers=[],requests=[],formStep=0,discoverMode='time';
 const countryExplorer=mountCountryExplorerV151(root,code=>{
  if(!identity)return;
  $('gctp-find-country').value=code;
  countryExplorer.update(upcoming(),code);
  renderResults();
 });
 const inform=(value,error=false)=>{notice.textContent=value;notice.classList.toggle('error',error);};
 const display=(id)=>{for(const view of root.querySelectorAll('[data-gct-view]'))view.hidden=view.dataset.gctView!==id;
   root.closest('.app-shell')?.classList.toggle('gcc123-volunteer-focus',id==='volunteer');};
 const selectedLevels=()=>[...root.querySelectorAll('input[name="gctp-target-level"]:checked')].map(x=>x.value);
 const selectedMode=()=>root.querySelector('input[name="gctp-mode"]:checked')?.value||'classroom';
 const sessionTopic=()=>[$('gctp-theme').value,$('gctp-topic').value.trim()].filter(Boolean).join(' · ').slice(0,120);
 const detailsPayload=()=>sessionDetailsPayloadV150({name:$('gctp-name').value,mode:selectedMode(),targetLevels:selectedLevels(),
  sdg:$('gctp-theme').value==='SDGs'?$('gctp-sdg').value:'',language:$('gctp-language').value,
  englishLevel:$('gctp-english').value,goals:$('gctp-goals').value});
 function showFormStep(index){
  formStep=index;
  for(const section of root.querySelectorAll('[data-gctp-form-section]'))section.hidden=Number(section.dataset.gctpFormSection)!==index;
  $('gctp-form-step').textContent=`Step ${index+1} of 4 · ${['When and where','Exchange format','Topic and activities','Review and publish'][index]}`;
  for(const n of root.querySelectorAll('[data-gcs150-step-dot]')){
   n.classList.toggle('active',Number(n.dataset.gcs150StepDot)===index);
   n.classList.toggle('completed',Number(n.dataset.gcs150StepDot)<index);
  }
  $('gctp-back').hidden=index===0;$('gctp-next').hidden=index===3;$('gctp-publish').hidden=index!==3;
  if(index===3){const review=$('gctp-review');review.replaceChildren();
   for(const [label,value] of [
    ['Session name',$('gctp-name').value.trim()],['Teacher',identity?.name||''],
    ['School / country',`${identity?.school||''} · ${identity?.country||''}`],
    ['When',`${$('gctp-date').value} · ${$('gctp-from').value}–${$('gctp-to').value} (${identity?.timezone||''})`],
    ['Format',GCC_MODES_V150[selectedMode()].name],
    ['Participants',`${$('gctp-students').value} students · ${$('gctp-rooms').value} rooms`],
    ['My school level',$('gctp-band').selectedOptions[0]?.textContent||''],
    ['Partner levels',selectedLevels().join(', ')],['Theme',sessionTopic()],
    ['SDG',$('gctp-theme').value==='SDGs'&&$('gctp-sdg').value?`SDG ${$('gctp-sdg').value} · ${GCC_SDG_V150[Number($('gctp-sdg').value)-1]}`:''],
    ['Languages',$('gctp-language').value.trim()],['English level',$('gctp-english').value],
    ['Activities',$('gctp-goals').value.trim()]
   ].filter(([,v])=>v)){const row=element('div','gct-review-line');row.append(element('span','',label),element('strong','',value));review.append(row);}
  }
 }
 function validateFormStep(i){
  if(!identity)return 'Teacher profile not loaded yet.';
  if(i===0){if($('gctp-name').value.trim().length<3)return 'Please enter a session name (at least 3 characters).';
   const slot=makeSlot({date:$('gctp-date').value,startTime:$('gctp-from').value,endTime:$('gctp-to').value,timezone:identity.timezone});
   if(slot.error)return slot.error;if(Date.parse(slot.startsAt)<=Date.now())return 'Choose a future date and time.';
  }else if(i===1){const n=Number($('gctp-students').value),rooms=Number($('gctp-rooms').value);
   if(!Number.isInteger(n)||n<1||n>500)return 'Enter 1 to 500 students.';
   if(!Number.isInteger(rooms)||rooms<1||rooms>100)return 'Enter 1 to 100 breakout rooms.';
   if(selectedLevels().length===0)return 'Please choose at least one partner school level.';
  }return '';
 }
 $('gctp-theme').addEventListener('change',()=>{$('gctp-sdg-wrap').hidden=$('gctp-theme').value!=='SDGs';});
 for(const option of root.querySelectorAll('input[name="gctp-mode"]'))option.addEventListener('change',()=>{
  if(!option.checked)return;
  if(option.value==='classroom'&&$('gctp-rooms').value==='4')$('gctp-rooms').value='1';
  if(option.value==='device'&&$('gctp-rooms').value==='1')$('gctp-rooms').value='4';
 });
 $('gctp-next').addEventListener('click',()=>{const error=validateFormStep(formStep);if(error){inform(error,true);return;}inform('');showFormStep(Math.min(3,formStep+1));});
 $('gctp-back').addEventListener('click',()=>{inform('');showFormStep(Math.max(0,formStep-1));});
 const upcoming=()=>offers.filter(o=>new Date(o.ends_at).getTime()>Date.now());
 async function refresh(){
  const [mine,applications]=await Promise.all([teacherSessions(),teacherRequests()]);
  offers=Array.isArray(mine)?mine:[];requests=Array.isArray(applications)?applications:[];
  renderMine();updateFindCountries();countryExplorer.update(upcoming(),$('gctp-find-country').value);renderResults();renderRequests();
 }
 function renderMine(){const list=$('gctp-mine');list.replaceChildren();
  const mine=upcoming().filter(o=>o.is_mine);if(!mine.length){list.append(element('p','gct-empty','No sessions yet. Choose a date and publish your first session.'));return;}
  for(const o of mine){const card=element('article','gct-session-card');card.append(element('strong','',sessionTitleV150(o)),
    element('p','',`${timeRangeV112(o.starts_at,o.ends_at,identity.timezone)} (${identity.timezone})`),
    element('small','',`${o.student_count} students · ${o.room_count} rooms · ${o.status}`));
    if(o.status==='open'){const close=element('button','gct-secondary','Close session');close.type='button';close.addEventListener('click',async()=>{
     if(!confirm('Close this session to new applicants?'))return;close.disabled=true;try{await teacherCloseSession(o.id);await refresh();inform('Session closed.');}catch(e){inform(e.message,true);close.disabled=false;}
    });card.append(close);}list.append(card);}
 }
 function searchFiltered(){
  if(!identity)return [];
  const preset=$('gctp-find-preset').value,range={
   morning:['08:00','12:00'],afternoon:['12:00','17:00'],evening:['17:00','22:00']
  };
  const [from,to]=preset==='custom'?[$('gctp-find-from').value,$('gctp-find-to').value]:(range[preset]||['','']);
  return filterOffersV150(upcoming(),{date:discoverMode==='time'?$('gctp-find-date').value:'',
   from:discoverMode==='time'?from:'',to:discoverMode==='time'?to:'',
   country:discoverMode==='map'?$('gctp-find-country').value:'',band:$('gctp-find-band').value,topic:$('gctp-find-topic').value,
   sdg:$('gctp-find-sdg').value,mode:$('gctp-find-mode').value,compatible:$('gctp-find-compatible').checked},identity);
 }
 function updateFindCountries(){
  const select=$('gctp-find-country'),current=select.value;
  const codes=new Map(upcoming().filter(o=>!o.is_mine&&o.status==='open'&&o.country_code).map(o=>[o.country_code,o.country_name]));
  select.replaceChildren(new Option('Any country',''));
  for(const [code,name] of [...codes].sort((a,b)=>a[1].localeCompare(b[1])))select.add(new Option(name,code));
  if(codes.has(current))select.value=current;
  else select.value='';
 }
 function renderResults(){
  if(!identity)return;
  const list=$('gctp-results');list.replaceChildren();const results=searchFiltered();
  $('gctp-search-count').textContent=`${results.length} session${results.length===1?'':'s'}`;
  if(!results.length){list.append(element('p','gct-empty','No sessions match yet. Try Any time or another date.'));return;}
  const previously=new Set(requests.filter(r=>r.direction==='outgoing').map(r=>r.offer_id));
  for(const o of results){
   const d=detailsV150(o),card=element('article','gct-session-card gcs150-result'),top=element('div','gcs150-result-top');
   top.append(element('span','gct-eyebrow',`${flag(o.country_code)} ${o.country_name}`));
   if(GCC_MODES_V150[d.mode])top.append(element('span','gcs150-format',GCC_MODES_V150[d.mode].name));
   card.append(top,element('h3','',sessionTitleV150(o)),element('p','',`${o.school_name} · ${o.teacher_name}`));
   const clocks=element('div','gcs150-clock-pair');
   for(const [label,zone] of [['YOUR TIME',identity.timezone],['HOST TIME',o.timezone||'UTC']]){
    const block=element('div');block.append(element('small','',label),element('strong','',timeRangeV112(o.starts_at,o.ends_at,zone)),element('small','',zone));clocks.append(block);
   }
   card.append(clocks,element('small','',`${o.student_count} students · ${o.room_count} rooms · Partner levels: ${partnerLevelsV150(o).join(', ')}`));
   if(d.sdg)card.append(element('small','gcs150-sdg-tag',`SDG ${d.sdg} · ${GCC_SDG_V150[Number(d.sdg)-1]||''}`));
   if(d.language)card.append(element('small','',`Languages: ${d.language}${d.english_level?' · English level: '+d.english_level:''}`));
   if(d.goals)card.append(element('p','',d.goals));
   if(previously.has(o.id))card.append(element('span','gct-status approved','✓ Request already submitted'));
   else{const detail=element('details','gct-request-form');detail.append(element('summary','','Request to Join →'));
    const input=element('textarea');input.rows=2;input.maxLength=500;input.placeholder='Optional message to the host teacher';input.setAttribute('aria-label','Message to the session host');
    const submit=element('button','gct-primary','Send join request →');submit.type='button';submit.addEventListener('click',async()=>{
     submit.disabled=true;prepareSuccessChime();try{await teacherApply(o.id,input.value.trim());await refresh();inform('Request sent! Track it in My Requests. No email was sent.');showSuccessCelebration({title:'Request sent!',detail:'The host can now review your request.'});}
     catch(e){inform(e.message||'Request failed.',true);submit.disabled=false;}
    });detail.append(input,submit);card.append(detail);}
   list.append(card);
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
  $('gctp-host-school').textContent=identity.school||'School not linked';
  $('gctp-host-identity').textContent=`${identity.name} · ${identity.country}`;
  $('gctp-find-zone-label').textContent=`Your school time zone: ${identity.timezone}`;
  const level=GCC_LEVELS_V150.find(([id])=>id===identity.school_level)?.[0]||'Upper Secondary';
  $('gctp-band').value=level;
  const checkbox=root.querySelector(`input[name="gctp-target-level"][value="${level}"]`);
  if(checkbox)checkbox.checked=true;
  await refresh();inform('');await mountVolunteerV117(root,display);
  const networkProfile=await myTeacherProfileV116();
  // Only fetch/edit photo + profile details on their dedicated pages.
  if(view==='profile')await mountTeacherProfileV153(root,updated=>{
   if(!updated)return;
   identity.name=updated.name||identity.name;
   $('gctp-greeting').textContent=`${flag(identity.country_code)} ${identity.name} · ${identity.school}`;
   $('gctp-host-identity').textContent=`${identity.name} · ${identity.country}`;
  });
  if(view==='network')await mountTeacherNetworkV116(root);
  if(!networkProfile?.timezone){$('gctp-zone').value='';$('gctp-next').disabled=true;inform('Your school time zone is missing. Ask the host to set it before publishing a session.',true);}}catch(e){inform(e.message||'Could not load teacher profile.',true);}}
 $('gctp-create').addEventListener('submit',async e=>{e.preventDefault();if(!identity)return;
   const slot=makeSlot({date:$('gctp-date').value,startTime:$('gctp-from').value,endTime:$('gctp-to').value,timezone:identity.timezone});
   if(slot.error){inform(slot.error,true);return;}if(Date.parse(slot.startsAt)<=Date.now()){inform('Choose a future date and time.',true);return;}
   for(let step=0;step<3;step++){const error=validateFormStep(step);if(error){showFormStep(step);inform(error,true);return;}}
   const data={zone:identity.timezone,students:Number($('gctp-students').value),rooms:Number($('gctp-rooms').value),band:$('gctp-band').value,topic:sessionTopic(),notes:$('gctp-notes').value.trim(),details:detailsPayload()};
   if(!Number.isInteger(data.students)||data.students<1||data.students>500||!Number.isInteger(data.rooms)||data.rooms<1||data.rooms>100){inform('Check student and room counts.',true);return;}
   const btn=$('gctp-publish');btn.disabled=true;
   try{
    prepareSuccessChime();await teacherCreateSession(slot,data);await refresh();
    inform('Session published to approved teachers. No email sent.');
    $('gctp-create').reset();$('gctp-date').value=tomorrow(identity.timezone);$('gctp-zone').value=identity.timezone;
    const defaultLevel=GCC_LEVELS_V150.find(([id])=>id===identity.school_level)?.[0]||'Upper Secondary';
    $('gctp-band').value=defaultLevel;
    const defaultCheck=root.querySelector(`input[name="gctp-target-level"][value="${defaultLevel}"]`);
    if(defaultCheck)defaultCheck.checked=true;
    $('gctp-sdg-wrap').hidden=true;
    showFormStep(0);display('create');
    showSuccessCelebration({title:'Session published!',detail:'Approved teachers can now discover your session.'});
   }
   catch(err){inform(err.message||'Could not publish the session.',true);}finally{btn.disabled=false;}
 });
 const setDiscoverMode=(mode)=>{
  discoverMode=mode==='map'?'map':'time';
  $('gctp-find-time-panel').hidden=discoverMode!=='time';
  $('gctp-find-map-panel').hidden=discoverMode!=='map';
  for(const button of root.querySelectorAll('[data-gcs151-discovery]')){
   button.setAttribute('aria-pressed',String(button.dataset.gcs151Discovery===discoverMode));
  }
  if(discoverMode==='map')countryExplorer.load();
  renderResults();
 };
 for(const button of root.querySelectorAll('[data-gcs151-discovery]')){
  button.addEventListener('click',()=>setDiscoverMode(button.dataset.gcs151Discovery));
 }
 $('gctp-reset-filters').addEventListener('click',()=>{
  $('gctp-find-preset').value='any';$('gctp-find-date').value='';
  $('gctp-find-custom').hidden=true;$('gctp-find-country').value='';
  for(const id of ['gctp-find-band','gctp-find-mode','gctp-find-sdg','gctp-find-topic'])$(id).value='';
  $('gctp-find-compatible').checked=false;
  countryExplorer.update(upcoming(),'');renderResults();
 });
 $('gctp-find-preset').addEventListener('change',()=>{$('gctp-find-custom').hidden=$('gctp-find-preset').value!=='custom';renderResults();});
 for(const id of ['gctp-find-date','gctp-find-from','gctp-find-to','gctp-find-country','gctp-find-band','gctp-find-mode','gctp-find-sdg','gctp-find-compatible','gctp-find-topic']){
  $(id).addEventListener(id==='gctp-find-topic'?'input':'change',()=>{
   if(id==='gctp-find-country')countryExplorer.update(upcoming(),$('gctp-find-country').value);
   renderResults();
  });
 }
 $('gctp-logout').addEventListener('click',async()=>{try{await teacherSignOut();window.location.hash='#/teacher-access';}catch(e){inform(e.message,true);}});
 const view=new URLSearchParams(window.location.hash.split('?')[1]||'').get('view');
 if(!['create','find','volunteer','network','requests','profile'].includes(view)){window.location.hash='#/welcome';return;}
 showFormStep(0);display(view);init().catch(e=>inform(e.message,true));
}
