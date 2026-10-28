import {bindRegistrationPairsV165} from '../../lib/registrationPairsV165.js';
import '../../styles/simpleSessionsV8.css';
import {parseSimpleRoster,parseSimpleFacilitators,englishName} from '../../lib/simpleRoster.js';
import {listPublicSessions,submitSharedRoster} from '../../services/simpleSessionService.js';
import {deviceRequirementMarkupV158,bindDeviceRequirementV158} from '../../lib/registrationDeviceGateV158.js';
import {timeConfirmationMarkupV160,bindTimeConfirmationV160} from '../../lib/registrationTimeGateV160.js';
const $=id=>document.getElementById(id);
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=text;return n;};
const format=(iso)=>{try{return new Intl.DateTimeFormat('en',{dateStyle:'full',timeStyle:'short'}).format(new Date(iso));}catch{return iso||'';}};
export function SharedRegistrationPage(){return `
<section class="gcc-v8 gcc-v8-teacher" aria-label="Global Classroom teacher registration">
  ${deviceRequirementMarkupV158()}
  ${timeConfirmationMarkupV160()}
  <div id="gcc158-register-form" hidden>
  <header class="gcc-v8-brand"><span aria-hidden="true">🌍</span><div><strong>Global Classroom Connect</strong><small>International school exchange</small></div></header>
  <div class="gcc-v8-steps"><span id="gcc-v8-step-index">STEP 1 OF 4</span><div class="gcc-v8-progress" id="gcc-v8-progress"></div></div>
  <h1 id="gcc-v8-title">Choose your session</h1>
  <p id="gcc-v8-subtitle" class="gcc-v8-desc">Select the exchange your class would like to join.</p>
  <div class="gcc-v8-stage" data-v8-stage="0">
    <label>Available sessions <select id="gcc-v8-event"><option value="">Loading sessions…</option></select></label>
    <p id="gcc-v8-session-date" class="gcc-v8-help"></p>
  </div>
  <div class="gcc-v8-stage" data-v8-stage="1" hidden>
    <label>Country * <select id="gcc-v8-country"><option value="">Choose your country</option></select></label>
    <label>School name * <input id="gcc-v8-school" autocomplete="organization" maxlength="160" placeholder="Your school's official name"></label>
    <label>Teacher name (English letters) * <input id="gcc-v8-teacher" autocomplete="name" maxlength="120" placeholder="e.g. Maria Santos"></label>
  </div>
  <div class="gcc-v8-stage" data-v8-stage="2" hidden>
    <label>Paste your student list * <textarea id="gcc-v8-roster" rows="8" spellcheck="false" placeholder="Name\tGrade\nMaria Santos\t10\nJuan Dela Cruz\t10"></textarea></label>
    <p class="gcc-v8-help">Paste from Excel or Google Sheets. Name, or Name + Grade. Personal names must use English letters (A–Z).</p>
    <div class="gcc-v8-roster-count" id="gcc-v8-roster-count">0 students</div>
    <div class="gcc-v8-mini-preview" id="gcc-v8-preview"></div>
    <label>Facilitators (optional) <textarea id="gcc-v8-facilitators" rows="3" placeholder="One teacher per line"></textarea></label>
    <p class="gcc-v8-help">Add teachers who can support your breakout rooms. Leave empty if you have none.</p>
  </div>
  <div class="gcc-v8-stage" data-v8-stage="3" hidden>
    <div id="gcc-v8-review" class="gcc-v8-review"></div><section class="gcc-v165-pairs" data-v165-pairs><h3>Would you like to pair students in breakout rooms?</h3><p class="gcc-v165-note">Optional: request pairs and a preferred room. The host confirms assignments after approval.</p><div class="gcc-v165-choice"><label><input type="radio" name="gcc-v165-pair-choice" data-v165-no checked> No, finish registration</label><label><input type="radio" name="gcc-v165-pair-choice" data-v165-yes> Yes, set up pairs</label></div><div data-v165-editor hidden><div data-v165-list></div><button type="button" data-v165-add>+ Add a student pair</button><p class="gcc-v165-note" data-v165-note></p></div></section>
  </div>
  <p role="alert" aria-live="polite" class="gcc-v8-error" id="gcc-v8-error"></p>
  <footer class="gcc-v8-footer" id="gcc-v8-footer">
    <button type="button" id="gcc-v8-back" class="gcc-v8-secondary" hidden>← Back</button>
    <button type="button" id="gcc-v8-next" class="gcc-v8-primary">Continue →</button>
    <button type="button" id="gcc-v8-submit" class="gcc-v8-primary" hidden>Submit registration ✓</button>
  </footer>
  <p class="gcc-v8-privacy">Your student list is visible to the host only. Other schools cannot view or change it.</p>
  </div>
</section>`;}
export function bindSharedRegistrationPage(){
 const root=document.querySelector('.gcc-v8-teacher');if(!root)return;
 bindDeviceRequirementV158(root);
 const timeGate=bindTimeConfirmationV160(root,{getSession:()=>events.find(s=>s.id===$('gcc-v8-event').value),onConfirmed:()=>show(1),onBack:()=>show(0)});
 let step=0,events=[],countries=new Map(),sending=false;
 const titles=['Choose your session','Your school & country','Students & facilitators','Check & submit'];
 const subtitles=['Select the exchange your class would like to join.','These details help us mix students from different schools.','Paste students and add any teacher facilitators.','Check your class details before submitting.'];
 const message=s=>$('gcc-v8-error').textContent=s;
 const roster=()=>parseSimpleRoster($('gcc-v8-roster').value);
 const facs=()=>parseSimpleFacilitators($('gcc-v8-facilitators').value);
 const current=()=>events.find(s=>s.id===$('gcc-v8-event').value);
 const pairPicker=bindRegistrationPairsV165(root,{getStudents:()=>roster().records,getSession:()=>current()});
 function preview(){const r=roster();$('gcc-v8-roster-count').textContent=`${r.records.length} students${r.errors.length?` · ${r.errors.length} lines to fix`:''}`;
   const p=$('gcc-v8-preview');p.replaceChildren();
   for(const v of r.records.slice(0,7))p.append(el('div','',v.name+(v.grade?' · '+v.grade:'')));
   if(r.records.length>7)p.append(el('small','',`… and ${r.records.length-7} more`));
   for(const err of r.errors.slice(0,5))p.append(el('p','gcc-v8-line-error',`Line ${err.line}: ${err.message}`));
 }
 function review(){const s=current(),r=roster(),f=facs(),c=countries.get($('gcc-v8-country').value);const box=$('gcc-v8-review');box.replaceChildren();
   for(const [label,value] of [['Session',s?.title||'—'],['Country',c?.name||'—'],['School',$('gcc-v8-school').value.trim()],['Teacher',$('gcc-v8-teacher').value.trim()],['Students',String(r.records.length)],['Facilitators',String(f.records.length)],['Requested pairs',pairPicker.summary()]]){
     const row=el('div','gcc-v8-review-row');row.append(el('span','',label),el('strong','',value));box.append(row);
   }
 }
 function show(n){step=n;message('');root.dataset.popStep=String(n);$('gcc-v8-step-index').textContent=`STEP ${n+1} OF 4`;$('gcc-v8-title').textContent=titles[n];$('gcc-v8-subtitle').textContent=subtitles[n];
   for(const e of root.querySelectorAll('[data-v8-stage]'))e.hidden=Number(e.dataset.v8Stage)!==n;
   $('gcc-v8-progress').replaceChildren(...[0,1,2,3].map(i=>{const x=el('span',i<=n?'active':'');return x;}));
   $('gcc-v8-back').hidden=n===0;$('gcc-v8-next').hidden=n===3;$('gcc-v8-submit').hidden=n!==3;
   if(n===2)preview();if(n===3){review();pairPicker.refresh();}
 }
 function validate(n){if(n===0&&!current())return 'Please choose a session.';
   if(n===1){if(!$('gcc-v8-country').value)return 'Choose your country.';if($('gcc-v8-school').value.trim().length<2)return 'Enter your school name.';
     if(!englishName($('gcc-v8-teacher').value))return 'Teacher name must use English letters (A–Z).';}
   if(n===2){const r=roster();if(r.errors.length)return `Please fix line ${r.errors[0].line}: ${r.errors[0].message}`;
     if(r.records.length<1||r.records.length>500)return 'Enter 1–500 students.';
     const f=facs();if(f.errors.length)return `Facilitator line ${f.errors[0].line}: ${f.errors[0].message}`;}
   if(n===3){/* Confirmation only: facilitator names were already validated in step 3. */}
   return '';
 }
 $('gcc-v8-back').addEventListener('click',()=>show(Math.max(0,step-1)));
 $('gcc-v8-next').addEventListener('click',()=>{const err=validate(step);if(err){message(err);return;}if(step===0){if(!timeGate.show())message('Session time is unavailable.');return;}show(step+1);});
 $('gcc-v8-roster').addEventListener('input',preview);
 $('gcc-v8-event').addEventListener('change',()=>{$('gcc-v8-session-date').textContent=current()?`📅 ${format(current().starts_at)} · Your local time`:'';});
 $('gcc-v8-submit').addEventListener('click',async()=>{
   if(sending)return;for(let i=0;i<4;i++){const err=validate(i);if(err){show(i);message(err);return;}}
   sending=true;const b=$('gcc-v8-submit');b.disabled=true;message('Submitting…');
   try{const receipt=await submitSharedRoster({eventId:current().id,teacher:$('gcc-v8-teacher').value.trim(),school:$('gcc-v8-school').value.trim(),countryCode:$('gcc-v8-country').value,countryName:countries.get($('gcc-v8-country').value).name,students:roster().records,facilitators:facs().records,pairs:pairPicker.getPairs()});
     root.querySelector('.gcc-v8-steps').hidden=true;root.querySelector('#gcc-v8-subtitle').hidden=true;
     for(const e of root.querySelectorAll('.gcc-v8-stage'))e.hidden=true;
     $('gcc-v8-footer').hidden=true;
     $('gcc-v8-title').textContent='Your class is registered!';
     message('');const ok=el('div','gcc-v8-success',`✓ Thank you. Your host will review ${roster().records.length} students. Confirmation: ${String(receipt).slice(0,8)}. Your pair requests will be reviewed by the host. After approval, you can use your 4-digit Teacher Code in Teacher Mode to adjust pairs or rooms.`);$('gcc-v8-error').after(ok);
   }catch(err){message(err.message||'Please try again.');sending=false;b.disabled=false;}
 });
 show(0);
 (async()=>{try{const [sessions,res]=await Promise.all([listPublicSessions(),fetch(`${import.meta.env.BASE_URL}country-master.json`)]);
   if(!res.ok)throw Error('Country data unavailable');const master=await res.json();if(!Array.isArray(master.countries)||master.countries.length!==197)throw Error('Country list unavailable');
   countries=new Map(master.countries.map(x=>[x.code,x]));events=sessions||[];
   const picker=$('gcc-v8-event');picker.replaceChildren();const o=el('option','',events.length?'Select a session':'No open sessions');o.value='';picker.append(o);
   for(const s of events){const op=el('option','',`${s.title} · ${format(s.starts_at)}`);op.value=s.id;picker.append(op);}
   const select=$('gcc-v8-country');for(const c of master.countries){const op=el('option','',c.name);op.value=c.code;select.append(op);}
   const requested=new URLSearchParams(window.location.hash.split('?')[1]||'').get('session');
   const chosen=events.find(e=>e.id===requested)||(events.length===1?events[0]:null);
   if(chosen){picker.value=chosen.id;$('gcc-v8-session-date').textContent=`📅 ${format(chosen.starts_at)} · Your local time`;}
 }catch(err){message('Could not load sessions: '+err.message);}})();
}
