// GCC_SESSION_SPLIT_V3: independent register/search routes; shared host services.
// GCC_MATCHING_GUIDE_V22: minimal copy and focused guidance
// GCC_MATCHING_GUIDED_V2 · host UI only; keeps existing database/service contracts.
import '../../styles/matching.css';
import '../../styles/sessionWorkspacePolish.css'; // GCC_WORKFLOW_POLISH_V41
import {makeSlot,findMatches} from '../../lib/matching.js';
import {loadMatchData,createAvailability,setAvailabilityStatus,saveShortlist,removeShortlist} from '../../services/matchingService.js';

const $ = id => document.getElementById(id);
const node = (tag,cls='',text='') => {const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;};
const flag = code => /^[A-Z]{2}$/.test(code||'')
  ? [...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join('') : '🌍';
const fmt = (iso,zone) => {
  try {return new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}
  catch {return 'Unknown time zone';}
};
const timeOnly = (iso,zone) => {
  try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}
  catch{return '--:--';}
};
const timezoneValid = zone => {try{new Intl.DateTimeFormat('en',{timeZone:zone});return true;}catch{return false;}};
function localDateTomorrow(){const d=new Date();d.setDate(d.getDate()+1);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}

const WIZARD_STEPS = [
  {icon:'🏫',short:'Who',title:'Choose a teacher / school',hint:''},
  {icon:'🗓️',short:'When',title:'Find a good time',hint:'Tell us when your class can join, in its own local time.'},
  {icon:'✨',short:'Details',title:'Make it yours',hint:'Add students, rooms, and a conversation topic.'},
  {icon:'✅',short:'Review',title:'Ready to connect?',hint:'Review the details before making your time available.'}
];

