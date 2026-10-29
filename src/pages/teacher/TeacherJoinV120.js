import '../../styles/teacherJoinV120.css';
import '../../styles/teacherOnboardingV132.css';
import '../../styles/teacherSignupRecoveryV135.css';
import '../../styles/teacherSignupIdentityV139.css';
import '../../styles/teacherSignupSimplifiedV140.css';
import '../../styles/teacherBioLimitV141.css';
import {prepareSuccessChime,showSuccessCelebration} from '../../lib/successCelebrationV142.js';
import {supabase} from '../../services/supabase.js';
import {countries} from '../../data/countries.js';
import {signupAccountV120,signinAccountV120,currentUserV120,beginApplicationV120,
 submitApplicationV120,uploadApplicationPhotoV120,resendConfirmationV135,hasApprovedTeacherV120} from '../../services/teacherOnboardingV120.js';
import {teacherSignupErrorV135,teacherPhotoErrorV135} from '../../lib/teacherSignupRecoveryV135.js';
import {assertApplicantIdentityV139,assertEditableDraftV139} from '../../lib/teacherSignupIdentityV139.js';
const safe=(s)=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function TeacherJoinV120(){return `<main class="gcc120-page gcc140-page"><section class="gcc120-join gcc140-join" aria-label="Join Global Classroom">
 <a class="gcc120-back" href="#/welcome">← Global Classroom Connect</a>
 <div class="gcc120-title gcc140-title"><span>GLOBAL CLASSROOM CONNECT · TEACHER REGISTRATION</span><h1>Join Global Classroom</h1><p>Bring your classroom closer to the world.</p></div>
 <p class="gcc120-message" id="gcc120-msg" role="status" aria-live="polite"></p>
 <div id="gcc139-account-banner" class="gcc139-account-banner" role="status" aria-live="polite" hidden><span id="gcc139-account-email"></span><button type="button" id="gcc139-switch-account" class="gcc120-secondary">Switch account</button></div>
 <section id="gcc120-account-step" class="gcc120-panel gcc140-account-panel">
  <h2 class="gcc140-visually-hidden">Your account</h2>
  <div class="gcc140-auth-tabs" role="tablist" aria-label="Choose how to access GCC">
   <button type="button" id="gcc140-tab-signin" role="tab" aria-selected="true" aria-controls="gcc140-signin-pane">Sign in</button>
   <button type="button" id="gcc140-tab-signup" role="tab" aria-selected="false" aria-controls="gcc140-signup-pane">Create account</button>
  </div>
  <div id="gcc140-signin-pane" class="gcc120-signin gcc140-auth-pane" role="tabpanel" aria-labelledby="gcc140-tab-signin">
   <form id="gcc120-signin-form" class="gcc120-grid">
    <label>Email address <input id="gcc120-old-email" type="email" autocomplete="email" required></label>
    <label>Password <input id="gcc120-old-password" type="password" autocomplete="current-password" required></label>
    <button type="submit" class="gcc120-primary gcc140-action">Sign in and continue →</button>
   </form>
   <div class="gcc140-auth-links"><a href="#/teacher-password">Forgot password?</a><button type="button" id="gcc135-resend" class="gcc135-link">Resend confirmation email</button></div>
  </div>
  <div id="gcc140-signup-pane" class="gcc140-auth-pane" role="tabpanel" aria-labelledby="gcc140-tab-signup" hidden>
   <p class="gcc140-auth-note">Create an account, then confirm the link sent to your email.</p>
   <form id="gcc120-signup-form" class="gcc120-grid">
    <label>Email address <input type="email" id="gcc120-email" autocomplete="email" required></label>
    <label>Password (8 characters minimum) <input type="password" id="gcc120-password" autocomplete="new-password" minlength="8" required></label>
    <button class="gcc120-primary gcc140-action" type="submit">Create account →</button>
   </form>
  </div>
 </section>
 <section id="gcc120-profile-step" class="gcc120-panel gcc140-profile-panel" hidden><h2><span class="gcc120-step">2</span> Teacher &amp; school profile</h2>
  <p class="gcc120-hint gcc140-short-hint">Fields marked * are required. Websites and region are optional.</p>
  <form id="gcc120-application" class="gcc120-grid">
  <h3 class="gcc120-span">About you</h3>
  <label>Full name *<input id="gcc120-name" autocomplete="name" minlength="2" maxlength="120" required></label>
  <label>Personal website (HTTPS, optional)<input id="gcc120-website" type="url" placeholder="https://... (optional)" maxlength="240"></label>
  <label class="gcc120-span">Short self-introduction (20–3000 characters) *
    <textarea id="gcc120-bio" rows="5" minlength="20" required aria-describedby="gcc141-bio-count" placeholder="Tell other teachers about your teaching and interests"></textarea>
    <small id="gcc141-bio-count" class="gcc141-bio-count" role="status" aria-live="polite">0 / 3000 characters</small></label>
  <label class="gcc120-span">Clear face photograph (JPEG, PNG or WebP, 5 MB maximum) *<input id="gcc120-photo" type="file" accept="image/jpeg,image/png,image/webp" required><small>Resized privately in your browser (WebP or JPEG, maximum 512 pixels). Works even when WebP export is unavailable.</small></label>
  <h3 class="gcc120-span">Your school</h3>
  <label>School / organization name *<input id="gcc120-school" minlength="2" maxlength="160" required></label>
  <label>School website (HTTPS, optional)<input id="gcc120-school-web" type="url" placeholder="https://... (optional)" maxlength="240"></label>
  <label>School type *<select id="gcc120-type" required><option value="">Choose one</option><option>Public</option><option>Private</option><option>Independent / individual</option><option>Other</option></select></label>
  <label>School level *<select id="gcc120-level" required><option value="">Choose one</option><option>Elementary</option><option>Junior high</option><option>High school</option><option>University</option><option>Other</option></select></label>
  <label>Country *<select id="gcc120-country" required><option value="">Choose country</option></select></label>
  <label>City *<input id="gcc120-city" required minlength="2" maxlength="120"></label>
  <label>Region / prefecture / state (optional)<input id="gcc120-region" minlength="2" maxlength="120"></label>
  <label>School time zone (IANA) *<input id="gcc120-timezone" required placeholder="Asia/Tokyo" list="gcc120-zones"></label>
  <datalist id="gcc120-zones"></datalist>
  <button type="submit" id="gcc120-submit" class="gcc120-primary gcc140-action">Submit for approval →</button>
  </form></section>
 <section id="gcc120-status-step" class="gcc120-panel" hidden><h2 id="gcc120-status-title">Your application</h2><p id="gcc120-status-text"></p><a href="#/teacher-portal?view=volunteer" id="gcc132-facilitator-next" class="gcc120-primary gcc120-inline" hidden>Continue to Facilitator registration →</a><a href="#/welcome" class="gcc120-secondary gcc120-inline">Return to GCC home</a></section>
 </section></main>`;}
