import '../../styles/volunteerV117.css';
import '../../styles/volunteerFocusV123.css';
import {volunteerGalleryMarkupV122,mountVolunteerGalleryV122} from './VolunteerGalleryV122.js';
import {myDetailsV117,saveVolunteerV117} from '../../services/teacherExtrasV117.js';
import {prepareSuccessChime,showSuccessCelebration} from '../../lib/successCelebrationV142.js';
import {myTeacherProfileV116,saveTeacherProfileV116} from '../../services/teacherNetworkV116.js';

export function volunteerMarkupV117(){return `<div class="gcc117-volunteer gcc123-volunteer">
 <header class="gcc123-header"><a href="#/welcome" class="gcc123-home">← Global Classroom Connect</a><span>GLOBAL CLASSROOM · VOLUNTEER TEAM</span><div class="gcc123-account"><button id="gcc123-profile" type="button">My profile</button><button id="gcc123-logout" type="button">Sign out</button></div></header>
 ${volunteerGalleryMarkupV122()}
 <section id="gcc122-join-form" class="gcc123-modal" role="dialog" aria-modal="true" aria-labelledby="gcc123-title" hidden>
  <div class="gcc123-backdrop" data-gcc123-dismiss></div>
  <div class="gcc123-dialog"><header class="gcc123-dialog-head"><span>JOIN THE GLOBAL CLASSROOM TEAM</span><button id="gcc123-close" type="button" aria-label="Close registration">✕</button></header>
   <div class="gcc123-progress" aria-label="Registration progress"><span class="gcc123-progress-current"></span><span></span><span></span></div>
   <form id="gcc117-volunteer-form" novalidate>
    <section data-gcc123-step="0" class="gcc123-step"><div class="gcc123-step-icon">🌍</div><p class="gcc123-step-num">STEP 1 OF 3</p><h2 id="gcc123-title">How would you like to help?</h2><p>Choose the roles you would like to support at Global Classroom-hosted sessions.</p>
      <label class="gcc117-volunteer-choice"><input id="gcc117-want-facilitator" type="checkbox"><span><strong>Breakout room facilitator</strong><small>Help international groups talk, listen and enjoy their exchange.</small></span></label>
      <label class="gcc117-volunteer-choice"><input id="gcc117-want-host" type="checkbox"><span><strong>Online session host / co-host</strong><small>Welcome participants and help coordinate Global Classroom sessions.</small></span></label>
    </section>
    <section data-gcc123-step="1" class="gcc123-step" hidden><div class="gcc123-step-icon">💬</div><p class="gcc123-step-num">STEP 2 OF 3</p><h2>When could you help?</h2><p>Tell our coordination team about your languages, time zone and availability. You can change this later.</p>
      <label class="gcc117-volunteer-label">Your experience and availability (optional)<textarea id="gcc117-volunteer-note" rows="4" maxlength="600" placeholder="For example: I speak English and Japanese, and I'm available on Saturday evenings in Japan."></textarea></label>
      <p class="gcc123-private-note">🔒 This note is only for the Global Classroom coordination team, not the photo gallery.</p>
    </section>
    <section data-gcc123-step="2" class="gcc123-step" hidden><div class="gcc123-step-icon">✨</div><p class="gcc123-step-num">STEP 3 OF 3</p><h2>Ready to join the team?</h2><p>Your verified teacher profile will become your team card. There is no need to re-enter your name, school or face photograph.</p>
      <div class="gcc123-profile-summary" id="gcc123-profile-summary">Checking your teacher profile…</div>
      <label class="gcc123-consent"><input id="gcc123-visible" type="checkbox"><span>I agree to show my name, face photograph, school, country, introduction and social links to approved GCC teachers in the Global Team gallery.</span></label>
      <p class="gcc123-private-note">To appear in the gallery, your profile needs a face photograph and introduction. Email addresses and private availability notes are never displayed. Registration does not grant Host Admin access.</p>
      <button class="gcc123-edit-profile" id="gcc117-volunteer-profile" type="button" hidden>Complete my teacher profile →</button>
    </section>
    <p id="gcc117-volunteer-message" class="gcc123-message" role="alert" aria-live="polite"></p>
    <div class="gcc123-buttons"><button id="gcc123-back" type="button" class="gcc123-secondary" hidden>← Back</button><button id="gcc123-next" type="button" class="gcc123-primary">Continue →</button><button id="gcc117-volunteer-save" type="submit" class="gcc123-primary" hidden>Join the Global Team ✓</button></div>
   </form>
  </div>
 </section>
 </div>`;}