export function MatchingPage() {
  return `
  <section class="gc-matching${window.location.hash.startsWith('#/register-session')?' gc-register-only':''}" aria-label="Register a Session">
    <div class="gc-match-hero">
      <div class="gc-match-hero-icon" aria-hidden="true">🌍</div>
      <div class="gc-match-hero-copy">
        <span class="gc-match-eyebrow">GLOBAL CLASSROOM · EXCHANGE HUB</span>
        <h2>Register a <em>Session.</em></h2>
      </div>
    </div>

    <div class="gc-match-nav" aria-label="Exchange Matching sections">
      <div class="gc-match-mode-switch" role="group" aria-label="Workspace view">
        <button id="gcm-mode-form" type="button" aria-pressed="true" class="active"><span aria-hidden="true">＋</span> Register a Session</button>
        <button id="gcm-mode-results" type="button" aria-pressed="false"><span aria-hidden="true">⌕</span> Find a Session <span class="gc-match-nav-count" id="gcm-match-nav-count">0</span></button>
      </div>
    </div>
    <div id="gcm-notice" class="gc-match-notice" role="status" aria-live="polite" hidden></div>

    <div id="gcm-view-form" class="gc-match-workspace">
      <form id="gcm-form" class="gc-match-wizard" novalidate>
        <div class="gc-match-wizard-top">
          <div class="gc-match-step-count" id="gcm-step-count">STEP 01 / 04</div>
          <div class="gc-match-wizard-progress" role="progressbar" aria-label="Registration progress" aria-valuemin="1" aria-valuemax="4" aria-valuenow="1" id="gcm-progress"><span id="gcm-progress-fill"></span></div>
        </div>
        <div class="gc-match-steps" id="gcm-steps" aria-label="Registration steps">
          ${WIZARD_STEPS.map((step,i)=>`<button type="button" class="gc-match-step${i===0?' active':''}" data-gcm-step="${i}" aria-current="${i===0?'step':'false'}"><span class="gc-match-step-number">${i+1}</span><span>${step.short}</span></button>`).join('')}
        </div>
        <div class="gc-match-panel-scroll">
          <div class="gc-match-step-intro"><div class="gc-match-step-emblem" id="gcm-step-emblem" aria-hidden="true">🏫</div><div><h3 id="gcm-step-title">Choose your school</h3><p class="gc-match-guide-caption" id="gcm-guide-message" role="status" aria-live="polite">Choose your teacher / school</p></div></div>
          <section class="gc-match-panel" data-gcm-panel="0">
            <label class="gc-match-label"><span class="gc-match-field-title">Teacher / School <b>*</b></span><select id="gcm-teacher" required></select></label>
            <div id="gcm-school-note" class="gc-match-school-note">Select a teacher to see their school and country.</div>
            <label class="gc-match-label"><span class="gc-match-field-title">School level <b>*</b></span>
              <select id="gcm-band"><option value="Upper Secondary">High school</option><option value="Lower Secondary">Junior high</option><option value="Primary">Primary / Elementary</option><option value="University">University</option><option value="Mixed">Mixed ages</option></select>
            </label>
          </section>
          <section class="gc-match-panel" data-gcm-panel="1" hidden>
            <div class="gc-match-field-grid"><label class="gc-match-label"><span class="gc-match-field-title">Available date <b>*</b></span><input type="date" id="gcm-date" required></label><label class="gc-match-label"><span class="gc-match-field-title">Time zone <b>*</b></span><select id="gcm-zone" required></select></label></div>
            <div class="gc-match-field-grid"><label class="gc-match-label"><span class="gc-match-field-title">From <b>*</b></span><input type="time" id="gcm-start" value="09:00" required></label><label class="gc-match-label"><span class="gc-match-field-title">Until <b>*</b></span><input type="time" id="gcm-end" value="10:00" required></label></div>
            <div class="gc-match-soft-tip"><span aria-hidden="true">🌤️</span><span>Use your school’s local time. Overnight sessions are welcome, from 30 minutes to 6 hours. Daylight-saving changes are checked.</span></div>
          </section>
          <section class="gc-match-panel" data-gcm-panel="2" hidden>
            <div class="gc-match-field-grid"><label class="gc-match-label"><span class="gc-match-field-title">Students <b>*</b></span><input type="number" id="gcm-students" min="1" max="500" value="20" required></label><label class="gc-match-label"><span class="gc-match-field-title">Breakout rooms <b>*</b></span><input type="number" id="gcm-rooms" min="1" max="100" value="4" required></label></div>
            <label class="gc-match-label"><span class="gc-match-field-title">Preferred topic <small class="gc-match-optional">Optional</small></span><input id="gcm-topic" maxlength="120" placeholder="e.g. Food, Culture, Our Hometowns"></label>
            <label class="gc-match-label"><span class="gc-match-field-title">Notes <small class="gc-match-optional">Optional</small></span><textarea id="gcm-notes" rows="3" maxlength="500" placeholder="Anything helpful for potential partner schools?"></textarea></label>
          </section>
          <section class="gc-match-panel" data-gcm-panel="3" hidden>
            <div class="gc-match-review" id="gcm-review"></div>
            <div class="gc-match-soft-tip"><span aria-hidden="true">🤝</span><span>Saving creates an availability entry. No invitations are sent and no partner is confirmed automatically.</span></div>
          </section>
        </div>
        <div class="gc-match-wizard-bottom">
          <p id="gcm-form-error" role="alert" aria-live="assertive"></p>
          <div class="gc-match-form-actions">
            <button class="gc-match-back" id="gcm-step-back" type="button" hidden>← Back</button>
            <button class="gc-match-next" id="gcm-step-next" type="button">Continue <span aria-hidden="true">→</span></button>
            <button class="gc-match-next" id="gcm-save" type="submit" hidden>Save availability <span aria-hidden="true">✓</span></button>
          </div>
        </div>
      </form>
      <aside class="gc-match-companion" aria-label="Planning help">
        <div class="gc-match-companion-header"><span class="gc-match-companion-symbol" aria-hidden="true">✧</span><div><span class="gc-match-mini-label">YOUR EXCHANGE</span><h3>Overview</h3></div></div>
        <div class="gc-match-companion-illustration" aria-hidden="true"><span>🇯🇵</span><span class="gc-match-connect-line">···· ✧ ····</span><span>🌎</span></div>
        <div class="gc-match-companion-divider"></div>
        <div class="gc-match-context-kicker">DETAILS</div>
        <div class="gc-match-context-line"><span>Teacher</span><strong id="gcm-context-teacher">Not selected yet</strong></div>
        <div class="gc-match-context-line"><span>Local time</span><strong id="gcm-context-time">Choose a date &amp; time</strong></div>
        <div class="gc-match-context-line"><span>Class size</span><strong id="gcm-context-group">20 students · 4 rooms</strong></div>
        <button type="button" class="gc-match-companion-results" id="gcm-see-matches">See existing partner suggestions <span aria-hidden="true">↗</span></button>
      </aside>
    </div>

    <div id="gcm-view-results" class="gc-match-result-workspace" hidden>
      <div class="gc-match-results-head"><div><span class="gc-match-eyebrow">POSSIBILITIES AROUND THE WORLD</span><h3>Find your classroom match <span aria-hidden="true">♡</span></h3><p>Explore shared times, see the possibilities, and save your favorite partnerships.</p></div>
        <div class="gc-match-tools"><button id="gcm-demo" type="button" class="gc-match-button-quiet">✦ Preview sample</button><button id="gcm-refresh" type="button" class="gc-match-button-quiet">↻ Refresh</button></div>
      </div>
      <div class="gc-match-stats" id="gcm-stats" aria-live="polite"></div>
      <div class="gc-match-results-columns">
        <section class="gc-match-saved-list"><div class="gc-match-section-header"><div><span class="gc-match-mini-label">YOUR COMMUNITY</span><h4>Available classrooms</h4></div><small id="gcm-offer-count">0 upcoming</small></div><div class="gc-match-list" id="gcm-offer-list"></div></section>
        <section class="gc-match-candidates"><div class="gc-match-section-header"><div><span class="gc-match-mini-label">THE BEST CONNECTIONS</span><h4>Suggested partners</h4></div><span class="gc-match-proposal-pill">Suggestions only</span></div>
          <div class="gc-match-filter"><label>Shared time <select id="gcm-overlap"><option value="30">30+ min</option><option value="45">45+ min</option><option value="60">60+ min</option></select></label>
            <label>Country pairing <select id="gcm-country-filter"><option value="international">Different countries</option><option value="all">All countries</option></select></label>
            <label class="gc-match-filter-search">Search <input id="gcm-search" type="search" placeholder="Teacher, country, topic..."></label></div>
          <div class="gc-match-list" id="gcm-candidate-list"></div>
        </section>
      </div>
    </div>
  </section>`;
}

