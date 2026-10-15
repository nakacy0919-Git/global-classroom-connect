import '../../styles/sessionSignupV6.css';
import {getEvents} from '../../services/eventService.js';
import {issueSessionCode,listSessionCodes,revokeSessionCode,listSessionSignups,reviewSessionSignup} from '../../services/sessionRosterService.js';
const $=id=>document.getElementById(id);
const el=(tag,cls='',text='')=>{const x=document.createElement(tag);x.className=cls;x.textContent=text;return x;};
const flag=code=>/^[A-Z]{2}$/.test(code||'')?[...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join(''):'🌎';
const dt=(value,zone)=>{try{return new Intl.DateTimeFormat('en',{timeZone:zone||'UTC',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));}catch{return value||'';}};
export function SessionControlPage(){return `
<section class="gcc-v6 gcc-v6-host"><div class="gcc-v6-header"><span class="gcc-v6-logo">🌍</span><div><span class="gcc-v6-kicker">HOST · SESSION MANAGEMENT</span><h2>Invite teachers & manage rosters</h2></div></div>
 <div class="gcc-v6-host-grid">
   <section class="gcc-v6-card"><div class="gcc-v6-card-head"><h3>1. Share registration link</h3><span>Private per-teacher codes</span></div>
   <p class="gcc-v6-helper">Teachers see all published sessions. Give each teacher a separate code; the code is shown only once.</p>
   <label class="gcc-v6-label">Label (for your records) <input id="gcc-v6-invite-label" maxlength="120" placeholder="e.g. Philippines · Maria" /></label>
   <button class="gcc-v6-primary" type="button" id="gcc-v6-generate">Generate teacher code ↗</button>
   <div id="gcc-v6-new-code" class="gcc-v6-secret" hidden><strong>Give this code to the teacher now</strong><code id="gcc-v6-secret-value"></code><button type="button" id="gcc-v6-copy-code" class="gcc-v6-secondary">Copy invitation</button></div>
   <div class="gcc-v6-section-label">Issued invitations</div><div id="gcc-v6-code-list" class="gcc-v6-invites">Loading…</div>
   </section>
   <section class="gcc-v6-card"><div class="gcc-v6-card-head"><h3>2. Published sessions</h3><a class="gcc-v6-secondary" href="#/events">Manage Events ↗</a></div>
   <div id="gcc-v6-events">Loading…</div><p class="gcc-v6-helper">Only published sessions with a future start time appear on the teacher registration form.</p></section>
 </div>
 <section class="gcc-v6-card gcc-v6-wide"><div class="gcc-v6-card-head"><h3>3. Review school registrations</h3><button id="gcc-v6-refresh" class="gcc-v6-secondary" type="button">↻ Refresh</button></div>
 <div id="gcc-v6-summary" class="gcc-v6-summary"></div><div id="gcc-v6-signups">Loading…</div></section>
 <p class="gcc-v6-message" id="gcc-v6-host-message" role="status"></p>
</section>`;}
export function bindSessionControlPage(){
 const root=document.querySelector('.gcc-v6-host');if(!root)return;
 let codes=[],signups=[],events=[];
 const msg=(s,error=false)=>{$('gcc-v6-host-message').textContent=s;$('gcc-v6-host-message').classList.toggle('error',error);};
 function renderEvents(){const box=$('gcc-v6-events');box.replaceChildren();const future=events.filter(e=>e.starts_at&&new Date(e.starts_at)>new Date());
 if(!future.length){box.append(el('p','gcc-v6-helper','No upcoming sessions. Publish a session in Events first.'));return;}
 for(const e of future){const row=el('div','gcc-v6-list-item');const info=el('div');info.append(el('strong','',e.title),el('small','',`${dt(e.starts_at,e.timezone)} · ${e.status}`));row.append(info);if(e.status==='published')row.append(el('span','gcc-v6-ready','Public'));box.append(row);}}
 function renderCodes(){const box=$('gcc-v6-code-list');box.replaceChildren();
 if(!codes.length){box.append(el('p','gcc-v6-helper','No codes issued yet.'));return;}
 for(const code of codes){const row=el('div','gcc-v6-list-item');const info=el('div');info.append(el('strong','',code.label||'Teacher invitation'),el('small','',code.revoked_at?'Revoked':new Date(code.expires_at)<new Date()?'Expired':`Expires ${dt(code.expires_at,'UTC')} UTC`));row.append(info);
 if(!code.revoked_at){const btn=el('button','gcc-v6-secondary','Revoke');btn.type='button';btn.addEventListener('click',async()=>{if(!confirm('Revoke this teacher code?'))return;btn.disabled=true;try{await revokeSessionCode(code.id);await reload();}catch(e){msg(e.message,true);btn.disabled=false;}});row.append(btn);}box.append(row);}}
 function renderSignups(){const wrap=$('gcc-v6-signups');wrap.replaceChildren();const pending=signups.filter(s=>s.status==='pending');
 $('gcc-v6-summary').replaceChildren(el('span','',`${signups.length} registrations`),el('span','',`${pending.length} awaiting approval`),el('span','',`${signups.filter(s=>s.status==='approved').reduce((n,s)=>n+(s.students||[]).length,0)} students imported`));
 if(!signups.length){wrap.append(el('p','gcc-v6-helper','No teacher registrations yet. Share the link and a code with a teacher.'));return;}
 for(const s of signups){const card=el('article','gcc-v6-signup');const header=el('div','gcc-v6-signup-head');
 const title=el('div');title.append(el('strong','',`${flag(s.country_code)} ${s.school_name}`),el('small','',`${s.teacher_name} · ${s.country_name} · ${s.event_title}`));header.append(title,el('span',`gcc-v6-state ${s.status}`,s.status.toUpperCase()));card.append(header);
 const people=el('p','',`${s.students.length} students · ${s.facilitators.length} facilitators`);card.append(people);
 const students=el('details');const summary=el('summary','','Review students and facilitators');students.append(summary);
 const list=el('div','gcc-v6-student-review');for(const st of s.students)list.append(el('span','',`${st.name}${st.grade?' · '+st.grade:''}`));
 students.append(list,el('p','gcc-v6-helper',`Facilitators: ${s.facilitators.join(', ')||'None provided'}`));card.append(students);
 if(s.status==='pending'){const foot=el('div','gcc-v6-approve-actions');for(const [approve,label,cls] of [[false,'Decline','gcc-v6-secondary'],[true,'Approve & add to Room Builder','gcc-v6-primary']]){
 const btn=el('button',cls,label);btn.type='button';btn.addEventListener('click',async()=>{if(!confirm(approve?'Approve and import students into Participant Pool and this session?':'Decline this registration?'))return;
 btn.disabled=true;try{await reviewSessionSignup(s.id,approve);await reload();msg(approve?'✓ Students imported and registered for the selected session.':'Registration declined.');}catch(e){msg(e.message,true);btn.disabled=false;}});foot.append(btn);}card.append(foot);}
 wrap.append(card);}}
 async function reload(){try{const [ev,c,s]=await Promise.all([getEvents(),listSessionCodes(),listSessionSignups()]);events=ev;codes=c||[];signups=s||[];renderEvents();renderCodes();renderSignups();}
 catch(e){msg(`Unable to load Session Control Center: ${e.message}`,true);}}
 $('gcc-v6-generate').addEventListener('click',async()=>{const b=$('gcc-v6-generate');b.disabled=true;msg('');try{const res=await issueSessionCode($('gcc-v6-invite-label').value.trim());$('gcc-v6-new-code').hidden=false;$('gcc-v6-secret-value').textContent=res.code;await reload();msg('✓ Teacher code generated. Copy it now; it cannot be retrieved after you leave this page.');}
 catch(e){msg(e.message,true);}finally{b.disabled=false;}});
 $('gcc-v6-copy-code').addEventListener('click',async()=>{const code=$('gcc-v6-secret-value').textContent;const url=`${location.origin}${location.pathname}#/session-join`;
 try{await navigator.clipboard.writeText(`Global Classroom Connect registration: ${url}\nYour personal invitation code: ${code}`);msg('✓ Registration link and code copied.');}
 catch{msg('Copy failed. Select the code manually.',true);}});
 $('gcc-v6-refresh').addEventListener('click',reload);
 reload();
}
