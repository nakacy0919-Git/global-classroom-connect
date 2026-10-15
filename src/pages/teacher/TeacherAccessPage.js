import '../../styles/teacherSelfService.css';
import {teacherSignIn,teacherSignUp,claimTeacherInvite,teacherIdentity,teacherSignOut} from '../../services/teacherSelfService.js';

export function TeacherAccessPage(){return `<main class="gct-auth-shell"><section class="gct-auth-card">
 <div class="gct-auth-icon">🌍</div><p class="gct-eyebrow">GLOBAL CLASSROOM CONNECT</p>
 <h1>Welcome, Teachers!</h1><p class="gct-subtitle">Sign in with your approved school email. To activate a new account, ask the host for your private teacher invitation code.</p>
 <form id="gcta-login" class="gct-auth-form"><h2>Teacher sign in</h2>
  <label>Email <input type="email" id="gcta-email" autocomplete="email" required></label>
  <label>Password <input type="password" id="gcta-password" autocomplete="current-password" minlength="8" required></label>
  <button type="submit" class="gct-primary">Sign in →</button>
 </form>
 <details class="gct-auth-expand"><summary>First time? Create your account</summary>
   <form id="gcta-signup" class="gct-auth-form">
   <label>Approved school email<input type="email" id="gcta-new-email" autocomplete="email" required></label>
   <label>Create password (8+ characters)<input type="password" id="gcta-new-password" minlength="8" autocomplete="new-password" required></label>
   <button type="submit" class="gct-secondary">Create account</button></form></details>
 <details class="gct-auth-expand"><summary>Have a teacher invitation code? Activate access</summary>
   <form id="gcta-claim" class="gct-auth-form"><p class="gct-hint">Sign in first. Your code is valid for 7 days and can be used once.</p>
   <label>Private invitation code<input id="gcta-token" spellcheck="false" autocomplete="off" required maxlength="32" minlength="32" placeholder="32-character code"></label>
   <button type="submit" class="gct-secondary">Activate teacher access →</button></form></details>
 <p id="gcta-message" role="status" aria-live="polite" class="gct-feedback"></p>
 <footer class="gct-auth-footer"><a href="#/login">Host sign in</a><span>·</span><a href="#/registration">School registration</a></footer>
 </section></main>`;}
export function bindTeacherAccessPage(){
 const root=document.querySelector('.gct-auth-card');if(!root)return;
 const $=id=>root.querySelector('#'+id),msg=$('gcta-message');
 const inform=(s,error=false)=>{msg.textContent=s;msg.classList.toggle('error',error);};
 async function busy(form,action){const button=form.querySelector('button[type="submit"]');button.disabled=true;try{await action();}catch(e){inform(e.message||'Unable to continue.',true);}finally{button.disabled=false;}}
 $('gcta-login').addEventListener('submit',e=>{e.preventDefault();busy(e.currentTarget,async()=>{
   await teacherSignIn($('gcta-email').value.trim(),$('gcta-password').value);
   try{await teacherIdentity();window.location.hash='#/teacher-portal';}
   catch{inform('Signed in. If this is your first visit, expand “Activate access” and enter the code from your host.');}
 });});
 $('gcta-signup').addEventListener('submit',e=>{e.preventDefault();busy(e.currentTarget,async()=>{
   const result=await teacherSignUp($('gcta-new-email').value.trim(),$('gcta-new-password').value);
   inform(result.session?'Account created. Open “Activate access” to enter your invite code.':'Check your email to confirm your account. Then sign in and activate with your invite code.');
 });});
 $('gcta-claim').addEventListener('submit',e=>{e.preventDefault();busy(e.currentTarget,async()=>{
   await claimTeacherInvite($('gcta-token').value);
   inform('Access activated. Opening your workspace…');window.location.hash='#/teacher-portal';
 });});
}
