import {playSuccessChime,successSoundOn,setSuccessSoundOn} from './successCelebrationV142.js';
/* GCC V14.5 – session netiquette gate; no security decisions stored in the browser.
   The 6-digit code and revocable invitation token still control room data access. */
const GUIDE_KEY='gcc-netiquette-v145-confirmed';
export const NETIQUETTE_SLIDES_V145=[
  {title:'Zoom Netiquette',description:'Please follow these simple rules during today’s session.',details:'Keep your camera on, mute while listening, use the correct Zoom name, and join your assigned room.'},
  {title:'1. Camera & Sound',description:'Be visible and be easy to hear.',details:'Keep your camera on and let others see your smile. Mute when others are speaking; unmute only when it is your turn.'},
  {title:'2. Your Zoom Name',description:'Use the correct name format.',details:'Students: Student + Your Name + Country. Teachers: Teacher + Your Name. Do not use your school name.'},
  {title:'3. Good Online Manners',description:'Be kind, respectful, and ready to join.',details:'Listen carefully, wait your turn, use kind words, smile, and participate.'},
  {title:'4. How to Join a Breakout Room',description:'Look for Breakout Rooms in Zoom.',details:'If the button is missing, select More (…). Then choose your room and tap Join. Ask your host or teacher for help if needed.'}
];
export const isGuideConfirmedV145=(storage)=>{
  try{return storage?.getItem(GUIDE_KEY)==='yes';}catch{return false;}
};
export const markGuideConfirmedV145=(storage)=>{
  try{storage?.setItem(GUIDE_KEY,'yes');return true;}catch{return false;}
};
export function netiquetteGuideMarkupV145(){
 return `<section id="gcc-v145-guide" class="gcc-v145-guide" aria-labelledby="gcc-v145-guide-title" hidden>
  <div class="gcc-v145-header">
    <p class="gcc-v145-eyebrow">GLOBAL CLASSROOM CONNECT · SESSION GUIDE</p>
    <h2 id="gcc-v145-guide-title" tabindex="-1">Before you join your breakout room</h2>
    <p class="gcc-v145-intro">Please read each of the five slides. First-time visitors must complete the guide.</p>
  </div>
  <div class="gcc-v145-progress" aria-label="Guide progress">
    <span id="gcc-v145-count">1 of 5</span>
    <div id="gcc-v145-bars" class="gcc-v145-bars" aria-hidden="true"></div>
    <button id="gcc-v147-sound" class="gcc-v147-sound" type="button" aria-label="Turn off confirmation sound" aria-pressed="true">♪ Sound on</button>
  </div>
  <div id="gcc-v145-illustration" class="gcc-v145-illustration">
    <picture id="gcc-v145-picture">
      <source id="gcc-v145-mobile-source" media="(max-width: 800px) and (orientation: portrait)" type="image/webp" srcset="/assets/netiquette/mobile-01.webp">
      <img id="gcc-v145-slide-image" src="/assets/netiquette/desktop-01.webp" alt="Global Classroom Zoom Netiquette overview" width="960" height="540" decoding="async">
    </picture>
    <div id="gcc-v146-complete" class="gcc-v146-complete" role="status" aria-live="polite" hidden><span aria-hidden="true">✓</span> OK! Confirmed</div>
    <div id="gcc-v145-fallback" class="gcc-v145-fallback" hidden><strong id="gcc-v145-slide-title">Zoom Netiquette</strong><span id="gcc-v145-slide-details">Keep your camera on. Mute while listening.</span></div>
  </div>
  <p id="gcc-v145-description" class="gcc-v145-description"></p>
  <div class="gcc-v145-actions">
    <button id="gcc-v145-prev" class="gcc-v145-secondary" type="button" hidden>← Previous</button>
    <button id="gcc-v145-confirm" class="gcc-v145-primary" type="button">I have read and understood <span aria-hidden="true">✓</span></button>
    <button id="gcc-v145-skip" class="gcc-v145-skip" type="button" hidden>Skip (already completed)</button>
  </div>
  <p class="gcc-v145-storage-note">Your confirmation is remembered on this browser. Your session code was verified before this guide.</p>
 </section>`;
}
const safeStorageV145=()=>{try{return globalThis.localStorage;}catch{return null;}};
/**
 * Stage 1: display the 6-digit code entry. Only after an API-verified code may
 * the caller invoke show(). Stage 2: each acknowledgement gives brief visual
 * feedback, then the next slide. Stage 3: only then call onComplete() to draw
 * the private chart. The localStorage flag only affects the optional skip link.
 */