export function bindMatchingPage() {
  const root=document.querySelector('.gc-matching');
  if(!root)return;
  let state={teachers:[],offers:[],shortlists:[]};
  let countries=new Map(),demo=false,loadVersion=0,step=0,maxReached=0,mode='form';
  const notice=(message,isError=false)=>{const el=$('gcm-notice');el.textContent=message;el.hidden=!message;el.classList.toggle('error',isError);};
  const teacherById=()=>new Map(state.teachers.map(t=>[t.id,t]));
  const displayTeacher=id=>teacherById().get(id)?.display_name||'Unknown teacher';
  const teacherCountry=t=>t?.schools?.country_code?.toUpperCase()||'';
  const selectedTeacher=()=>teacherById().get($('gcm-teacher').value);

  function setMode(nextMode) {
    mode=nextMode;
    $('gcm-view-form').hidden=mode!=='form';
    $('gcm-view-results').hidden=mode!=='results';
    for(const [key,id] of [['form','gcm-mode-form'],['results','gcm-mode-results']]){
      $(id).classList.toggle('active',key===mode);
      $(id).setAttribute('aria-pressed',String(key===mode));
    }
    if(mode==='results') render();
    else guideNext();
    notice('');
  }

  function updateZone() {
    const teacher=selectedTeacher(),country=teacherCountry(teacher),master=countries.get(country);
    const previous=$('gcm-zone').value;
    const zones=[teacher?.schools?.timezone,...(master?.zones||[])].filter(Boolean)
      .filter((z,i,a)=>a.indexOf(z)===i&&timezoneValid(z));
    $('gcm-zone').replaceChildren();
    for(const z of zones){const option=node('option','',z);option.value=z;$('gcm-zone').append(option);}
    if(zones.includes(previous)) $('gcm-zone').value=previous;
    $('gcm-zone').disabled=!zones.length;
    $('gcm-school-note').textContent=teacher
      ?`${flag(country)}  ${teacher.schools?.name||'School unknown'}  ·  ${master?.name||teacher.schools?.country_name||country||'Country missing'}`
      :'Choose a registered teacher to display their school and country.';
    updateContext();
  }
  function populateTeachers(){
    const select=$('gcm-teacher'),previous=select.value;select.replaceChildren();
    if(!state.teachers.length){const option=node('option','','Register a teacher first');option.value='';select.append(option);}
    for(const t of state.teachers){const option=node('option','',`${t.display_name} · ${t.schools?.name||'No school'}`);option.value=t.id;select.append(option);}
    if(state.teachers.some(t=>t.id===previous))select.value=previous;
    updateZone();
  }
  function updateContext(){
    const t=selectedTeacher();
    $('gcm-context-teacher').textContent=t?`${flag(teacherCountry(t))} ${t.display_name}`:'Not selected yet';
    $('gcm-context-time').textContent=$('gcm-date').value&&$('gcm-start').value
      ?`${$('gcm-date').value} · ${$('gcm-start').value}–${$('gcm-end').value}`:'Choose a date & time';
    $('gcm-context-group').textContent=`${$('gcm-students').value||0} students · ${$('gcm-rooms').value||0} rooms`;
  }
  function validateStage(index,showErrors=true){
    let error='',focus=null;
    if(index===0){
      const t=selectedTeacher(),country=teacherCountry(t);
      if(!t||!t.schools||!country||!countries.has(country)){error='Choose a teacher linked to a school in the 197-country directory.';focus=$('gcm-teacher');}
    }
    if(index===1){
      const zone=$('gcm-zone').value;
      if(!zone||!timezoneValid(zone)){error='Select a valid time zone for this school.';focus=$('gcm-zone');}
      else{
        const slot=makeSlot({date:$('gcm-date').value,startTime:$('gcm-start').value,endTime:$('gcm-end').value,timezone:zone});
        if(slot.error){error=slot.error;focus=$('gcm-start');}
        else if(Date.parse(slot.startsAt)<=Date.now()){error='Choose a future date and time.';focus=$('gcm-date');}
      }
    }
    if(index===2){
      const count=Number($('gcm-students').value),rooms=Number($('gcm-rooms').value);
      if(!Number.isInteger(count)||count<1||count>500){error='Enter a student count between 1 and 500.';focus=$('gcm-students');}
      else if(!Number.isInteger(rooms)||rooms<1||rooms>100){error='Enter 1 to 100 breakout rooms.';focus=$('gcm-rooms');}
    }
    if(showErrors){$('gcm-form-error').textContent=error;if(error){focus?.focus();notice('');}}
    return !error;
  }
  function review(){
    const t=selectedTeacher();
    const fields=[
      ['Teacher / School',`${t?.display_name||'—'} · ${t?.schools?.name||'—'}`],
      ['Country',`${flag(teacherCountry(t))} ${t?.schools?.country_name||countries.get(teacherCountry(t))?.name||'—'}`],
      ['When',`${$('gcm-date').value||'—'} · ${$('gcm-start').value}–${$('gcm-end').value}`],
      ['Time zone',$('gcm-zone').value||'—'],
      ['Class size',`${$('gcm-students').value} students · ${$('gcm-rooms').value} breakout rooms`],
      ['School level',$('gcm-band').selectedOptions[0]?.textContent||'—'],
      ['Topic',$('gcm-topic').value.trim()||'Open to ideas']
    ];
    const container=$('gcm-review');container.replaceChildren();
    for(const [label,value] of fields){const row=node('div','gc-match-review-row');row.append(node('span','',label),node('strong','',value));container.append(row);}
  }
  // GCC_MATCHING_GUIDE_V21: gently illuminate one relevant control at a time.
  const guideSequence=[
    ['gcm-teacher','gcm-band'],
    ['gcm-date','gcm-zone','gcm-start','gcm-end'],
    ['gcm-students','gcm-rooms'],
    ['gcm-save']
  ];
  const guideLabels={
    'gcm-teacher':'Choose your teacher / school',
    'gcm-band':'Confirm your school level',
    'gcm-date':'Select an available date',
    'gcm-zone':'Check the local time zone',
    'gcm-start':'Choose the start time',
    'gcm-end':'Choose the end time',
    'gcm-students':'Set the number of students',
    'gcm-rooms':'Set the breakout rooms',
    'gcm-step-next':'Continue to the next step',
    'gcm-save':'Save this availability'
  };
  const visited=guideSequence.map(()=>new Set());
  let guideTarget=null;

  function showGuide(id) {
    root.querySelectorAll('.gc-match-guide-active').forEach(el=>{
      el.classList.remove('gc-match-guide-active');
    });
    if(guideTarget){
      const old=$(guideTarget);
      if(old && old.getAttribute('aria-describedby')==='gcm-guide-message')
        old.removeAttribute('aria-describedby');
    }
    guideTarget=id;
    if(mode!=='form')return;
    const input=$(id);
    if(!input)return;
    const surface=input.closest('.gc-match-label')||input;
    surface.classList.add('gc-match-guide-active');
    input.setAttribute('aria-describedby','gcm-guide-message');
    $('gcm-guide-message').textContent=guideLabels[id]||'Continue';
  }
  function guideNext(){
    if(mode!=='form')return;
    if(step===3){showGuide('gcm-save');return;}
    const unvisited=guideSequence[step].find(id=>!visited[step].has(id));
    showGuide(unvisited||'gcm-step-next');
  }
  function markGuide(id){
    if(mode!=='form'||!guideSequence[step].includes(id))return;
    visited[step].add(id);
    guideNext();
  }
  function showStep(index){
    step=index;maxReached=Math.max(maxReached,index);
    for(const p of root.querySelectorAll('[data-gcm-panel]'))p.hidden=Number(p.dataset.gcmPanel)!==step;
    for(const b of root.querySelectorAll('[data-gcm-step]')){
      const i=Number(b.dataset.gcmStep);
      b.classList.toggle('active',i===step);b.classList.toggle('completed',i<step);
      b.setAttribute('aria-current',i===step?'step':'false');
      b.disabled=i>maxReached;
    }
    const info=WIZARD_STEPS[step];
    $('gcm-step-title').textContent=info.title;
    $('gcm-step-emblem').textContent=info.icon;
    $('gcm-step-count').textContent=`STEP ${String(step+1).padStart(2,'0')} / 04`;
    $('gcm-progress').setAttribute('aria-valuenow',String(step+1));
    $('gcm-progress-fill').style.width=`${(step+1)*25}%`;
    $('gcm-step-back').hidden=step===0;
    $('gcm-step-next').hidden=step===3;
    $('gcm-save').hidden=step!==3;
    $('gcm-form-error').textContent='';
    if(step===3)review();
    updateContext();
    guideNext();
  }
  function makeStats(matches){
    const stats=$('gcm-stats');stats.replaceChildren();
    const entries=[['🌿','Open slots',state.offers.filter(o=>o.status==='open').length],
      ['🌏','Countries',new Set(state.offers.filter(o=>o.status==='open').map(o=>o.country_code)).size],
      ['🤝','Possible matches',matches.length],['♡','Saved partners',state.shortlists.length]];
    for(const [icon,label,value] of entries){const box=node('div','gc-match-stat');box.append(node('span','gc-match-stat-icon',icon),node('strong','',String(value)),node('span','gc-match-stat-label',label));stats.append(box);}
    $('gcm-match-nav-count').textContent=String(matches.length);
  }
  function offerCard(o){
    const item=node('article','gc-match-offer');
    const top=node('div','gc-match-offer-top');
    top.append(node('strong','',`${flag(o.country_code)} ${displayTeacher(o.teacher_id)}`),node('span',o.status==='open'?'gc-match-open-badge':'gc-match-closed-badge',o.status==='open'?'● Open':'Closed'));
    item.append(top,node('p','gc-match-offer-time',`${fmt(o.starts_at,o.timezone)} – ${timeOnly(o.ends_at,o.timezone)}`),
      node('small','',`${o.student_count} students · ${o.room_count} rooms · ${o.age_band}${o.topic?' · '+o.topic:''}`));
    if(!demo){
      const button=node('button','gc-match-small-button',o.status==='open'?'Close slot':'Reopen');button.type='button';
      button.addEventListener('click',async()=>{
        button.disabled=true;try{await setAvailabilityStatus(o.id,o.status==='open'?'closed':'open');await reload();}
        catch(e){notice(e.message||'Could not update availability.',true);button.disabled=false;}
      });item.append(button);
    }
    return item;
  }
  function matchingCard(m,shortlisted){
    const item=node('article','gc-match-candidate');
    const top=node('div','gc-match-candidate-top');
    const names=node('div','gc-match-pair-names');
    const a=node('div','gc-match-pair-person');a.append(node('span','gc-match-pair-flag',flag(m.a.country_code)),node('strong','',displayTeacher(m.a.teacher_id)),node('small','',m.a.country_code));
    const b=node('div','gc-match-pair-person');b.append(node('span','gc-match-pair-flag',flag(m.b.country_code)),node('strong','',displayTeacher(m.b.teacher_id)),node('small','',m.b.country_code));
    names.append(a,node('span','gc-match-connection-icon','↔'),b);
    top.append(names,node('span','gc-match-score',`${m.score}% match`));item.append(top);
    const windowBox=node('div','gc-match-time-summary');
    windowBox.append(node('span','',`⏱ ${m.minutes} minutes together`),node('strong','',`${fmt(m.from,m.a.timezone)} · ${timeOnly(m.from,m.b.timezone)} in ${m.b.country_code}`));
    item.append(windowBox);
    const meta=node('div','gc-match-candidate-meta');
    meta.append(node('span','',`👥 Up to ${m.studentCount} per side`),node('span','',`▦ ${m.rooms} shared rooms`),node('span','',m.gradeCompatible?'✓ Similar school level':'○ Different school levels'));
    item.append(meta);
    const foot=node('div','gc-match-actions');
    if(shortlisted){foot.append(node('span','gc-match-shortlisted','✓ Saved to shortlist'));
      if(!demo){const remove=node('button','gc-match-small-button','Remove');remove.type='button';remove.addEventListener('click',async()=>{remove.disabled=true;try{await removeShortlist(shortlisted.id);await reload();}catch(e){notice(e.message,true);remove.disabled=false;}});foot.append(remove);}}
    else {const button=node('button','gc-match-save-pair','♡ Save this connection');button.type='button';button.disabled=demo;button.title=demo?'Sample preview cannot be saved':'';
      button.addEventListener('click',async()=>{button.disabled=true;try{await saveShortlist(m);await reload();notice('Partner saved to your shortlist. No invitation was sent.');}
        catch(e){notice(e.message,true);button.disabled=false;}});foot.append(button);}
    item.append(foot);return item;
  }
  function emptyResult(message,actionLabel,action){
    const box=node('div','gc-match-empty-state');box.append(node('div','gc-match-empty-icon','🌱'),node('strong','',message));
    const hint=node('p','','Every new availability creates another chance for an exchange.');box.append(hint);
    const button=node('button','gc-match-empty-action',actionLabel);button.type='button';button.addEventListener('click',action);box.append(button);return box;
  }
  function render(){
    const offerList=$('gcm-offer-list'),candidateList=$('gcm-candidate-list');offerList.replaceChildren();candidateList.replaceChildren();
    const showOffers=state.offers.filter(o=>Date.parse(o.ends_at)>Date.now()).slice().sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
    $('gcm-offer-count').textContent=`${showOffers.length} upcoming`;
    if(showOffers.length)for(const offer of showOffers.slice(0,100))offerList.append(offerCard(offer));
    else offerList.append(emptyResult('No availability yet','+ Add your first time',()=>{setMode('form');showStep(0);}));
    const matches=findMatches(state.offers,{minOverlap:Number($('gcm-overlap').value),onlyInternational:$('gcm-country-filter').value==='international'});
    makeStats(matches);
    const term=$('gcm-search').value.trim().toLocaleLowerCase();
    const filtered=matches.filter(m=>[displayTeacher(m.a.teacher_id),displayTeacher(m.b.teacher_id),m.a.country_code,m.b.country_code,m.a.topic,m.b.topic]
      .join(' ').toLocaleLowerCase().includes(term));
    const shortlistMap=new Map(state.shortlists.map(s=>[[s.offer_a,s.offer_b].join(':'),s]));
    if(filtered.length)for(const m of filtered.slice(0,100))candidateList.append(matchingCard(m,shortlistMap.get(m.key)));
    else {
      const noMatches=matches.length===0;
      const box=emptyResult(noMatches?'Your next great connection is waiting':'No matches for these filters',
        noMatches?'✦ Preview how matching works':'Clear filters',
        ()=>{if(noMatches)previewSample();else{$('gcm-search').value='';$('gcm-overlap').value='30';$('gcm-country-filter').value='international';render();}});
      candidateList.append(box);
    }
  }
  async function reload(){
    const version=++loadVersion;notice('Refreshing the exchange community…');
    try{
      const fresh=await loadMatchData();if(version!==loadVersion)return;
      state=fresh;demo=false;populateTeachers();render();
      notice(!state.teachers.length?'No registered teacher records yet. Add a teacher in Teacher Database or explore the sample preview.':'');
    }catch(e){if(version!==loadVersion)return;notice(`Could not load records: ${e.message}`,true);}
  }
  function previewSample(){
    ++loadVersion;
    const start=new Date(Date.now()+48*3600000);start.setUTCMinutes(0,0,0);const base=start.getTime();
    const make=(id,teacher_id,country_code,timezone,offset,minutes,student_count,topic)=>({
      id,teacher_id,country_code,timezone,starts_at:new Date(base+offset*60000).toISOString(),
      ends_at:new Date(base+(offset+minutes)*60000).toISOString(),student_count,room_count:4,age_band:'Upper Secondary',topic,status:'open'
    });
    demo=true;
    state={teachers:[
      {id:'sample-jp',display_name:'Sample teacher (Japan)',schools:{country_code:'JP',name:'Sample school'}},
      {id:'sample-ph',display_name:'Sample teacher (Philippines)',schools:{country_code:'PH',name:'Sample school'}},
      {id:'sample-fr',display_name:'Sample teacher (France)',schools:{country_code:'FR',name:'Sample school'}}
    ],offers:[make('a','sample-jp','JP','Asia/Tokyo',0,90,20,'Culture'),make('b','sample-ph','PH','Asia/Manila',30,90,18,'Culture'),
      make('c','sample-fr','FR','Europe/Paris',40,50,15,'Environment')],shortlists:[]};
    populateTeachers();render();setMode('results');notice('✦ SAMPLE PREVIEW · No real teacher records or database changes. Choose Refresh to return to live data.');
  }
  async function submitAvailability(){
    if(demo){notice('Sample preview is read-only. Press Refresh before saving.',true);setMode('results');return;}
    for(let i=0;i<3;i++)if(!validateStage(i,false)){showStep(i);validateStage(i,true);return;}
    const teacher=selectedTeacher(),country=teacherCountry(teacher),zone=$('gcm-zone').value;
    const slot=makeSlot({date:$('gcm-date').value,startTime:$('gcm-start').value,endTime:$('gcm-end').value,timezone:zone});
    if(slot.error){showStep(1);$('gcm-form-error').textContent=slot.error;return;}
    const submit=$('gcm-save');submit.disabled=true;submit.textContent='Saving…';
    try{
      await createAvailability({teacher_id:teacher.id,country_code:country,timezone:zone,
        starts_at:slot.startsAt,ends_at:slot.endsAt,student_count:Number($('gcm-students').value),room_count:Number($('gcm-rooms').value),
        age_band:$('gcm-band').value,topic:$('gcm-topic').value.trim(),notes:$('gcm-notes').value.trim(),status:'open'});
      await reload();window.location.hash='#/find-session';
      visited.forEach(group=>group.clear());
      showStep(0);
    }catch(e){$('gcm-form-error').textContent=e.message||'Could not save availability.';}
    finally{submit.disabled=false;submit.textContent='Save availability ✓';}
  }
  $('gcm-mode-form').addEventListener('click',()=>{if(demo){setMode('results');notice('Refresh to leave sample preview before registering an availability.',true);return;}setMode('form');});
  $('gcm-mode-results').addEventListener('click',()=>{window.location.hash='#/find-session';});
  $('gcm-see-matches').addEventListener('click',()=>{window.location.hash='#/find-session';});
  $('gcm-step-back').addEventListener('click',()=>showStep(Math.max(0,step-1)));
  $('gcm-step-next').addEventListener('click',()=>{if(validateStage(step))showStep(Math.min(3,step+1));});
  for(const b of root.querySelectorAll('[data-gcm-step]'))b.addEventListener('click',()=>{
    const destination=Number(b.dataset.gcmStep);if(destination<=maxReached)showStep(destination);
  });
  $('gcm-form').addEventListener('keydown',e=>{
    if(e.key==='Enter' && step<3 && e.target.tagName!=='TEXTAREA' && e.target.tagName!=='BUTTON'){
      e.preventDefault();
      if(validateStage(step))showStep(step+1);
    }
  });
  $('gcm-form').addEventListener('submit',async e=>{e.preventDefault();await submitAvailability();});
  $('gcm-form').addEventListener('focusin',e=>{
    if(guideSequence[step].includes(e.target.id))showGuide(e.target.id);
  });
  $('gcm-form').addEventListener('change',e=>{
    if(guideSequence[step].includes(e.target.id))markGuide(e.target.id);
  });
  $('gcm-form').addEventListener('focusout',e=>{
    const id=e.target.id;
    if(guideSequence[step].includes(id)){
      // Existing select values can be confirmed by visiting and leaving.
      markGuide(id);
    }
  });
  $('gcm-teacher').addEventListener('change',updateZone);
  for(const id of ['gcm-date','gcm-start','gcm-end','gcm-students','gcm-rooms','gcm-zone','gcm-band','gcm-topic'])$(id).addEventListener('change',updateContext);
  for(const id of ['gcm-overlap','gcm-country-filter','gcm-search'])$(id).addEventListener(id==='gcm-search'?'input':'change',render);
  $('gcm-refresh').addEventListener('click',()=>reload());
  $('gcm-demo').addEventListener('click',previewSample);
  $('gcm-date').value=localDateTomorrow();showStep(0);
  if(window.location.hash==='#/matching')setMode('results');
  (async()=>{
    try{const response=await fetch(`${import.meta.env.BASE_URL}country-master.json`);
      if(!response.ok)throw Error('Country master unavailable');const data=await response.json();
      if(data.countries?.length!==197)throw Error('197-country master is invalid');countries=new Map(data.countries.map(c=>[c.code,c]));
    }catch(e){notice(`Country master error: ${e.message}`,true);}
    await reload();
  })();
}
