// GCC V18.4 — landing state only; protected pages still verify authorization.
import {getCurrentUser,getCurrentProfile,signOut} from '../services/authService.js';
import {teacherIdentity} from '../services/teacherSelfService.js';
import {getGccLanguage} from './i18nV157.js';
export const menuAccess=({signedIn=false,host=false,teacher=false}={})=>({guest:!signedIn,account:!!signedIn,admin:!!signedIn&&!!host,teacher:!!signedIn&&!!teacher});
export function bindWelcomeAccountNavV184(){
 const root=document.querySelector('.gcc117-welcome');if(!root)return;
 const guest=root.querySelector('.gcc184-guest-actions'),menu=root.querySelector('.gcc184-user-menu');
 const status=root.querySelector('.gcc184-account-status'),signout=root.querySelector('[data-gcc-signout]');
 const admin=root.querySelector('[data-gcc-admin-mode]'),teacher=root.querySelector('[data-gcc-teacher-mode]');
 const profile=root.querySelector('[data-gcc-profile]'),note=root.querySelector('.gcc184-teacher-note');
 const language=root.querySelector('.gcc184-current-language');language.textContent=getGccLanguage().toUpperCase();
 root.querySelectorAll('.gcc184-lang-popup [data-lang]').forEach(b=>b.addEventListener('click',()=>{
   language.textContent=b.dataset.lang.toUpperCase();b.closest('details')?.removeAttribute('open');
 }));
 async function refresh(){
   guest.hidden=true;menu.hidden=true;
   let user=null;try{user=await getCurrentUser();}catch{}
   if(!root.isConnected)return;
   if(!user){guest.hidden=false;menu.open=false;return;}
   const [hostProfile,teacherProfile]=await Promise.all([getCurrentProfile().catch(()=>null),teacherIdentity().catch(()=>null)]);
   if(!root.isConnected)return;
   const access=menuAccess({signedIn:true,host:hostProfile?.role==='host',teacher:Boolean(teacherProfile)});
   guest.hidden=!access.guest;menu.hidden=!access.account;
   admin.hidden=!access.admin;teacher.hidden=!access.teacher;profile.hidden=!access.teacher;
   note.hidden=!access.admin||access.teacher;status.textContent='';
 }
 signout.addEventListener('click',async()=>{
   signout.disabled=true;status.textContent='';
   try{await signOut();menu.open=false;await refresh();window.location.hash='#/welcome';}
   catch{status.textContent='Could not sign out. Please try again.';}
   finally{signout.disabled=false;}
 });
 refresh().catch(()=>{if(root.isConnected){guest.hidden=false;menu.hidden=true;}});
}
