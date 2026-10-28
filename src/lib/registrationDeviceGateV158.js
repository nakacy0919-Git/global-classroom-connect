import {playSuccessChime} from './successCelebrationV142.js';
import '../styles/registrationDeviceGateV158.css';

const DESKTOP='/assets/device-confirmation/desktop.svg';
const MOBILE='/assets/device-confirmation/mobile.svg';

/** Every visit to either public registration route requires a new confirmation.
 * Do not persist a skip flag; a teacher may enroll a different class next time.
 */
export function deviceRequirementMarkupV158(){
 return `<section class="gcc158-gate" id="gcc158-device-gate"
    aria-labelledby="gcc158-title" aria-describedby="gcc158-intro">
   <div class="gcc158-shell">
     <header class="gcc158-header">
       <div class="gcc158-brand">🌐 GLOBAL CLASSROOM CONNECT</div>
       <h1 id="gcc158-title" tabindex="-1">Before You Register</h1>
       <p id="gcc158-intro">One student = one device. Please check this important requirement.</p>
     </header>
     <div class="gcc158-image-frame">
       <picture>
         <source media="(max-width: 800px) and (orientation: portrait)" srcset="${MOBILE}" type="image/svg+xml">
         <img id="gcc158-image" src="${DESKTOP}" width="1200" height="675"
           alt="Correct: each of three students uses a separate device. Not correct: three students share one laptop. Every student must connect individually for breakout room assignments."
           decoding="async" fetchpriority="high">
       </picture>
       <div class="gcc158-complete" id="gcc158-complete" role="status" aria-live="polite" hidden>
         <span class="gcc158-check" aria-hidden="true">✓</span><strong>OK! Confirmed</strong>
       </div>
     </div>
     <div class="gcc158-bottom">
       <p class="gcc158-reminder">Every registered student needs their own device to join the breakout room. Sharing a device will cause room assignment problems.</p>
       <button id="gcc158-understand" type="button" class="gcc158-confirm">I Understand — Continue to Registration <span aria-hidden="true">✓</span></button>
     </div>
   </div>
 </section>`;
}
/** Registration form stays inaccessible until the teacher actually acknowledges. */
export function bindDeviceRequirementV158(root){
 const gate=root?.querySelector('#gcc158-device-gate');
 const form=root?.querySelector('#gcc158-register-form');
 const button=gate?.querySelector('#gcc158-understand');
 const badge=gate?.querySelector('#gcc158-complete');
 if(!gate||!form||!button||!badge)return false;
 gate.hidden=false;
 form.hidden=true;
 let completed=false;
 button.addEventListener('click',()=>{
   if(completed||gate.hidden)return;
   completed=true;
   button.disabled=true;
   badge.hidden=false;
   badge.classList.add('gcc158-complete-pop');
   // Must be called inside the user gesture to unlock iPhone Safari audio.
   playSuccessChime();
   const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   window.setTimeout(()=>{
     if(!root.isConnected)return;
     gate.hidden=true;form.hidden=false;
     const first=form.querySelector('h1,h2,#gcc-v6-step-title,[tabindex="-1"]');
     if(first){first.setAttribute('tabindex','-1');first.focus({preventScroll:true});}
     window.scrollTo?.({top:0,behavior:'instant'});
   },reducedMotion?0:660);
 });
 return true;
}