export async function mountVolunteerV117(root,openTab){
 const form=root.querySelector('#gcc117-volunteer-form');if(!form)return;
 const $=id=>root.querySelector('#'+id),info=$('gcc117-volunteer-message'),modal=$('gcc122-join-form');
 const refreshGallery=mountVolunteerGalleryV122(root,openTab);
 let profile=null,extras=null,step=0,previousFocus=null,loadingProfile=false;
 const say=(message,error=false)=>{info.textContent=message;info.classList.toggle('error',error);};
 const refreshProfile=async()=>{profile=await myTeacherProfileV116();extras=await myDetailsV117();const missing=[];
   if(!profile?.photo_path)missing.push('face photograph');
   if(!profile?.bio?.trim())missing.push('short introduction');
   if(!extras?.website_url?.trim())missing.push('website');
   const card=$('gcc123-profile-summary');card.replaceChildren();
   const name=document.createElement('strong');name.textContent=profile?.name||'Teacher profile';
   const school=document.createElement('span');school.textContent=[profile?.school,profile?.country_name].filter(Boolean).join(' · ');
   card.append(name,school);
   const edit=$('gcc117-volunteer-profile');edit.hidden=!missing.length;
   if(missing.length){const warning=document.createElement('p');warning.className='gcc123-warning';warning.textContent='Complete your '+missing.join(', ')+' in My Profile before joining.';card.append(warning);}
   return missing;
 };
 function setStep(index){step=index;for(const pane of root.querySelectorAll('[data-gcc123-step]'))pane.hidden=Number(pane.dataset.gcc123Step)!==index;
   const bars=root.querySelectorAll('.gcc123-progress span');for(let i=0;i<bars.length;i++)bars[i].classList.toggle('active',i<=index);
   $('gcc123-back').hidden=index===0;$('gcc123-next').hidden=index===2;$('gcc117-volunteer-save').hidden=index!==2;say('');
   if(index===2&&!loadingProfile){loadingProfile=true;refreshProfile().catch(error=>say(error.message||'Could not read your profile.',true)).finally(()=>{loadingProfile=false;});}
 }
 function openWizard(){previousFocus=document.activeElement;modal.hidden=false;setStep(0);$('gcc123-close').focus();}
 function closeWizard(){modal.hidden=true;say('');if(previousFocus?.isConnected)previousFocus.focus();}
 // Intercept both gallery buttons before the legacy scroll-to-form behavior.
 root.addEventListener('click',event=>{if(!event.target.closest('.gcc122-join-button,.gcc122-empty-action'))return;
  event.preventDefault();event.stopImmediatePropagation();openWizard();},true);
 $('gcc123-close').addEventListener('click',closeWizard);
 modal.querySelector('[data-gcc123-dismiss]').addEventListener('click',closeWizard);
 modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeWizard();}
  if(event.key==='Tab'){const allowed=[...modal.querySelectorAll('button:not([hidden]):not([disabled]),input:not([hidden]):not([disabled]),textarea:not([hidden]):not([disabled])')].filter(n=>n.getClientRects().length);
   if(!allowed.length)return;const first=allowed[0],last=allowed[allowed.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
 $('gcc123-profile').addEventListener('click',()=>openTab('network'));
 $('gcc123-logout').addEventListener('click',()=>root.querySelector('#gctp-logout')?.click());
 $('gcc117-volunteer-profile').addEventListener('click',()=>{closeWizard();openTab('network');});
 $('gcc123-back').addEventListener('click',()=>setStep(Math.max(0,step-1)));
 $('gcc123-next').addEventListener('click',async()=>{
  if(step===0&&!$('gcc117-want-facilitator').checked&&!$('gcc117-want-host').checked)return say('Please choose at least one role.',true);
  setStep(Math.min(2,step+1));
 });
 form.addEventListener('submit',async event=>{event.preventDefault();if(step!==2)return;prepareSuccessChime();
  if(!$('gcc123-visible').checked)return say('Please agree to show your team profile before joining.',true);
  const button=$('gcc117-volunteer-save');button.disabled=true;
  try{
   const missing=await refreshProfile();if(missing.length)return say('Please complete your profile first, then return to join the team.',true);
   if(!$('gcc117-want-facilitator').checked&&!$('gcc117-want-host').checked)return say('Please select a role.',true);
   await saveTeacherProfileV116({name:profile.name,jobTitle:profile.job_title||'',bio:profile.bio,
     languages:Array.isArray(profile.languages)?profile.languages:[],visible:true});
   await saveVolunteerV117({facilitator:$('gcc117-want-facilitator').checked,host:$('gcc117-want-host').checked,note:$('gcc117-volunteer-note').value.trim()});
   root.querySelector('#gcc122-country').value='';root.querySelector('#gcc122-role').value='';root.querySelector('#gcc122-query').value='';
   await refreshGallery();closeWizard();
   const summary=root.querySelector('#gcc122-summary');summary.textContent+=' · Thank you for joining!';showSuccessCelebration({title:'Welcome to the Global Team!',detail:'Your volunteer information has been saved.'});
   root.querySelector('#gcc122-heading')?.focus?.();
  }catch(error){say(error.message||'Could not complete your registration.',true);}finally{button.disabled=false;}
 });
 try{const details=await myDetailsV117();$('gcc117-want-facilitator').checked=!!details.volunteer_facilitator;
   $('gcc117-want-host').checked=!!details.volunteer_host;$('gcc117-volunteer-note').value=details.volunteer_note||'';}
 catch(error){say(error.message||'Could not load your volunteer preferences.',true);}
}
