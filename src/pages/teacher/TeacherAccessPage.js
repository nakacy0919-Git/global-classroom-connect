import '../../styles/teacherSelfService.css';
import '../../styles/teacherJoinV120.css';
import gccOfficialBadgeV119 from '../../assets/gcc-v119-official.webp';
import '../../styles/teacherLoginV126.css';
import '../../styles/teacherPasswordV136.css';
import '../../styles/teacherLoginOceanV144.css';
import {teacherSignupErrorV135} from '../../lib/teacherSignupRecoveryV135.js';
import {teacherSignIn,claimTeacherInvite,teacherIdentity} from '../../services/teacherSelfService.js';
import {getCurrentProfile} from '../../services/authService.js';
import {beginApplicationV120} from '../../services/teacherOnboardingV120.js';
const destination=()=>{const next=new URLSearchParams(window.location.hash.split('?')[1]||'').get('next');if(['create','find','volunteer','network','requests','profile'].includes(next))return '#/teacher-portal?view='+next;return '#/welcome';};
export function TeacherAccessPage(){return `<main class="gcc120-page gcc126-page gcc144-page">
 <div class="gcc144-scene">
  <div class="gcc144-scenic-copy" aria-hidden="true">
   <span class="gcc144-scene-kicker">GLOBAL CLASSROOM CONNECT · TEACHER SPACE</span>
   <h2>Teach locally.<br/>Connect globally.</h2>
   <p>Every classroom is a doorway to the world.</p>
  </div>
  <section class="gcc120-join gcc120-signin-page gcc126-login gcc144-card" aria-labelledby="gcc144-teacher-heading">
   <a class="gcc120-back gcc126-back gcc144-back" href="#/welcome"><span aria-hidden="true">←</span> Back to GCC</a>
   <header class="gcc126-heading gcc144-heading"><img src="${gccOfficialBadgeV119}" width="64" height="64" alt="" aria-hidden="true"/>
    <div class="gcc126-heading-text"><p class="gcc126-eyebrow">GLOBAL CLASSROOM CONNECT</p><h1 id="gcc144-teacher-heading">Sign in</h1><p>Welcome back. Connect your classroom to the world.</p></div>
   </header>
   <form id="gcta-login" class="gcc120-grid gcc126-form gcc144-form">
    <label>Email address<input type="email" id="gcta-email" autocomplete="email" required></label>
    <label>Password<input type="password" id="gcta-password" autocomplete="current-password" required></label>
    <div class="gcc120-span gcc126-actions gcc144-actions">
     <button class="gcc120-primary" type="submit">Sign in <span aria-hidden="true">→</span></button>
     <a href="#/signup" class="gcc120-secondary gcc126-signup">Create an account</a>
    </div>
   </form>
   <p id="gcta-message" class="gcc120-message gcc126-feedback" role="status" aria-live="polite"></p>
   <p class="gcc126-password-help gcc144-password-help"><a href="#/teacher-password">Forgot your password? Reset it by email</a></p>
   <details class="gct-auth-expand gcc126-invitation gcc144-invitation"><summary>Have an invitation code? Activate access</summary>
    <form id="gcta-claim" class="gct-auth-form"><label>Private teacher invitation code<input id="gcta-token" spellcheck="false" autocomplete="off" required maxlength="32" minlength="32"></label>
    <button type="submit" class="gct-secondary">Activate access</button></form>
   </details>
   
  </section>
 </div>
</main>`;}
export function bindTeacherAccessPage(){
 // The password-recovery screen shares the sign-in styling, but not its form.
 // Bind only when the real Teacher sign-in form exists.
 const root=document.querySelector('#gcta-login')?.closest('.gcc120-signin-page');if(!root)return;
 const $=id=>root.querySelector('#'+id),msg=$('gcta-message');
 const inform=(text,error=false)=>{msg.textContent=text;msg.classList.toggle('error',error);};
 $('gcta-login').addEventListener('submit',async event=>{event.preventDefault();const btn=event.currentTarget.querySelector('button');btn.disabled=true;
  try{await teacherSignIn($('gcta-email').value.trim(),$('gcta-password').value);$('gcta-password').value='';
   const hostProfile=await getCurrentProfile();
   if(hostProfile?.role==='host'){
     try{await teacherIdentity();window.location.hash=destination();}
     catch{window.location.hash='#/sessions';}
     return;
   }
   try{await teacherIdentity();window.location.hash=destination();return;}catch{}
   try{const draft=await beginApplicationV120();if(draft.status==='pending'){inform('Signed in. Your registration is waiting for administrator approval. Session features remain locked.');return;}
     if(draft.status==='rejected'){inform('The application was not approved. Contact the Global Classroom team.',true);return;}
     window.location.hash='#/signup';}
   catch(e){inform('Signed in, but teacher access is not active. Complete your application under Sign up, or use your existing invitation code.',true);}
  }catch(e){const message=teacherSignupErrorV135(e);inform(message+(String(e?.message||'').toLowerCase().includes('invalid login credentials')?' Use Forgot your password? if needed.':''),true);}finally{btn.disabled=false;}});
 $('gcta-claim').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{await claimTeacherInvite($('gcta-token').value);inform('Access activated.');window.location.hash=destination();}
  catch(err){inform(err.message||'Invitation code was not accepted.',true);}finally{btn.disabled=false;}});
}
