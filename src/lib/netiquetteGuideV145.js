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
 return `<section id="gcc-v145-guide" class="gcc-v145-guide" aria-labelledby="gcc-v145-guide-title">
  <div class="gcc-v145-header">
    <p class="gcc-v145-eyebrow">GLOBAL CLASSROOM CONNECT · SESSION GUIDE</p>
    <h2 id="gcc-v145-guide-title">Before you join your breakout room</h2>
    <p class="gcc-v145-intro">Please read each of the five slides. First-time visitors must complete the guide.</p>
  </div>
  <div class="gcc-v145-progress" aria-label="Guide progress">
    <span id="gcc-v145-count">1 of 5</span>
    <div id="gcc-v145-bars" class="gcc-v145-bars" aria-hidden="true"></div>
  </div>
  <div id="gcc-v145-illustration" class="gcc-v145-illustration" role="img" aria-label="Global Classroom Zoom Netiquette: Overview" style="--gcc-v145-frame:0">
    <div id="gcc-v145-fallback" class="gcc-v145-fallback"><strong id="gcc-v145-slide-title">Zoom Netiquette</strong><span id="gcc-v145-slide-details">Keep your camera on. Mute while listening.</span></div>
  </div>
  <p id="gcc-v145-description" class="gcc-v145-description"></p>
  <div class="gcc-v145-actions">
    <button id="gcc-v145-prev" class="gcc-v145-secondary" type="button" hidden>← Previous</button>
    <button id="gcc-v145-confirm" class="gcc-v145-primary" type="button">I have read and understood <span aria-hidden="true">✓</span></button>
    <button id="gcc-v145-skip" class="gcc-v145-skip" type="button" hidden>Skip (already completed)</button>
  </div>
  <p class="gcc-v145-storage-note">Your confirmation is remembered on this browser. You still need the 6-digit session code to see rooms.</p>
 </section>`;
}
export function bindNetiquetteGuideV145(root,validInvitation,{storage=globalThis.localStorage}={}){
 const gate=root.querySelector('#gcc-v145-guide'),access=root.querySelector('#gcc-v145-room-access');
 if(!gate||!access)return;
 // Malformed links should show the existing invitation error, not force a guide.
 if(!validInvitation){gate.hidden=true;access.hidden=false;return;}
 let index=0;
 const completed=isGuideConfirmedV145(storage);
 const title=gate.querySelector('#gcc-v145-slide-title');
 const details=gate.querySelector('#gcc-v145-slide-details');
 const count=gate.querySelector('#gcc-v145-count');
 const progress=gate.querySelector('#gcc-v145-bars');
 const illustration=gate.querySelector('#gcc-v145-illustration');
 const description=gate.querySelector('#gcc-v145-description');
 const confirm=gate.querySelector('#gcc-v145-confirm');
 const previous=gate.querySelector('#gcc-v145-prev');
 const skip=gate.querySelector('#gcc-v145-skip');
 const finish=()=>{
   gate.hidden=true;
   access.hidden=false;
   // Set focus only on user action, so no hidden content receives focus.
   access.querySelector('#gcc-v104-code')?.focus();
 };
 function draw(){
   const slide=NETIQUETTE_SLIDES_V145[index];
   title.textContent=slide.title;
   details.textContent=slide.details;
   description.textContent=slide.description;
   count.textContent=`${index+1} of ${NETIQUETTE_SLIDES_V145.length}`;
   illustration.style.setProperty('--gcc-v145-frame',String(index));
   illustration.setAttribute('aria-label',`${slide.title}. ${slide.details}`);
   progress.replaceChildren();
   for(let i=0;i<NETIQUETTE_SLIDES_V145.length;i++){
     const bar=document.createElement('span');
     if(i<=index)bar.classList.add('active');
     progress.append(bar);
   }
   previous.hidden=index===0;
   confirm.firstChild.textContent=index===NETIQUETTE_SLIDES_V145.length-1
      ?'I understand — Continue to rooms ':'I have read and understood ';
 }
 access.hidden=true;
 gate.hidden=false;
 skip.hidden=!completed;
 confirm.addEventListener('click',()=>{
   if(index<NETIQUETTE_SLIDES_V145.length-1){index++;draw();return;}
   markGuideConfirmedV145(storage);
   finish();
 });
 previous.addEventListener('click',()=>{if(index>0){index--;draw();}});
 skip.addEventListener('click',()=>{if(isGuideConfirmedV145(storage))finish();});
 draw();
}
