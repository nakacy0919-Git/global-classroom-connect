import '../../styles/teacherPasswordV136.css';
import {supabase} from '../../services/supabase.js';
import {teacherSignupErrorV135} from '../../lib/teacherSignupRecoveryV135.js';
const recovering=()=>new URLSearchParams(window.location.search).get('gcc_recovery')==='1';
export function TeacherPasswordPageV136(){
 const mode=recovering();
 const heading=mode?'Choose a new password':'Reset your teacher password';
 const intro=mode?'Open this page using your password recovery email link.':'If you have already registered, request a secure recovery email. Do not create another account.';
 const form=mode?
  '<form id="gcc136-change" class="gcc120-grid gcc126-form"><label>New password (8 characters minimum)<input id="gcc136-pass" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirm new password<input id="gcc136-confirm" type="password" minlength="8" autocomplete="new-password" required></label><button type="submit" class="gcc120-primary">Save new password</button></form>':
  '<form id="gcc136-request" class="gcc120-grid gcc126-form"><label>Registered email address<input type="email" id="gcc136-email" autocomplete="email" required></label><button type="submit" class="gcc120-primary">Send recovery email</button></form>';
 return '<main class="gcc120-page gcc126-page"><section class="gcc120-join gcc120-signin-page gcc126-login gcc136-password"><a href="#/teacher-access" class="gcc120-back gcc126-back">← Teacher sign in</a><header class="gcc126-heading"><div class="gcc126-heading-text"><p class="gcc126-eyebrow">GLOBAL CLASSROOM CONNECT</p><h1>'+heading+'</h1><p>'+intro+'</p></div></header><p id="gcc136-msg" class="gcc120-message gcc126-feedback" role="status" aria-live="polite"></p>'+form+'<p class="gcc136-help">Never share your password with anyone. Check your spam folder if the email does not arrive.</p></section></main>';
}
export function bindTeacherPasswordPageV136(){
 const root=document.querySelector('.gcc136-password');if(!root)return;
 const $=id=>root.querySelector('#'+id),msg=$('gcc136-msg');
 const inform=(s,error=false)=>{msg.textContent=s;msg.classList.toggle('error',error);};
 if(!supabase){inform('GCC authentication is temporarily unavailable.',true);return;}
 if(!recovering()){
  let lastRequest=0;
  $('gcc136-request').addEventListener('submit',async e=>{
   e.preventDefault();
   if(Date.now()-lastRequest<60000){inform('Please wait at least one minute before requesting another email.',true);return;}
   const btn=e.currentTarget.querySelector('button');btn.disabled=true;
   inform('Requesting a recovery email… Please keep this page open.');
   try{
    const redirectTo=window.location.origin+window.location.pathname+'?gcc_recovery=1';
    const {error}=await supabase.auth.resetPasswordForEmail($('gcc136-email').value.trim().toLowerCase(),{redirectTo});
    if(error)throw error;
    lastRequest=Date.now();
    inform('If this address is registered, a recovery link has been requested. Please check your inbox and spam folder.');
   }catch(err){inform(teacherSignupErrorV135(err),true);}
   finally{btn.disabled=false;}
  });
  return;
 }
 let validSession=false;
 const btn=$('gcc136-change').querySelector('button');btn.disabled=true;
 supabase.auth.getSession().then(({data,error})=>{
  if(!root.isConnected)return;
  validSession=!error&&Boolean(data?.session?.user);
  if(validSession){btn.disabled=false;inform('Recovery link accepted. Enter and confirm your new password.');}
  else inform('Recovery link expired or invalid. Return to Teacher sign in and request another.',true);
 }).catch(()=>{if(root.isConnected)inform('Unable to validate recovery link. Please request another.',true);});
 $('gcc136-change').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!validSession){inform('Recovery link is not verified. Request another.',true);return;}
  const password=$('gcc136-pass').value,confirm=$('gcc136-confirm').value;
  if(password!==confirm){inform('Passwords do not match.',true);return;}
  if(password.length<8){inform('Please choose at least eight characters.',true);return;}
  btn.disabled=true;
  try{
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   $('gcc136-pass').value='';$('gcc136-confirm').value='';
   inform('Password updated. Continue your teacher application.');
   window.location.replace(window.location.origin+window.location.pathname+'#/signup');
  }catch(err){inform(teacherSignupErrorV135(err),true);btn.disabled=false;}
 });
}
