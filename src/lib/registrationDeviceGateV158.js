import {playSuccessChime} from './successCelebrationV142.js';
import '../styles/registrationDeviceGateV158.css';

const DESKTOP='/assets/device-confirmation/desktop.webp';
const MOBILE='/assets/device-confirmation/mobile.webp';

/** Every visit to either public registration route requires a new confirmation.
 * Do not persist a skip flag; a teacher may enroll a different class next time.
 */
export function deviceRequirementMarkupV158(){
 return `<section class="gcc158-gate" id="gcc158-device-gate"
    aria-labelledby="gcc158-title" aria-describedby="gcc158-intro">
   <div class="gcc158-shell">
     <h1 class="gcc158-sr-only" id="gcc158-title">Before You Register</h1>
     <p class="gcc158-sr-only" id="gcc158-intro">Each student needs their own device. One student, one device. Please review the comparison before registering.</p>
     <div class="gcc158-image-frame">
       <picture>
         <source media="(max-width: 600px) and (orientation: portrait)" srcset="${MOBILE}" type="image/webp">
         <img id="gcc158-image" src="${DESKTOP}" width="1672" height="941"
           alt="Before You Register: Each student needs their own device. Correct: three students each join on separate computers or tablets. Not correct: multiple students share one laptop. Shared devices cause breakout room assignment problems. Please confirm this before registration."
           decoding="async" fetchpriority="high">
       </picture>
       <div class="gcc158-complete" id="gcc158-complete" role="status" aria-live="polite" hidden>
         <span class="gcc158-check" aria-hidden="true">✓</span><strong>OK! Confirmed</strong>
       </div>
     </div>
     <div class="gcc158-bottom">
       <button id="gcc158-understand" type="button" class="gcc158-confirm">I Understand <span aria-hidden="true">✓</span></button>
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
