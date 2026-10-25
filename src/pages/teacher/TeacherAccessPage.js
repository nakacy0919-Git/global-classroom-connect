import '../../styles/teacherSelfService.css';
import '../../styles/teacherJoinV120.css';
import {teacherSignIn,claimTeacherInvite,teacherIdentity} from '../../services/teacherSelfService.js';
import {beginApplicationV120} from '../../services/teacherOnboardingV120.js';
const destination=()=>{const next=new URLSearchParams(window.location.hash.split('?')[1]||'').get('next');return '#/teacher-portal?view='+(['home','create','find','volunteer','network','requests'].includes(next)?next:'home');};
export function TeacherAccessPage(){return `<main class="gcc120-page"><section class="gcc120-join gcc120-signin-page">
 <a class="gcc120-back" href="#/welcome">← Global Classroom Connect</a>
 <div class="gcc120-title"><span>GLOBAL CLASSROOM CONNECT</span><h1>Welcome back, Teachers!</h1><p>Sign in with your email and password. Session access begins after your school and teacher profile have been approved.</p></div>
 <form id="gcta-login" class="gcc120-grid"><label>Email *<input type="email" id="gcta-email" autocomplete="email" required></label>
  <label>Password *<input type="password" id="gcta-password" autocomplete="current-password" required></label>
  <button class="gcc120-primary gcc120-span" type="submit">Sign in →</button></form>
 <p id="gcta-message" class="gcc120-message" role="status" aria-live="polite"></p>
 <a class="gcc120-secondary gcc120-inline" href="#/signup">New here? Sign up →</a>
 <details class="gct-auth-expand"><summary>Already approved under an older invitation? Activate access</summary>
  <form id="gcta-claim" class="gct-auth-form"><label>Private teacher invitation code<input id="gcta-token" spellcheck="false" autocomplete="off" required maxlength="32" minlength="32"></label>
  <button type="submit" class="gct-secondary">Activate teacher access</button></form></details>
 <details class="gct-auth-expand"><summary>Legacy school registration</summary><p>Register school &amp; teacher with a Registration invitation code. Existing approval applications remain available.</p><a href="#/registration">Open legacy registration</a></details>
 <footer class="gcc120-foot"><a href="#/login">Host sign in</a> · <a href="#/signup">Teacher sign up</a></footer>
 </section></main>`;}
export function bindTeacherAccessPage(){
 const root=document.querySelector('.gcc120-signin-page');if(!root)return;const $=id=>root.querySelector('#'+id),msg=$('gcta-message');
 const inform=(text,error=false)=>{msg.textContent=text;msg.classList.toggle('error',error);};
 $('gcta-login').addEventListener('submit',async event=>{event.preventDefault();const btn=event.currentTarget.querySelector('button');btn.disabled=true;
  try{await teacherSignIn($('gcta-email').value.trim(),$('gcta-password').value);$('gcta-password').value='';
   try{await teacherIdentity();window.location.hash=destination();return;}catch{}
   try{const draft=await beginApplicationV120();if(draft.status==='pending'){inform('Signed in. Your registration is waiting for administrator approval. Session features remain locked.');return;}
     if(draft.status==='rejected'){inform('The application was not approved. Contact the Global Classroom team.',true);return;}
     window.location.hash='#/signup';}
   catch(e){inform('Signed in, but teacher access is not active. Complete your application under Sign up, or use your existing invitation code.',true);}
  }catch(e){inform(e.message||'Sign in failed.',true);}finally{btn.disabled=false;}});
 $('gcta-claim').addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{await claimTeacherInvite($('gcta-token').value);inform('Access activated.');window.location.hash=destination();}
  catch(err){inform(err.message||'Invitation code was not accepted.',true);}finally{btn.disabled=false;}});
}
