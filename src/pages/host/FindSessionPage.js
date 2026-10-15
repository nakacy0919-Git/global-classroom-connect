// GCC_SESSION_SPLIT_V3: host-only browsing; teacher self-service requires account security.
import '../../styles/findSession.css';
import '../../styles/sessionWorkspacePolish.css'; // GCC_WORKFLOW_POLISH_V41
import '../../styles/requestSession.css'; // GCC_JOIN_V4
import {loadSessionJoinRequests,requestSessionJoin} from '../../services/sessionJoinRequestService.js';
import {eligibleRequesters,requestForPair} from '../../lib/joinRequestRules.js';
import {loadMatchData} from '../../services/matchingService.js';
import {buildSearchWindow,filterSessionOffers} from '../../lib/sessionSearch.js';

const el=(tag,className='',text='')=>{
  const e=document.createElement(tag);e.className=className;e.textContent=text;return e;
};
const flag=code=>/^[A-Z]{2}$/.test(code||'')
  ? [...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join(''):'🌍';
const local=(iso,zone,opts={})=>{
  try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,day:'numeric',month:'short',
    weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',...opts}).format(new Date(iso));}
  catch{return 'Time unavailable';}
};
const clock=(iso,zone)=>local(iso,zone,{weekday:undefined,day:undefined,month:undefined});
const item=(label,body)=>{const row=el('div','gcf-info-row');row.append(el('span','',label),el('strong','',body));return row;};

export function FindSessionPage() {
  return `
  <section class="gcf-page" aria-label="Find a Session">
    <header class="gcf-hero">
      <div class="gcf-hero-symbol" aria-hidden="true">🔎</div>
      <div class="gcf-hero-copy"><p>GLOBAL CLASSROOM · FIND</p><h2>Find a Session</h2>
        <span>Find international classroom exchanges that fit your available time.</span></div>
      <a href="#/register-session" class="gcf-side-link">＋ Register a Session <span aria-hidden="true">↗</span></a>
    </header>
    <div class="gcf-main">
      <form class="gcf-filter-panel" id="gcf-form" novalidate>
        <div class="gcf-subhead"><span class="gcf-step">01 · YOUR AVAILABILITY</span><h3>When can you join?</h3></div>
        <p class="gcf-intro">Use your own local time. Leave the date empty to browse all upcoming sessions.</p>
        <label class="gcf-field"><span>Preferred date</span><input type="date" id="gcf-date"></label>
        <label class="gcf-field"><span>Your time zone <b>*</b></span><select id="gcf-zone" required></select></label>
        <div class="gcf-time-grid">
          <label class="gcf-field"><span>From</span><input type="time" id="gcf-from" value="09:00" required></label>
          <label class="gcf-field"><span>Until</span><input type="time" id="gcf-until" value="12:00" required></label>
        </div>
        <div class="gcf-subhead gcf-optional-head"><span class="gcf-step">02 · OPTIONAL</span><h3>What are you looking for?</h3></div>
        <label class="gcf-field"><span>Country</span><select id="gcf-country"><option value="">Any country</option></select></label>
        <label class="gcf-field"><span>School level</span><select id="gcf-level">
          <option value="">Any school level</option>
          <option value="Primary">Primary / Elementary</option>
          <option value="Lower Secondary">Junior high</option>
          <option value="Upper Secondary">High school</option>
          <option value="University">University</option>
          <option value="Mixed">Mixed ages</option></select></label>
        <label class="gcf-field"><span>Topic, country or school</span><input id="gcf-query" type="search" placeholder="e.g. Food, Culture, Philippines"></label>
        <p id="gcf-error" role="alert" class="gcf-error" hidden></p>
        <button id="gcf-submit" type="submit" class="gcf-primary"><span>⌕</span> Search Sessions <span aria-hidden="true">→</span></button>
        <button id="gcf-clear" type="button" class="gcf-clear">Clear filters · See all upcoming</button>
      </form>
      <section class="gcf-results" aria-label="Available Sessions">
        <div class="gcf-results-top"><div><span class="gcf-step">MATCHING OPPORTUNITIES</span><h3>Available Sessions</h3></div>
          <span class="gcf-result-count" id="gcf-count">Loading…</span></div>
        <div class="gcf-current-search" id="gcf-summary">Upcoming international opportunities</div>
        <div class="gcf-list" id="gcf-list" aria-live="polite"><p class="gcf-intro">Loading available sessions…</p></div>
        <footer class="gcf-footnote">Host-managed applications. Teacher self-service requires account permissions and is not enabled yet.</footer>
      </section>
    </div>
    <dialog class="gcf-join-dialog" id="gcf-join-dialog" aria-labelledby="gcf-request-title">
      <form id="gcf-join-form" novalidate>
        <h3 id="gcf-request-title">Request to Join</h3>
        <p id="gcf-request-session">Choose a teacher who wants to participate.</p>
        <p class="gcf-request-helper">Host-assisted request: choose the applicant teacher. No email or invitation is sent.</p>
        <label class="gcf-request-label">Applicant teacher / school *<select id="gcf-request-teacher" required></select></label>
        <label class="gcf-request-label">Message (optional)<textarea id="gcf-request-message" maxlength="500" placeholder="e.g. We have 20 students and would love to join your exchange."></textarea></label>
        <p id="gcf-request-error" class="gcf-request-error" role="alert" hidden></p>
        <div class="gcf-request-actions"><button type="button" id="gcf-request-cancel" class="gcf-request-cancel">Cancel</button>
          <button type="submit" id="gcf-request-send" class="gcf-request-submit">Send request →</button></div>
      </form>
    </dialog>
  </section>`;
}

export function bindFindSessionPage() {
  const root=document.querySelector('.gcf-page');if(!root)return;
  // GCC_WORKFLOW_POLISH_V41: one title, a visible search CTA, optional advanced filters.
  // Move existing elements, retaining the original IDs, listeners and form submission.
  const findHero=root.querySelector('.gcf-hero');
  const registerLink=findHero?.querySelector('.gcf-side-link');
  const resultHeading=root.querySelector('.gcf-results-top');
  if(!findHero||!registerLink||!resultHeading)throw Error('Find page layout has changed.');
  resultHeading.append(registerLink);
  findHero.remove();
  const findForm=root.querySelector('#gcf-form');
  const timeFields=findForm?.querySelector('.gcf-time-grid');
  const searchButton=findForm?.querySelector('#gcf-submit');
  const clearButton=findForm?.querySelector('#gcf-clear');
  const feedback=findForm?.querySelector('#gcf-error');
  const optionalHeading=findForm?.querySelector('.gcf-optional-head');
  const advancedIds=['gcf-country','gcf-level','gcf-query'];
  const advancedFields=advancedIds.map(id=>findForm?.querySelector('#'+id)?.closest('.gcf-field'));
  if(!timeFields||!searchButton||!clearButton||!feedback||!optionalHeading||advancedFields.some(e=>!e))
    throw Error('Find search controls are not where expected.');
  const actions=document.createElement('div');
  actions.className='gcf-search-actions';
  timeFields.after(feedback,actions);
  actions.append(searchButton,clearButton);
  const more=document.createElement('details');
  more.className='gcf-more-filters';
  const moreTitle=document.createElement('summary');
  moreTitle.textContent='More filters · Country, level & topic';
  more.append(moreTitle,...advancedFields);
  optionalHeading.replaceWith(more);

  const $=id=>root.querySelector('#'+id);
  let state={teachers:[],offers:[],shortlists:[]};let master=[];let selectedWindow={from:null,to:null};
  let joinRequests=[];let activeOffer=null; // GCC_JOIN_V4
  let applied={country:'',level:'',query:''};
  const zone=$('gcf-zone');
  const detected=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Tokyo';
  const timezones=new Set([detected,'Asia/Tokyo','Asia/Manila','Asia/Bangkok','Asia/Jakarta',
    'Asia/Kolkata','Europe/London','Europe/Paris','Europe/Moscow','America/New_York',
    'America/Los_Angeles','America/Sao_Paulo','Australia/Sydney',
    ...(Intl.supportedValuesOf?.('timeZone')||[])]);
  for(const value of timezones){
    const option=el('option','',value);option.value=value;zone.append(option);
  }
  zone.value=detected;
  const teacherById=()=>new Map(state.teachers.map(t=>[t.id,t]));
  function openRequest(offer){
    activeOffer=offer;
    const host=teacherById().get(offer.teacher_id);
    $('gcf-request-session').textContent=(host?.display_name||'Session host')+' · '+(offer.topic||'Open classroom exchange');
    const select=$('gcf-request-teacher');select.replaceChildren();
    const existing=joinRequests.filter(r=>r.offer_id===offer.id);
    const all=eligibleRequesters(state.teachers,offer);
    const eligible=all.filter(t=>!requestForPair(existing,offer.id,t.id));
    for(const teacher of eligible){
      const opt=el('option','',flag(teacher.schools?.country_code)+' '+teacher.display_name+' · '+teacher.schools?.name);
      opt.value=teacher.id;select.append(opt);
    }
    const error=$('gcf-request-error');error.hidden=true;
    $('gcf-request-message').value='';
    $('gcf-request-send').disabled=!eligible.length;
    if(!eligible.length){
      error.textContent=all.length
        ?'Every eligible teacher has already requested this session.'
        :'Add another teacher with a school in Teacher Database before requesting.';
      error.hidden=false;
    }
    $('gcf-join-dialog').showModal();
  }
  const countryName=code=>master.find(c=>c.code===code)?.name||
    state.teachers.find(t=>t.schools?.country_code===code)?.schools?.country_name||code;

  function buildDetails(offer,teacher){
    const details=el('details','gcf-details');
    details.append(el('summary','','View session details'));
    const info=el('div','gcf-details-content');
    info.append(item('School',teacher?.schools?.name||'School not specified'));
    info.append(item('School level',offer.age_band));
    info.append(item('Participants',`${offer.student_count} students · ${offer.room_count} breakout rooms`));
    info.append(item('Host local time',`${local(offer.starts_at,offer.timezone)} – ${clock(offer.ends_at,offer.timezone)} (${offer.timezone})`));
    if(offer.topic)info.append(item('Topic',offer.topic));
    if(offer.notes)info.append(item('Notes',offer.notes));
    const received=joinRequests.filter(r=>r.offer_id===offer.id);
    if(received.length)info.append(el('p','gcf-request-count',String(received.length)+' join request(s) received'));
    const request=el('button','gcf-request-cta','＋ Request to Join →');request.type='button';
    request.addEventListener('click',()=>openRequest(offer));
    info.append(request);
    details.append(info);return details;
  }
  function offerCard(offer,byTeacher) {
    const teacher=byTeacher.get(offer.teacher_id);
    const card=el('article','gcf-session-card');
    const header=el('div','gcf-session-heading');
    const flagBox=el('span','gcf-flag',flag(offer.country_code));
    const title=el('div','gcf-session-title');
    title.append(el('span','gcf-country',countryName(offer.country_code)),
      el('h4','',offer.topic?.trim()||'Open classroom exchange'));
    header.append(flagBox,title,el('span','gcf-open','Open'));
    const when=el('div','gcf-big-time',`${local(offer.starts_at,zone.value)} – ${clock(offer.ends_at,zone.value)}`);
    const sub=el('p','gcf-local-context',`Your local time · ${zone.value}`);
    const facts=el('div','gcf-facts');
    facts.append(el('span','',`👨‍🏫 ${teacher?.display_name||'Registered teacher'}`),
      el('span','',`👥 ${offer.student_count} students`),el('span','',`▦ ${offer.room_count} rooms`));
    card.append(header,when,sub,facts,buildDetails(offer,teacher));
    return card;
  }
  function show() {
    const list=$('gcf-list');list.replaceChildren();
    const results=filterSessionOffers(state.offers,{...selectedWindow,...applied},state.teachers);
    $('gcf-count').textContent=`${results.length} session${results.length===1?'':'s'}`;
    $('gcf-summary').textContent=selectedWindow.from
      ?`Showing availability overlapping your selected time · ${zone.value}`
      :'Showing all upcoming open sessions · Use the filters to narrow your search';
    if(results.length){
      const teachers=teacherById();
      for(const offer of results.slice(0,100))list.append(offerCard(offer,teachers));
      if(results.length>100)list.append(el('p','gcf-intro',`Showing first 100 of ${results.length} results. Refine your search.`));
    } else {
      const empty=el('div','gcf-empty');
      empty.append(el('span','gcf-empty-icon','🌱'),el('h4','','No sessions match these conditions'),
        el('p','','Try another time or country. You can also register a new session availability.'));
      const links=el('div','gcf-empty-actions');
      const reset=el('button','gcf-secondary','Clear search');reset.type='button';reset.addEventListener('click',clear);
      const register=el('a','gcf-primary-link','＋ Register a Session →');register.href='#/register-session';
      links.append(reset,register);empty.append(links);list.append(empty);
    }
  }
  function clear() {
    $('gcf-form').reset();zone.value=detected;
    selectedWindow={from:null,to:null};applied={country:'',level:'',query:''};
    $('gcf-error').hidden=true;show();
  }
  function search(event){
    event?.preventDefault();
    const window=buildSearchWindow({date:$('gcf-date').value,
      startTime:$('gcf-from').value,endTime:$('gcf-until').value,timezone:zone.value});
    if(window.error){$('gcf-error').textContent=window.error;$('gcf-error').hidden=false;return;}
    $('gcf-error').hidden=true;selectedWindow=window;
    applied={country:$('gcf-country').value,level:$('gcf-level').value,query:$('gcf-query').value};
    show();
  }
  $('gcf-request-cancel').addEventListener('click',()=>{ $('gcf-join-dialog').close(); });
  $('gcf-join-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const id=$('gcf-request-teacher').value;
    const msg=$('gcf-request-message').value.trim();
    const err=$('gcf-request-error'),button=$('gcf-request-send');
    if(!activeOffer||!id){err.textContent='Select an applicant teacher.';err.hidden=false;return;}
    if(!eligibleRequesters(state.teachers,activeOffer).some(t=>t.id===id)){
      err.textContent='Invalid applicant selection.';err.hidden=false;return;
    }
    button.disabled=true;button.textContent='Saving request…';
    try{
      await requestSessionJoin(activeOffer.id,id,msg);
      joinRequests=await loadSessionJoinRequests();
      $('gcf-join-dialog').close();
      show();
      $('gcf-summary').textContent='✓ Request saved as pending. Review it in Join Requests. No invitation was sent.';
    }catch(e){err.textContent=e?.message||'Could not save join request.';err.hidden=false;}
    finally{button.disabled=false;button.textContent='Send request →';}
  });
  $('gcf-form').addEventListener('submit',search);
  $('gcf-clear').addEventListener('click',clear);
  (async()=>{
    try{
      const [data,countryResponse,requests]=await Promise.all([
        loadMatchData(),fetch(`${import.meta.env.BASE_URL}country-master.json`),loadSessionJoinRequests()
      ]);
      state=data;joinRequests=requests;
      if(countryResponse.ok){const countryData=await countryResponse.json();master=countryData.countries||[];}
      const select=$('gcf-country');
      const codes=[...new Set(state.offers.map(o=>o.country_code).filter(Boolean))]
        .sort((a,b)=>countryName(a).localeCompare(countryName(b)));
      for(const code of codes){const option=el('option','',`${flag(code)} ${countryName(code)}`);option.value=code;select.append(option);}
      show();
    }catch(e){$('gcf-count').textContent='Could not load';$('gcf-list').replaceChildren(el('p','gcf-error',e?.message||'Data could not be loaded.'));}
  })();
}
