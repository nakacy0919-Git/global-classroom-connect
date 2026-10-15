import '../../styles/sessionsV7.css';
import {getEvents,addEvent,updateEvent} from '../../services/eventService.js';
import {toUtc} from '../../lib/matching.js';
import {isEnglishName} from '../../lib/englishNames.js';
import {updateRegistrationNames} from '../../services/sessionManagerService.js';
import {issueSessionCode,listSessionCodes,revokeSessionCode,listSessionSignups,reviewSessionSignup} from '../../services/sessionRosterService.js';

const $ = id => document.getElementById(id);
const el = (tag,cls='',text='') => {
  const n=document.createElement(tag); if(cls)n.className=cls; n.textContent=String(text); return n;
};
const fmt = (iso,zone='Asia/Tokyo') => {
  try{return new Intl.DateTimeFormat('en',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));}
  catch{return 'Date not set';}
};
const flag = code => /^[A-Z]{2}$/.test(code||'') ? [...code].map(c=>String.fromCodePoint(c.charCodeAt()+127397)).join('') : '🌍';
let selectedEventId = '';
let activeTab = 'prepare';
const tabs = [
  ['prepare','01  Invite teachers'],
  ['registrations','02  Registrations'],
  ['rooms','03  Arrange rooms'],
  ['share','04  Share plan']
];

export function SessionsPage(){return `
<section class="gcc-s7" aria-label="Manage exchange sessions">
  <div class="gcc-s7-toolbar">
    <div><span class="gcc-s7-eyebrow">GLOBAL CLASSROOM CONNECT</span><p>One session. One clear path.</p></div>
    <button class="gcc-s7-primary" id="gcc-s7-new" type="button">+ New session</button>
  </div>
  <div class="gcc-s7-create" id="gcc-s7-create" hidden>
    <form id="gcc-s7-create-form" class="gcc-s7-form">
      <label>Session name <input name="title" maxlength="140" required placeholder="e.g. ONLINE MATE — Food & Culture" /></label>
      <label>Date <input name="date" type="date" required /></label>
      <label>Start time <input name="time" type="time" required /></label>
      <label>Time zone <select name="timezone"><option value="Asia/Tokyo">Japan (JST)</option><option value="Asia/Manila">Philippines</option><option value="Asia/Ho_Chi_Minh">Vietnam</option><option value="Asia/Jakarta">Indonesia (Jakarta)</option><option value="Asia/Kuala_Lumpur">Malaysia</option><option value="Asia/Colombo">Sri Lanka</option><option value="Europe/London">United Kingdom</option><option value="America/New_York">US Eastern</option></select></label>
      <div class="gcc-s7-form-actions"><button type="button" id="gcc-s7-cancel" class="gcc-s7-quiet">Cancel</button><button class="gcc-s7-primary" type="submit">Create draft</button></div>
    </form>
  </div>
  <section class="gcc-s7-session-strip" aria-label="Current session">
    <label class="gcc-s7-picker-label" for="gcc-s7-picker">
      <span>CHOOSE A SESSION</span>
      <select id="gcc-s7-picker" aria-label="Choose a session"><option value="">Loading sessions…</option></select>
    </label>
    <div id="gcc-s7-selected" class="gcc-s7-selected"></div>
  </section>
  <section class="gcc-s7-workspace" aria-label="Session setup">
    <nav class="gcc-s7-tabs" role="tablist" aria-label="Session workflow">${tabs.map(([id,label])=>`<button type="button" data-s7-tab="${id}" role="tab" aria-selected="${id==='prepare'?'true':'false'}">${label}</button>`).join('')}</nav>
    <div class="gcc-s7-workarea">
      <div id="gcc-s7-panel" class="gcc-s7-panel" role="tabpanel"></div>
      <aside id="gcc-s7-metrics" class="gcc-s7-metrics" aria-label="Session at a glance" aria-live="polite"></aside>
    </div>
  </section>
  <p id="gcc-s7-message" role="status" aria-live="polite" class="gcc-s7-message"></p>
  <div id="gcc-s7-edit-wrap" class="gcc-s7-modal-wrap" hidden>
    <div class="gcc-s7-modal" role="dialog" aria-modal="true" aria-labelledby="gcc-s7-edit-heading">
      <div class="gcc-s7-modal-head"><h3 id="gcc-s7-edit-heading">Edit registered names</h3><button type="button" id="gcc-s7-edit-close" class="gcc-s7-quiet">Close</button></div>
      <p class="gcc-s7-hint">Use A–Z English spelling. Changes to approved student names are also reflected in the Participant Pool.</p><p id="gcc-s7-edit-error" class="gcc-s7-message error" role="alert"></p>
      <form id="gcc-s7-edit-form"><label>Teacher name <input id="gcc-s7-edit-teacher" required maxlength="120" /></label><div id="gcc-s7-edit-students" class="gcc-s7-edit-students"></div><div class="gcc-s7-form-actions"><button type="button" id="gcc-s7-edit-cancel" class="gcc-s7-quiet">Cancel</button><button type="submit" class="gcc-s7-primary">Save names</button></div></form>
    </div>
  </div>
</section>`;}