export function bindNetiquetteGuideV145(root,validInvitation,{storage=safeStorageV145()}={}){
 const gate=root.querySelector('#gcc-v145-guide'),access=root.querySelector('#gcc-v145-room-access');
 if(!gate||!access)return {show:()=>false};
 gate.hidden=true;
 access.hidden=false;
 // Invalid links still show the original error; they never start the guide.
 if(!validInvitation)return {show:()=>false};
 let index=0,advancing=false,completionCallback=null,pendingTimer=null;
 const title=gate.querySelector('#gcc-v145-slide-title');
 const details=gate.querySelector('#gcc-v145-slide-details');
 const count=gate.querySelector('#gcc-v145-count');
 const progress=gate.querySelector('#gcc-v145-bars');
 const picture=gate.querySelector('#gcc-v145-picture');
 const image=gate.querySelector('#gcc-v145-slide-image');
 const mobileSource=gate.querySelector('#gcc-v145-mobile-source');
 const fallback=gate.querySelector('#gcc-v145-fallback');
 const description=gate.querySelector('#gcc-v145-description');
 const confirm=gate.querySelector('#gcc-v145-confirm');
 const previous=gate.querySelector('#gcc-v145-prev');
 const skip=gate.querySelector('#gcc-v145-skip');
 const completedBadge=gate.querySelector('#gcc-v146-complete');
 const soundButton=gate.querySelector('#gcc-v147-sound');
 const updateSoundButton=()=>{
   const on=successSoundOn();
   soundButton.textContent=on?'♪ Sound on':'♪ Sound off';
   soundButton.setAttribute('aria-pressed',String(on));
   soundButton.setAttribute('aria-label',on?'Turn off confirmation sound':'Turn on confirmation sound');
 };
 soundButton.addEventListener('click',()=>{
   setSuccessSoundOn(!successSoundOn());
   updateSoundButton();
 });
 updateSoundButton();
 const reducedMotion=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const moveToTop=()=>gate.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});
 const finish=()=>{
   if(pendingTimer!==null){clearTimeout(pendingTimer);pendingTimer=null;}
   gate.hidden=true;
   access.hidden=false;
   const callback=completionCallback;
   completionCallback=null;
   callback?.();
 };
 function draw(){
   advancing=false;
   confirm.disabled=false;
   previous.disabled=false;
   skip.disabled=false;
   completedBadge.hidden=true;
   completedBadge.classList.remove('gcc-v146-pop');
   const slide=NETIQUETTE_SLIDES_V145[index];
   title.textContent=slide.title;
   details.textContent=slide.details;
   description.textContent=slide.description;
   count.textContent=`${index+1} of ${NETIQUETTE_SLIDES_V145.length}`;
   const number=String(index+1).padStart(2,'0');
   picture.hidden=false;
   fallback.hidden=true;
   mobileSource.srcset=`/assets/netiquette/mobile-${number}.webp`;
   image.src=`/assets/netiquette/desktop-${number}.webp`;
   image.alt=`${slide.title}. ${slide.details}`;
   progress.replaceChildren();
   for(let i=0;i<NETIQUETTE_SLIDES_V145.length;i++){
     const bar=document.createElement('span');
     if(i<=index)bar.classList.add('active');
     progress.append(bar);
   }
   previous.hidden=index===0;
   confirm.firstChild.textContent=index===NETIQUETTE_SLIDES_V145.length-1
     ?'I understand — Open my room chart ':'I have read and understood ';
 }
 image.addEventListener('error',()=>{picture.hidden=true;fallback.hidden=false;});
 image.addEventListener('load',()=>{picture.hidden=false;fallback.hidden=true;});
 confirm.addEventListener('click',()=>{
   if(advancing||gate.hidden)return;
   advancing=true;
   confirm.disabled=true;
   previous.disabled=true;
   skip.disabled=true;
   completedBadge.hidden=false;
   completedBadge.classList.add('gcc-v146-pop');
   // Directly inside the tap gesture: required for iOS Safari and Android audio unlock.
   playSuccessChime();
   pendingTimer=setTimeout(()=>{
     pendingTimer=null;
     if(!root.isConnected)return;
     if(index===NETIQUETTE_SLIDES_V145.length-1){
       markGuideConfirmedV145(storage);
       finish();
     }else{
       index++;
       draw();
       moveToTop();
     }
   },reducedMotion()?0:490);
 });
 previous.addEventListener('click',()=>{
   if(advancing||index===0)return;
   index--;
   draw();
   moveToTop();
 });
 skip.addEventListener('click',()=>{
   if(!advancing&&!gate.hidden&&isGuideConfirmedV145(storage))finish();
 });
 return {
   show(onComplete){
     if(typeof onComplete!=='function'||!root.isConnected)return false;
     if(pendingTimer!==null){clearTimeout(pendingTimer);pendingTimer=null;}
     completionCallback=onComplete;
     index=0;
     access.hidden=true;
     gate.hidden=false;
     skip.hidden=!isGuideConfirmedV145(storage);
     updateSoundButton();
     draw();
     gate.querySelector('#gcc-v145-guide-title').focus({preventScroll:true});
     moveToTop();
     return true;
   }
 };
}
