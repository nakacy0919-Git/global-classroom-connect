import '../styles/successCelebrationV142.css';
// Shared confirmation after a server-acknowledged success; no role or approval changes.
const KEY='gcc_success_sound_v142';
let ctx=null,active=null,timer=null;
function soundOn(){try{return window.localStorage.getItem(KEY)!=='off';}catch{return true;}}
function setSound(on){try{window.localStorage.setItem(KEY,on?'on':'off');}catch{}}
function getAudio(){
 if(typeof window==='undefined')return null;
 const Type=window.AudioContext||window.webkitAudioContext;
 if(!Type)return null;
 try{return ctx||(ctx=new Type());}catch{return null;}
}
// Call inside a user click/submit before the awaited request, for iOS compatibility.
export function prepareSuccessChime(){
 if(!soundOn())return;
 const audio=getAudio();if(audio?.state==='suspended')audio.resume().catch(()=>{});
}
function playChime(){
 if(!soundOn())return;
 const audio=getAudio();if(!audio||audio.state!=='running')return;
 try{
  const now=audio.currentTime+.01;
  for(const [hz,delay,volume] of [[659.25,0,.045],[880,.12,.035]]){
   const oscillator=audio.createOscillator(),gain=audio.createGain();
   oscillator.type='sine';oscillator.frequency.value=hz;oscillator.connect(gain);gain.connect(audio.destination);
   const t=now+delay;
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(volume,t+.035);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.27);
   oscillator.start(t);oscillator.stop(t+.28);
  }
 }catch{/* Visual success must not depend on audio support. */}
}
export function showSuccessCelebration({title='Completed!',detail='Your changes were saved.'}={}){
 if(typeof document==='undefined'||!document.body)return;
 if(active)active.remove();
 if(timer)clearTimeout(timer);
 const el=document.createElement('section');
 el.className='gcc142-celebration';el.setAttribute('role','status');
 el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');
 el.innerHTML='<div class="gcc142-card"><div class="gcc142-icon-wrap" aria-hidden="true"><svg class="gcc142-icon" viewBox="0 0 128 128" width="112" height="112"><defs><linearGradient id="gcc142-green" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#48e85c"/><stop offset="1" stop-color="#0da444"/></linearGradient></defs><circle cx="64" cy="64" r="54" fill="url(#gcc142-green)" stroke="#d8fbe0" stroke-width="5"/><path class="gcc142-check" d="M37 66 55 83 92 45" fill="none" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg><i class="gcc142-spark gcc142-a"></i><i class="gcc142-spark gcc142-b"></i><i class="gcc142-spark gcc142-c"></i></div><strong class="gcc142-title"></strong><p class="gcc142-detail"></p><div class="gcc142-actions"><button class="gcc142-sound" type="button"></button><button class="gcc142-done" type="button">Done</button></div></div>';
 document.body.append(el);active=el;
 el.querySelector('.gcc142-title').textContent=String(title).slice(0,100);
 el.querySelector('.gcc142-detail').textContent=String(detail).slice(0,220);
 const sound=el.querySelector('.gcc142-sound');
 const update=()=>{const on=soundOn();sound.textContent=on?'♪ Sound on':'♪ Sound off';sound.setAttribute('aria-label',on?'Mute success sounds':'Enable success sounds');sound.setAttribute('aria-pressed',String(on));};
 sound.addEventListener('click',()=>{setSound(!soundOn());update();});update();
 const close=()=>{if(timer)clearTimeout(timer);timer=null;el.remove();if(active===el)active=null;};
 el.querySelector('.gcc142-done').addEventListener('click',close);
 playChime();
 timer=setTimeout(close,3700);
 return close;
}