export function bindTeacherJoinV120(){
 const root=document.querySelector('.gcc120-join[aria-label="Join Global Classroom"]');if(!root)return;
 const $=id=>root.querySelector('#'+id),notify=(v,error=false)=>{const m=$('gcc120-msg');m.textContent=v;m.classList.toggle('error',error);};
 let draft=null,activeDraftUserId=null,displayedUserId=null,readySequence=0;
 let resendAt=0;
 function displayActiveAccount(user){$('gcc139-account-banner').hidden=!user;$('gcc139-account-email').textContent=user?'Signed in as '+(user.email||'your teacher account'):'';}

 const bio=$('gcc120-bio'),bioCounter=$('gcc141-bio-count');
 function updateBioCounter(){
  const length=Array.from(bio.value.trim()).length;
  const over=length>3000;
  bioCounter.textContent=length+' / 3000 characters'+(over?' — Too long. Please shorten your introduction.':'');
  bioCounter.classList.toggle('gcc141-bio-count-error',over);
  bio.setCustomValidity(over?'Please shorten your introduction to 3000 characters or fewer.':'');
 }
 bio.addEventListener('input',updateBioCounter);
 const resend=$('gcc135-resend');
 function setAuthMode(mode){
  const signin=mode!=='signup';
  $('gcc140-signin-pane').hidden=!signin;
  $('gcc140-signup-pane').hidden=signin;
  $('gcc140-tab-signin').setAttribute('aria-selected',String(signin));
  $('gcc140-tab-signup').setAttribute('aria-selected',String(!signin));
 }
 $('gcc140-tab-signin').addEventListener('click',()=>{setAuthMode('signin');$('gcc120-old-email').focus();});
 $('gcc140-tab-signup').addEventListener('click',()=>{setAuthMode('signup');$('gcc120-email').focus();});
 function setStep(which){for(const s of ['account','profile','status'])$('gcc120-'+s+'-step').hidden=s!==which;}
 function fillChoices(){
  const sel=$('gcc120-country');for(const c of countries){const name=c.name||c.label||c.country||'',code=c.code||c.iso2||c.iso||'';
   if(name&&/^[A-Z]{2}$/i.test(code)){const opt=new Option(name,code.toUpperCase());opt.dataset.name=name;sel.append(opt);}}
  const zones=$('gcc120-zones');try{for(const name of Intl.supportedValuesOf('timeZone'))zones.append(new Option(name,name));}catch{zones.append(new Option('Asia/Tokyo','Asia/Tokyo'));}
  $('gcc120-timezone').value=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Tokyo';
 }
 function status(kind){setStep('status');$('gcc132-facilitator-next').hidden=kind!=='approved';$('gcc120-status-title').textContent=kind==='pending'?'Application received ✓':kind==='approved'?'Your account is approved!':'Application status: '+kind;
  $('gcc120-status-text').textContent=kind==='pending'?'A Global Classroom admin will verify your application. After approval, return to register as a Facilitator or GC Host; volunteer features stay locked until then.':kind==='approved'?'Next: register as a Breakout Room Facilitator or GC Host using your approved teacher profile. This does not grant Host Admin access.':'Contact Global Classroom if you need assistance.';}
 async function ready(){
  const serial=++readySequence,user=await currentUserV120();if(serial!==readySequence)return;
  draft=null;activeDraftUserId=null;displayActiveAccount(user);
  if(!user){displayedUserId=null;setStep('account');return;}
  if(displayedUserId!==user.id){$('gcc120-application').reset();updateBioCounter();$('gcc120-timezone').value=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Tokyo';displayedUserId=user.id;}
  try{
   if(await hasApprovedTeacherV120()){if(serial!==readySequence)return;status('approved');return;}
   const application=await beginApplicationV120();if(serial!==readySequence)return;
   const verified=await currentUserV120();if(serial!==readySequence)return;
   assertApplicantIdentityV139(verified,user.id);
   if(application.status!=='draft'){status(application.status);return;}
   draft=application;activeDraftUserId=user.id;setStep('profile');
   const fields=[['gcc120-name','name'],['gcc120-website','website'],['gcc120-bio','bio'],['gcc120-school','school_name'],['gcc120-school-web','school_website'],['gcc120-city','city'],['gcc120-region','region'],['gcc120-level','school_level'],['gcc120-type','school_type'],['gcc120-timezone','timezone']];
   for(const [id,k] of fields)if(application[k])$(id).value=application[k];
   updateBioCounter();
  }catch(error){notify(error.message||'Unable to load your application.',true);setStep('account');}
 }
 $('gcc120-signup-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{
   const existing=await currentUserV120();
   if(existing){displayActiveAccount(existing);throw Error('Already signed in as '+existing.email+'. Please sign out / switch account before creating another account.');}
   const result=await signupAccountV120($('gcc120-email').value,$('gcc120-password').value);$('gcc120-password').value='';
   if(result.session){notify('Account created. Complete your teacher and school profile below.');await ready();}
   else {
     $('gcc120-old-email').value=$('gcc120-email').value.trim();
     setAuthMode('signin');
     notify('Check your email for the confirmation link. Then sign in to submit your teacher profile for approval.');
     $('gcc120-old-password').focus();
   }
  }catch(err){notify(teacherSignupErrorV135(err),true);}finally{btn.disabled=false;}});
 $('gcc120-signin-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{
   await signinAccountV120($('gcc120-old-email').value,$('gcc120-old-password').value);$('gcc120-old-password').value='';notify('Signed in.');await ready();
  }catch(err){notify(teacherSignupErrorV135(err),true);}finally{btn.disabled=false;}});
 $('gcc120-application').addEventListener('submit',async e=>{e.preventDefault();if(!draft)return notify('Sign in first.',true);prepareSuccessChime();
  updateBioCounter();
  if(Array.from(bio.value.trim()).length>3000){bio.focus();return notify('Your introduction is over 3000 characters. Please shorten it before submitting.',true);}
  const file=$('gcc120-photo').files?.[0];if(!file)return notify('Please choose a clear photograph of your face.',true);
  const button=$('gcc120-submit');button.disabled=true;try{
   for(const id of ['gcc120-website','gcc120-school-web']){const value=$(id).value.trim();if(!value)continue;
    try{const url=new URL(value);if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw Error('Invalid URL');}
    catch{throw Error('If provided, personal or school websites must be valid HTTPS URLs (https://...).');}
   }
   const country=$('gcc120-country').selectedOptions[0];if(!country?.dataset.name)throw Error('Choose a country');
   assertApplicantIdentityV139(await currentUserV120(),activeDraftUserId);
   const latestDraft=await beginApplicationV120();
   assertEditableDraftV139(latestDraft,draft);
   notify('Compressing your photograph and submitting your application…');
   const photo=await uploadApplicationPhotoV120(draft.teacher_id,file);
   assertApplicantIdentityV139(await currentUserV120(),activeDraftUserId);
   const payload={name:$('gcc120-name').value.trim(),website:$('gcc120-website').value.trim(),bio:$('gcc120-bio').value.trim(),
    school_name:$('gcc120-school').value.trim(),school_website:$('gcc120-school-web').value.trim(),
    school_type:$('gcc120-type').value,school_level:$('gcc120-level').value,country:country.dataset.name,country_code:country.value,
    city:$('gcc120-city').value.trim(),region:$('gcc120-region').value.trim(),timezone:$('gcc120-timezone').value.trim()};
   const res=await submitApplicationV120(payload,photo.path);notify('');status(res.status);
   if(res.status==='pending')showSuccessCelebration({title:'Application received!',detail:'Your profile was submitted. GCC will review your application before approval.'});
  }catch(err){notify(teacherPhotoErrorV135(err),true);}finally{button.disabled=false;}});
 $('gcc139-switch-account').addEventListener('click',async()=>{const button=$('gcc139-switch-account');button.disabled=true;try{
  const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;
  $('gcc120-signin-form').reset();$('gcc120-signup-form').reset();
  setAuthMode('signin');await ready();notify('Signed out. Sign in with another account.');
 }catch(error){notify(teacherSignupErrorV135(error),true);}finally{button.disabled=false;}});
 resend.addEventListener('click',async()=>{
   const email=($('gcc120-old-email').value||$('gcc120-email').value).trim();
   if(!email||!/^\S+@\S+\.\S+$/.test(email)){notify('Enter your registered email address before resending.',true);return;}
   if(Date.now()-resendAt<60000){notify('Please wait at least one minute before resending.',true);return;}
   resend.disabled=true;
   try{
     await resendConfirmationV135(email);
     resendAt=Date.now();
     notify('If the email address is registered and sending is available, a new confirmation email has been requested. Check your inbox and spam folder.');
   }catch(e){notify(teacherSignupErrorV135(e),true);}
   finally{resend.disabled=false;}
 });
 fillChoices();updateBioCounter();ready().catch(e=>notify(teacherSignupErrorV135(e),true));
}
