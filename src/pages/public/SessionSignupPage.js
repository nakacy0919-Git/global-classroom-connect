import '../../styles/sessionSignupV6.css';
import {parseRoster,parseFacilitators,isIdentityComplete} from '../../lib/sessionRoster.js';
import {isEnglishName} from '../../lib/englishNames.js';
import {publicSessions,submitSessionSignup} from '../../services/sessionRosterService.js';
import {deviceRequirementMarkupV158,bindDeviceRequirementV158} from '../../lib/registrationDeviceGateV158.js';
import {timeConfirmationMarkupV160,bindTimeConfirmationV160} from '../../lib/registrationTimeGateV160.js';
const $=id=>document.getElementById(id);
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const time=(s,tz)=>{try{return new Intl.DateTimeFormat('en',{timeZone:tz||'UTC',dateStyle:'medium',timeStyle:'short'}).format(new Date(s));}catch{return s||'Date not set';}};
export function SessionSignupPage(){return `
<section class="gcc-v6 gcc-v6-public" aria-label="Join a Global Classroom session">
  ${deviceRequirementMarkupV158()}
  ${timeConfirmationMarkupV160()}
  <div id="gcc158-register-form" hidden>
  <div class="gcc-v6-header"><span class="gcc-v6-logo">🌎</span><div><span class="gcc-v6-kicker">GLOBAL CLASSROOM CONNECT</span><h2>Join a Session</h2></div></div>
  <div class="gcc-v6-progress" id="gcc-v6-progress" aria-label="Registration progress"></div>
  <div class="gcc-v6-intro"><strong id="gcc-v6-step-title">1. Choose your session</strong><span id="gcc-v6-step-subtitle">Select the exchange your class wants to join.</span></div>
  <div class="gcc-v6-form">
    <section data-v6-step="0" class="gcc-v6-stage">
      <label class="gcc-v6-label">Your invitation code * <input id="gcc-v6-code" type="text" autocapitalize="off" spellcheck="false" autocomplete="off" maxlength="32" placeholder="Code provided by your host" required></label>
      <p class="gcc-v6-helper">Your host shares the same registration link with everyone, but provides a separate code to each teacher.</p>
      <label class="gcc-v6-label">Available sessions * <select id="gcc-v6-event" required><option value="">Loading upcoming sessions…</option></select></label>
      <p class="gcc-v6-helper" id="gcc-v6-date-info"></p>
    </section>
    <section data-v6-step="1" class="gcc-v6-stage" hidden>
      <p class="gcc-v6-note">These details are required so students can be mixed across schools and countries.</p>
      <label class="gcc-v6-label gcc-v6-focus">Country * <select id="gcc-v6-country" required><option value="">Choose your country</option></select></label>
      <label class="gcc-v6-label">School name * <input id="gcc-v6-school" maxlength="160" required placeholder="Official school name"></label>
      <label class="gcc-v6-label">Teacher name * <input id="gcc-v6-teacher" maxlength="120" required placeholder="Your name"></label>
    </section>
    <section data-v6-step="2" class="gcc-v6-stage" hidden>
      <label class="gcc-v6-label">Student names * <textarea id="gcc-v6-roster" rows="9" spellcheck="false" placeholder="Name\tGrade\nMaria Santos\t10\nJuan Dela Cruz\t10" required></textarea></label>
      <p class="gcc-v6-helper">Paste a column of names, or two columns (Name + Grade), straight from Excel / Google Sheets. Maximum 500 students.</p>
      <div class="gcc-v6-preview"><strong id="gcc-v6-roster-count">0 students detected</strong><span id="gcc-v6-roster-warnings"></span><div id="gcc-v6-roster-list"></div></div>
    </section>
    <section data-v6-step="3" class="gcc-v6-stage" hidden>
      <label class="gcc-v6-label">Facilitators (optional) <textarea id="gcc-v6-facilitators" rows="5" placeholder="One facilitator's name per line"></textarea></label>
      <p class="gcc-v6-helper">Include teachers who can help facilitate breakout rooms. The host will assign individual rooms.</p>
      <div class="gcc-v6-review" id="gcc-v6-review"></div>
      <p class="gcc-v6-helper">Student lists are private to the host. The host checks and approves your submission before it enters room assignments.</p>
    </section>
  </div>
  <p class="gcc-v6-message" id="gcc-v6-message" role="status" aria-live="polite"></p>
  <div class="gcc-v6-actions"><button type="button" class="gcc-v6-back" id="gcc-v6-back" hidden>← Back</button><button type="button" class="gcc-v6-primary" id="gcc-v6-next">Continue →</button><button type="button" class="gcc-v6-primary" id="gcc-v6-submit" hidden>Submit registration ✓</button></div>
  </div>
</section>`;}
export function bindSessionSignupPage(){
 const root=document.querySelector('.gcc-v6-public');if(!root)return;
 bindDeviceRequirementV158(root);
 const timeGate=bindTimeConfirmationV160(root,{getSession:()=>allSessions.find(s=>s.id===$('gcc-v6-event').value),onConfirmed:()=>showStep(1),onBack:()=>showStep(0)});
 let step=0,submitting=false;let allSessions=[];let master=new Map();
 const steps=['Choose your session','School & country','Student list','Facilitators & review'];
 const msg=(text,error=false)=>{$('gcc-v6-message').textContent=text;$('gcc-v6-message').classList.toggle('error',error);};
 const identity=()=>({country:$('gcc-v6-country').value,school:$('gcc-v6-school').value.trim(),teacher:$('gcc-v6-teacher').value.trim()});
 const students=()=>parseRoster($('gcc-v6-roster').value);
 function renderRoster(){const {records,invalid}=students();$('gcc-v6-roster-count').textContent=`${records.length} students detected`;
 $('gcc-v6-roster-warnings').textContent=invalid.length?`Names must use A–Z letters. Correct lines: ${invalid.join(', ')}`:'';
 const box=$('gcc-v6-roster-list');box.replaceChildren();for(const [i,s] of records.slice(0,20).entries())box.append(el('div','',`${i+1}. ${s.name}  ${s.grade}`));
 if(records.length>20)box.append(el('small','',`… and ${records.length-20} more`));}
 function showStep(n){step=n;msg('');root.querySelectorAll('[data-v6-step]').forEach(e=>e.hidden=Number(e.dataset.v6Step)!==n);
 $('gcc-v6-step-title').textContent=`${n+1}. ${steps[n]}`;
 $('gcc-v6-step-subtitle').textContent=n===1?'Country and school are required for fair room mixing.':n===2?'Paste names directly from your spreadsheet.':n===3?'Check everything, then submit to the host.':'Choose one of the published sessions.';
 $('gcc-v6-progress').replaceChildren();for(let i=0;i<4;i++){const seg=el('span');seg.classList.toggle('active',i<=n);$('gcc-v6-progress').append(seg);}
 $('gcc-v6-back').hidden=n===0;$('gcc-v6-next').hidden=n===3;$('gcc-v6-submit').hidden=n!==3;if(n===2)renderRoster();if(n===3)renderReview();}
 function renderReview(){const event=allSessions.find(s=>s.id===$('gcc-v6-event').value);
 const country=master.get($('gcc-v6-country').value);const {records}=students();const facilitators=parseFacilitators($('gcc-v6-facilitators').value);
 const values=[['Session',event?.title||'—'],['Country',country?.name||'—'],['School',identity().school],['Teacher',identity().teacher],['Students',String(records.length)],['Facilitators',String(facilitators.length)]];
 const box=$('gcc-v6-review');box.replaceChildren();for(const [key,value] of values){const row=el('div');row.append(el('span','',key),el('strong','',value));box.append(row);}}
 function validate(n){if(n===0){if(!/^[a-f0-9]{32}$/.test($('gcc-v6-code').value.trim().toLowerCase()))return 'Enter the 32-character invitation code from your host.';
 if(!allSessions.some(s=>s.id===$('gcc-v6-event').value))return 'Choose a session.';}
 if(n===1&&!isIdentityComplete(identity()))return 'Country, school name, and teacher name are all required.';
 if(n===1&&!isEnglishName(identity().teacher))return 'Teacher name must use A–Z English letters, spaces, hyphens or apostrophes.';
 if(n===2){const {records,invalid}=students();if(invalid.length)return 'Please correct the highlighted spreadsheet lines.';if(records.length<1||records.length>500)return 'Provide between 1 and 500 students.';}
 if(n===3){const fac=parseFacilitators($('gcc-v6-facilitators').value);if(fac.length>50||fac.some(x=>!isEnglishName(x)))return 'Facilitator names must be 2–120 characters, maximum 50 names.';}
 return null;}
 $('gcc-v6-back').addEventListener('click',()=>showStep(Math.max(0,step-1)));
 $('gcc-v6-next').addEventListener('click',()=>{const problem=validate(step);if(problem){msg(problem,true);return;}if(step===0){if(!timeGate.show())msg('Session time is unavailable.',true);return;}showStep(Math.min(3,step+1));});
 $('gcc-v6-roster').addEventListener('input',renderRoster);
 $('gcc-v6-event').addEventListener('change',()=>{const e=allSessions.find(s=>s.id===$('gcc-v6-event').value);$('gcc-v6-date-info').textContent=e?`📅 ${time(e.starts_at,e.timezone)} (${e.timezone})`:'';});
 $('gcc-v6-submit').addEventListener('click',async()=>{if(submitting)return;for(let i=0;i<4;i++){const e=validate(i);if(e){showStep(i);msg(e,true);return;}}
 submitting=true;$('gcc-v6-submit').disabled=true;msg('Submitting your registration…');
 try{const id=await submitSessionSignup({code:$('gcc-v6-code').value.trim().toLowerCase(),eventId:$('gcc-v6-event').value,
 ...identity(),countryName:master.get(identity().country)?.name||'',students:students().records,facilitators:parseFacilitators($('gcc-v6-facilitators').value)});
 root.querySelector('.gcc-v6-form').hidden=true;root.querySelector('.gcc-v6-actions').hidden=true;root.querySelector('.gcc-v6-intro').hidden=true;root.querySelector('.gcc-v6-progress').hidden=true;
 msg(`✓ Registration received. Your host will review your ${students().records.length} students. Reference: ${String(id).slice(0,8)}. You may close this page.`);
 }catch(e){msg(e.message||'Could not submit registration.',true);submitting=false;$('gcc-v6-submit').disabled=false;}});
 showStep(0);
 (async()=>{try{const [events,response]=await Promise.all([publicSessions(),fetch(`${import.meta.env.BASE_URL}country-master.json`)]);
 if(!response.ok)throw Error('Country master is unavailable');const data=await response.json();
 if(!Array.isArray(data.countries)||data.countries.length!==197)throw Error('197-country master is incomplete');
 master=new Map(data.countries.map(x=>[x.code,x]));allSessions=events||[];
 const select=$('gcc-v6-event');select.replaceChildren();const placeholder=el('option','',allSessions.length?'Choose a session':'No upcoming published sessions');placeholder.value='';select.append(placeholder);
 for(const e of allSessions){const o=el('option','',`${e.title} · ${time(e.starts_at,e.timezone)}`);o.value=e.id;select.append(o);}
 const country=$('gcc-v6-country');for(const c of data.countries){const o=el('option','',`${c.name} · ${c.nameJa||c.name}`);o.value=c.code;country.append(o);}
 }catch(e){msg(`Could not load sessions: ${e.message}`,true);}})();
}