export function bindSessionsPage(){
  const root=document.querySelector('.gcc-s7');if(!root)return;
  let events=[],signups=[],codes=[],secret='',editSignup=null;
  const msg=(text,isError=false)=>{const m=$('gcc-s7-message');m.textContent=text;m.classList.toggle('error',isError);};
  const active=()=>events.find(e=>e.id===selectedEventId)||null;
  const guests=()=>signups.filter(s=>s.event_id===selectedEventId);
  const counts=s=>({students:(s.students||[]).length,facilitators:(s.facilitators||[]).length});
  const button=(text,cls,onClick)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',onClick);return b;};
  const line=(title,caption='',right=null)=>{
    const row=el('div','gcc-s7-line');const info=el('div');info.append(el('strong','',title));if(caption)info.append(el('small','',caption));row.append(info);if(right)row.append(right);return row;
  };
  function paintMetrics(){
    const box=$('gcc-s7-metrics');box.replaceChildren();
    const event=active(),list=guests(),approved=list.filter(s=>s.status==='approved');
    const pending=list.filter(s=>s.status==='pending').length;
    const students=approved.reduce((n,s)=>n+counts(s).students,0);
    box.append(el('h3','','Session at a glance'));
    for(const [label,value] of [['Schools confirmed',approved.length],['Waiting for review',pending],['Students',students]]){
      const row=el('div','gcc-s7-mini-stat');row.append(el('span','',label),el('b','',value));box.append(row);
    }
    const next=!event?'Create a session':event.status==='draft'?'Publish the session':pending?'Review new registrations':approved.length?'Arrange breakout rooms':'Invite your teachers';
    const hint=el('div','gcc-s7-next');hint.append(el('small','','NEXT STEP'),el('strong','',next));box.append(hint);
  }
  function paintEvents(){
    const picker=$('gcc-s7-picker');picker.replaceChildren();
    if(!events.length){const o=el('option','','No sessions yet');o.value='';picker.append(o);picker.disabled=true;return;}
    picker.disabled=false;
    for(const event of events){
      const option=el('option','',event.title);option.value=event.id;picker.append(option);
    }
    picker.value=selectedEventId;
  }
  function paintSelected(){const box=$('gcc-s7-selected');box.replaceChildren();const e=active();if(!e){box.append(el('strong','', 'Select a session'));return;}
    const info=el('div');info.append(el('h2','',e.title),el('p','',`${fmt(e.starts_at,e.timezone)} · ${e.timezone||'Asia/Tokyo'}`));box.append(info);
    const status=el('span',`gcc-s7-state ${e.status}`,e.status);box.append(status);
  }
  function paintTabs(){for(const b of root.querySelectorAll('[data-s7-tab]')){const on=b.dataset.s7Tab===activeTab;b.classList.toggle('is-active',on);b.setAttribute('aria-selected',String(on));}}
  function note(text){return el('p','gcc-s7-hint',text);}
  function paintPrepare(box,e){
    const heading=el('div','gcc-s7-section-top');heading.append(el('h3','','Invite teachers'));
    if(e.status==='draft'){
      heading.append(button('Publish session','gcc-s7-primary',async()=>{
        try{if(!e.starts_at||new Date(e.starts_at)<=new Date())throw Error('Please set a future start time before publishing.');
          await updateEvent(e.id,{status:'published'});await reload();msg('Session published. Teachers can now register.');}
        catch(err){msg(err.message,true);}
      }));
    }
    box.append(heading);
    if(e.status!=='published'){
      box.append(note(e.status==='draft'?'Publish this session before inviting teachers.':'Registration is not open for this session.'));
      return;
    }
    box.append(note('Create a private invitation for each teacher.'));
    const invite=el('section','gcc-s7-invite');
    const controls=el('div','gcc-s7-inline-form');const input=el('input');input.id='gcc-s7-invite-label';input.maxLength=120;
    input.placeholder='Teacher or school (e.g. Maria · Philippines)';input.setAttribute('aria-label','Invitation label');
    const issue=button('Generate invite code','gcc-s7-primary',async()=>{
      if(!input.value.trim()){msg('Enter a teacher or school label first.',true);input.focus();return;}
      issue.disabled=true;
      try{const r=await issueSessionCode(input.value.trim());secret=r.code;
        const reveal=$('gcc-s7-new-secret');reveal.hidden=false;$('gcc-s7-code-text').textContent=secret;
        await loadCodes();paintCodes();msg('Invitation created. Please copy it now.');}
      catch(err){msg(err.message,true);}finally{issue.disabled=false;}
    });
    controls.append(input,issue);invite.append(controls);
    const secretWrap=el('div','gcc-s7-secret');secretWrap.id='gcc-s7-new-secret';secretWrap.hidden=!secret;
    const text=el('code','',secret);text.id='gcc-s7-code-text';secretWrap.append(text);
    secretWrap.append(button('Copy invite link + code','gcc-s7-primary',async()=>{
      const url=`${location.origin}${location.pathname}#/session-join`;
      const body=`Global Classroom Connect\nRegistration: ${url}\nYour invitation code: ${secret}\nSelect session: ${e.title}`;
      try{await navigator.clipboard.writeText(body);
        msg(['localhost','127.0.0.1'].includes(location.hostname)?'Copied for local testing. Use your deployed Vercel link for overseas teachers.':'Invitation copied.', ['localhost','127.0.0.1'].includes(location.hostname));}
      catch{msg('Clipboard blocked. Select and copy the code manually.',true);}
    }));invite.append(secretWrap);
    const issued=el('details','gcc-s7-issued');const summary=el('summary','',`Issued invitations (${codes.length})`);issued.append(summary);
    const codeList=el('div');codeList.id='gcc-s7-codes';issued.append(codeList);invite.append(issued);
    box.append(invite);paintCodes();
  }
  function paintCodes(){const target=$('gcc-s7-codes');if(!target)return;target.replaceChildren();if(!codes.length){target.append(note('No codes issued.'));return;}
    for(const c of codes.slice(0,16)){const invalid=c.revoked_at?'Revoked':Date.parse(c.expires_at)<Date.now()?'Expired':'Active';
      target.append(line(c.label||'Teacher invitation',`${invalid} · expires ${fmt(c.expires_at,'UTC')} UTC`,(!c.revoked_at&&invalid==='Active')?button('Revoke','gcc-s7-quiet',async()=>{
        if(!confirm(`Revoke the invite labeled “${c.label}”?`))return;
        try{await revokeSessionCode(c.id);await loadCodes();paintCodes();msg('Invitation revoked.');}catch(err){msg(err.message,true);}}):null));}
  }
  function paintRegistrations(box){const list=guests();const head=el('div','gcc-s7-section-top');head.append(el('h3','','Schools & students'),el('span','gcc-s7-muted',`${list.length} submissions`));box.append(head);
    if(!list.length){box.append(note('No registrations yet. Invite your teachers to join.'));return;}
    for(const s of list){const c=counts(s),card=el('article','gcc-s7-signup');const h=el('div','gcc-s7-signup-head');const info=el('div');
      info.append(el('strong','',`${flag(s.country_code)} ${s.school_name}`),el('small','',`${s.teacher_name} · ${s.country_name} · ${c.students} students · ${c.facilitators} facilitators`));
      h.append(info,el('span',`gcc-s7-state ${s.status}`,s.status));card.append(h);
      const details=el('details');details.append(el('summary','','See names and facilitators'));const names=el('div','gcc-s7-name-grid');
      for(const p of s.students||[])names.append(el('span','',`${p.name}${p.grade?' · '+p.grade:''}`));
      details.append(names,note(`Facilitators: ${(s.facilitators||[]).join(', ')||'None registered'}`));card.append(details);
      const actions=el('div','gcc-s7-actions');if(s.status!=='declined')actions.append(button('Edit names','gcc-s7-quiet',()=>openEditor(s)));
      if(s.status==='pending'){
        actions.append(button('Decline','gcc-s7-quiet',()=>review(s,false)),button('Approve registration','gcc-s7-primary',()=>review(s,true)));
      }card.append(actions);box.append(card);
    }
  }
  function paintRooms(box,e){box.append(el('h3','','Arrange breakout rooms'));
    const approved=guests().filter(s=>s.status==='approved');const total=approved.reduce((n,s)=>n+counts(s).students,0);
    const uniqueFac=new Set(approved.flatMap(s=>s.facilitators||[]).map(s=>s.toLowerCase()));
    box.append(line('Approved students',`${total} students in ${approved.length} schools`));box.append(line('Available facilitators',`${uniqueFac.size} names submitted`));
    box.append(note('The existing Room Builder can already mix schools/countries and create multiple rounds. V7.1 will add manual dragging, configurable mixing rules and 1–2 facilitators per room here.'));
    const acts=el('div','gcc-s7-actions');const go=el('a','gcc-s7-primary','Open Room Builder →');go.href='#/rooms';acts.append(go);const rounds=el('a','gcc-s7-quiet','View saved rounds');rounds.href='#/round-overview';acts.append(rounds);box.append(acts);
  }
  function paintShare(box){box.append(el('h3','','Share the final plan'));
    box.append(note('The online seating chart and Zoom URL sharing will be built in V7.2. A link is not published until the host confirms the final room plan.'));
    box.append(line('Registration link','Ready now — share with each teacher’s private invite code.'));
    box.append(line('Breakout room seating chart','Not published yet.'));
    box.append(line('Zoom invitation','Not configured in this version.'));
  }
  function paintPanel(){const box=$('gcc-s7-panel');box.replaceChildren();const e=active();if(!e){box.append(el('p','gcc-s7-empty','Create or select a session to get started.'));return;}
    if(activeTab==='prepare')paintPrepare(box,e);if(activeTab==='registrations')paintRegistrations(box);if(activeTab==='rooms')paintRooms(box,e);if(activeTab==='share')paintShare(box);
  }
  function paint(){paintMetrics();paintEvents();paintSelected();paintTabs();paintPanel();}
  async function review(s,approved){if(!confirm(`${approved?'Approve and import':'Decline'} registration from ${s.school_name}?`))return;
    try{await reviewSessionSignup(s.id,approved);await reload();msg(approved?'Registration approved and students imported.':'Registration declined.');}catch(err){msg(err.message,true);}}
  function openEditor(s){editSignup=s;const wrap=$('gcc-s7-edit-wrap');$('gcc-s7-edit-error').textContent='';$('gcc-s7-edit-teacher').value=s.teacher_name;
    const box=$('gcc-s7-edit-students');box.replaceChildren();for(const [i,p] of (s.students||[]).entries()){
      const row=el('div','gcc-s7-edit-row');row.dataset.studentId=p.id;
      const name=el('input');name.name='student_name';name.maxLength=120;name.value=p.name;name.required=true;name.setAttribute('aria-label',`Student ${i+1} name`);
      const grade=el('input');grade.name='student_grade';grade.maxLength=40;grade.value=p.grade||'';grade.setAttribute('aria-label',`Student ${i+1} grade`);
      row.append(el('span','gcc-s7-index',i+1),name,grade);box.append(row);
    }wrap.hidden=false;$('gcc-s7-edit-teacher').focus();}
  function closeEditor(){editSignup=null;$('gcc-s7-edit-wrap').hidden=true;}
  async function reload(){try{const [e,s,c]=await Promise.all([getEvents(),listSessionSignups(),listSessionCodes()]);
    events=e||[];signups=s||[];codes=c||[];
    if(!events.some(x=>x.id===selectedEventId))selectedEventId=events.find(x=>x.status==='published')?.id||events[0]?.id||'';
    paint();
  }catch(err){msg(`Could not load sessions: ${err.message}`,true);}}
  async function loadCodes(){codes=await listSessionCodes()||[];}
  $('gcc-s7-picker').addEventListener('change',event=>{selectedEventId=event.target.value;activeTab='prepare';secret='';paint();msg('');});
  for(const tab of root.querySelectorAll('[data-s7-tab]'))tab.addEventListener('click',()=>{activeTab=tab.dataset.s7Tab;paintTabs();paintPanel();msg('');});
  $('gcc-s7-new').addEventListener('click',()=>{$('gcc-s7-create').hidden=false;root.querySelector('[name=title]').focus();});
  $('gcc-s7-cancel').addEventListener('click',()=>{$('gcc-s7-create').hidden=true;});
  $('gcc-s7-create-form').addEventListener('submit',async evt=>{evt.preventDefault();const form=evt.currentTarget;const f=new FormData(form);const title=String(f.get('title')||'').trim(),date=String(f.get('date')||''),time=String(f.get('time')||''),zone=String(f.get('timezone')||'Asia/Tokyo');
    const utc=toUtc(date,time,zone);if(utc.error){msg(utc.error,true);return;}if(Date.parse(utc.iso)<=Date.now()){msg('Please choose a future start time.',true);return;}
    const submit=form.querySelector('[type=submit]');submit.disabled=true;try{const row=await addEvent({title,startsAt:utc.iso,timezone:zone,status:'draft'});
      selectedEventId=row.id;activeTab='prepare';form.reset();$('gcc-s7-create').hidden=true;await reload();msg('Draft created. Publish it when you are ready to invite teachers.');
    }catch(err){msg(err.message,true);}finally{submit.disabled=false;}});
  $('gcc-s7-edit-close').addEventListener('click',closeEditor);$('gcc-s7-edit-cancel').addEventListener('click',closeEditor);
  $('gcc-s7-edit-form').addEventListener('submit',async evt=>{evt.preventDefault();if(!editSignup)return;
    const teacher=$('gcc-s7-edit-teacher').value.trim();const rows=[...root.querySelectorAll('.gcc-s7-edit-row')].map(row=>({
      id:row.dataset.studentId,name:row.querySelector('[name=student_name]').value.trim(),grade:row.querySelector('[name=student_grade]').value.trim()
    }));
    const bad=rows.findIndex(row=>!isEnglishName(row.name));if(!isEnglishName(teacher)){$('gcc-s7-edit-error').textContent='Teacher name must use A–Z English letters, spaces or name punctuation.';return;}
    if(bad>=0){$('gcc-s7-edit-error').textContent=`Student row ${bad+1} needs an English (A–Z) name.`;return;}
    const submit=evt.currentTarget.querySelector('[type=submit]');submit.disabled=true;
    try{await updateRegistrationNames(editSignup.id,teacher,rows);closeEditor();await reload();activeTab='registrations';paintTabs();paintPanel();msg('Names updated and synchronized with the participant list.');}
    catch(err){$('gcc-s7-edit-error').textContent=`Could not save names: ${err.message}`;}finally{submit.disabled=false;}
  });
  reload();
}
