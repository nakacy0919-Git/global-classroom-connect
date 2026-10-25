import '../../styles/teacherJoinV120.css';
import {supabase} from '../../services/supabase.js';
import {countries} from '../../data/countries.js';
import {signupAccountV120,signinAccountV120,currentUserV120,beginApplicationV120,
 submitApplicationV120,uploadApplicationPhotoV120,previewApplicationPhotoV120,hasApprovedTeacherV120} from '../../services/teacherOnboardingV120.js';
const safe=(s)=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function TeacherJoinV120(){return `<main class="gcc120-page"><section class="gcc120-join" aria-label="Join Global Classroom">
 <a class="gcc120-back" href="#/welcome">← Global Classroom Connect</a>
 <div class="gcc120-title"><span>🌎 JOIN OUR GLOBAL TEACHER COMMUNITY</span><h1>Create your GCC account</h1><p>Start with your email, then add your teacher and school details. Your access starts after Global Classroom approves your application.</p></div>
 <p class="gcc120-message" id="gcc120-msg" role="status" aria-live="polite"></p>
 <section id="gcc120-account-step" class="gcc120-panel"><h2><span class="gcc120-step">1</span> Your account</h2>
  <form id="gcc120-signup-form" class="gcc120-grid"><label>Email address *<input type="email" id="gcc120-email" autocomplete="email" required></label>
  <label>Password (at least 8 characters) *<input type="password" id="gcc120-password" autocomplete="new-password" minlength="8" required></label>
  <button class="gcc120-primary gcc120-span" type="submit">Create account →</button></form>
  <div class="gcc120-signin"><p>Already have an account, or confirmed your email? Sign in to continue.</p>
    <form id="gcc120-signin-form" class="gcc120-grid"><label>Email<input id="gcc120-old-email" type="email" autocomplete="email" required></label>
    <label>Password<input id="gcc120-old-password" type="password" autocomplete="current-password" required></label>
    <button type="submit" class="gcc120-secondary gcc120-span">Sign in and continue</button></form></div>
 </section>
 <section id="gcc120-profile-step" class="gcc120-panel" hidden><h2><span class="gcc120-step">2</span> Teacher &amp; school information</h2>
  <p class="gcc120-hint">Your profile photo, introduction, and website are required. Please use a clear, recognizable photo of your face. A GCC reviewer will check your application.</p>
  <form id="gcc120-application" class="gcc120-grid">
  <h3 class="gcc120-span">About you</h3>
  <label>Full name *<input id="gcc120-name" autocomplete="name" minlength="2" maxlength="120" required></label>
  <label>Personal website (HTTPS) *<input id="gcc120-website" type="url" placeholder="https://..." maxlength="240" required></label>
  <label class="gcc120-span">Short self-introduction (20–1000 characters) *<textarea id="gcc120-bio" rows="3" minlength="20" maxlength="1000" required placeholder="Tell other teachers about your teaching and interests"></textarea></label>
  <label class="gcc120-span">Clear face photograph (JPEG, PNG or WebP, 5 MB maximum) *<input id="gcc120-photo" type="file" accept="image/jpeg,image/png,image/webp" required><small>Processed privately in your browser into a WebP image, maximum 512 pixels.</small></label>
  <h3 class="gcc120-span">Your school</h3>
  <label>School / organization name *<input id="gcc120-school" minlength="2" maxlength="160" required></label>
  <label>School website (HTTPS) *<input id="gcc120-school-web" type="url" placeholder="https://..." maxlength="240" required></label>
  <label>School type *<select id="gcc120-type" required><option value="">Choose one</option><option>Public</option><option>Private</option><option>Independent / individual</option><option>Other</option></select></label>
  <label>School level *<select id="gcc120-level" required><option value="">Choose one</option><option>Elementary</option><option>Junior high</option><option>High school</option><option>University</option><option>Other</option></select></label>
  <label>Country *<select id="gcc120-country" required><option value="">Choose country</option></select></label>
  <label>City *<input id="gcc120-city" required minlength="2" maxlength="120"></label>
  <label>Region / prefecture / state *<input id="gcc120-region" required minlength="2" maxlength="120"></label>
  <label>School time zone (IANA) *<input id="gcc120-timezone" required placeholder="Asia/Tokyo" list="gcc120-zones"></label>
  <datalist id="gcc120-zones"></datalist>
  <p class="gcc120-span gcc120-hint">Independent or individual schools are welcome. Please enter the school or organization name, location and a website that reviewers can verify. No student names are required.</p>
  <button type="submit" id="gcc120-submit" class="gcc120-primary gcc120-span">Submit for approval →</button>
  </form></section>
 <section id="gcc120-status-step" class="gcc120-panel" hidden><h2 id="gcc120-status-title">Your application</h2><p id="gcc120-status-text"></p><a href="#/welcome" class="gcc120-secondary gcc120-inline">Return to GCC home</a></section>
 <footer class="gcc120-foot">Already approved? <a href="#/teacher-access">Sign in</a> · <a href="#/registration">Legacy invitation registration</a></footer>
 </section></main>`;}
export function bindTeacherJoinV120(){
 const root=document.querySelector('.gcc120-join');if(!root)return;
 const $=id=>root.querySelector('#'+id),notify=(v,error=false)=>{const m=$('gcc120-msg');m.textContent=v;m.classList.toggle('error',error);};
 let draft=null;
 function setStep(which){for(const s of ['account','profile','status'])$('gcc120-'+s+'-step').hidden=s!==which;}
 function fillChoices(){
  const sel=$('gcc120-country');for(const c of countries){const name=c.name||c.label||c.country||'',code=c.code||c.iso2||c.iso||'';
   if(name&&/^[A-Z]{2}$/i.test(code)){const opt=new Option(name,code.toUpperCase());opt.dataset.name=name;sel.append(opt);}}
  const zones=$('gcc120-zones');try{for(const name of Intl.supportedValuesOf('timeZone'))zones.append(new Option(name,name));}catch{zones.append(new Option('Asia/Tokyo','Asia/Tokyo'));}
  $('gcc120-timezone').value=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Tokyo';
 }
 function status(kind){setStep('status');$('gcc120-status-title').textContent=kind==='pending'?'Application received ✓':kind==='approved'?'Your account is approved!':'Application status: '+kind;
  $('gcc120-status-text').textContent=kind==='pending'?'A Global Classroom admin will verify your school, websites, introduction and face photograph. You can sign in now, but hosting, finding sessions and volunteering unlock only after approval.':kind==='approved'?'You can now sign in and use GCC teacher features.':'Contact Global Classroom if you need assistance.';}
 async function ready(){const user=await currentUserV120();if(!user){setStep('account');return;}try{
   if(await hasApprovedTeacherV120()){status('approved');return;}
   draft=await beginApplicationV120();if(draft.status!=='draft'){status(draft.status);return;}
   setStep('profile');const fields=[['gcc120-name','name'],['gcc120-website','website'],['gcc120-bio','bio'],['gcc120-school','school_name'],['gcc120-school-web','school_website'],['gcc120-city','city'],['gcc120-region','region'],['gcc120-level','school_level'],['gcc120-type','school_type'],['gcc120-timezone','timezone']];
   for(const [id,k] of fields)if(draft[k])$(id).value=draft[k];
  }catch(e){notify(e.message||'Unable to load your application.',true);setStep('account');}}
 $('gcc120-signup-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{
   const result=await signupAccountV120($('gcc120-email').value,$('gcc120-password').value);$('gcc120-password').value='';
   if(result.session){notify('Account created. Complete your teacher profile below.');await ready();}
   else notify('Account created. Check your email to confirm it, then return here and sign in to complete the application.');
  }catch(err){notify(err.message||'Could not create account',true);}finally{btn.disabled=false;}});
 $('gcc120-signin-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{
   await signinAccountV120($('gcc120-old-email').value,$('gcc120-old-password').value);$('gcc120-old-password').value='';notify('Signed in.');await ready();
  }catch(err){notify(err.message||'Sign in failed.',true);}finally{btn.disabled=false;}});
 $('gcc120-application').addEventListener('submit',async e=>{e.preventDefault();if(!draft)return notify('Sign in first.',true);
  const file=$('gcc120-photo').files?.[0];if(!file)return notify('Please choose a clear photograph of your face.',true);
  const button=$('gcc120-submit');button.disabled=true;try{
   const site=(id)=>new URL($(id).value.trim());for(const id of ['gcc120-website','gcc120-school-web'])if(site(id).protocol!=='https:')throw Error('Both website links must start with https://');
   const country=$('gcc120-country').selectedOptions[0];if(!country?.dataset.name)throw Error('Choose a country');
   notify('Compressing your photograph and submitting your application…');
   const photo=await uploadApplicationPhotoV120(draft.teacher_id,file);
   const payload={name:$('gcc120-name').value.trim(),website:$('gcc120-website').value.trim(),bio:$('gcc120-bio').value.trim(),
    school_name:$('gcc120-school').value.trim(),school_website:$('gcc120-school-web').value.trim(),
    school_type:$('gcc120-type').value,school_level:$('gcc120-level').value,country:country.dataset.name,country_code:country.value,
    city:$('gcc120-city').value.trim(),region:$('gcc120-region').value.trim(),timezone:$('gcc120-timezone').value.trim()};
   const res=await submitApplicationV120(payload,photo.path);notify('');status(res.status);
  }catch(err){notify(err.message||'Unable to submit application.',true);}finally{button.disabled=false;}});
 fillChoices();ready().catch(e=>notify(e.message,true));
}
