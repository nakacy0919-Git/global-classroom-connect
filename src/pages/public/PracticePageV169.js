import {PRACTICE_STAGES,PRACTICE_VERSION,fillPracticePhrase,scorePracticePhrase,summarizePractice} from '../../lib/practiceDataV169.js';
import '../../styles/practiceV169.css';
const el=(tag,cls='',value='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=value;return n;};
const storageKey=PRACTICE_VERSION+'-local';
const load=()=>{try{const v=JSON.parse(localStorage.getItem(storageKey)||'{}');return {profile:v.profile||{},scores:v.scores||{}};}catch{return {profile:{},scores:{}};}};
const save=data=>{try{localStorage.setItem(storageKey,JSON.stringify(data));return true;}catch{return false;}};
export function PracticePageV169(){return `
<main class="gcc169-practice" id="gcc169-practice">
 <header class="gcc169-top"><a href="#/welcome" aria-label="Return to GCC home">← GCC Home</a><span>GLOBAL CLASSROOM CONNECT</span><span class="gcc169-pill">No account needed</span></header>
 <section class="gcc169-hero"><span class="gcc169-eyebrow">LEARN · PRACTICE · CONNECT</span><h1>Ready to Connect?</h1><p>Practice real English for Zoom exchanges. Speak, see your words, and track your progress—right on this device.</p></section>
 <div class="gcc169-layout">
  <aside class="gcc169-sidebar">
   <h2>Choose your role</h2>
   <div class="gcc169-roles" role="group" aria-label="Practice role"><button type="button" data-role="student">🎓 Student</button><button type="button" data-role="facilitator">🎙️ Host / Facilitator</button></div>
   <section class="gcc169-profile"><h3>Make it personal</h3><p>Names and personal words are not included in the accuracy score.</p>
    <label>Your name<input id="gcc169-name" maxlength="70" autocomplete="off" placeholder="e.g. Sara"></label>
    <label>School name<input id="gcc169-school" maxlength="120" autocomplete="off" placeholder="e.g. Anjo Gakuen High School"></label>
    <label>Hobby / interest<input id="gcc169-hobby" maxlength="80" autocomplete="off" placeholder="e.g. playing soccer"></label>
   </section>
   <section class="gcc169-overview" aria-live="polite"><h3>My practice overview</h3><div class="gcc169-numbers"><strong id="gcc169-progress">0%</strong><span id="gcc169-average">Accuracy —</span></div><div class="gcc169-meter"><div id="gcc169-meter"></div></div><p id="gcc169-completed">0 / 24 phrases practiced</p><div id="gcc169-stage-overview"></div><button type="button" id="gcc169-reset" class="gcc169-reset">Reset my practice scores</button><p class="gcc169-private">🔒 Scores stay in this browser. No account or server upload.</p></section>
  </aside>
  <section class="gcc169-main">
   <div class="gcc169-mainhead"><div><span class="gcc169-eyebrow">SITUATION-BASED PRACTICE</span><h2>Choose a stage</h2></div><span id="gcc169-stage-count"></span></div>
   <div id="gcc169-stages" class="gcc169-stages"></div>
   <section class="gcc169-workspace" id="gcc169-workspace" aria-live="polite">
    <div class="gcc169-scene"><div class="gcc169-scene-art" id="gcc169-scene-art" role="img" aria-label="Scene illustration"></div><div><span class="gcc169-eyebrow">IMAGINE THE SITUATION</span><h2 id="gcc169-scene-title"></h2><p id="gcc169-scene-hint"></p></div></div>
    <div class="gcc169-practice-head"><strong id="gcc169-phrase-number"></strong><span id="gcc169-best"></span></div>
    <p id="gcc169-prompt" class="gcc169-prompt"></p>
    <div class="gcc169-actions"><button type="button" id="gcc169-listen">🔊 Listen</button><button type="button" id="gcc169-record" class="gcc169-record">🎤 Start speaking</button><button type="button" id="gcc169-next">Next phrase →</button></div>
    <div class="gcc169-result"><div id="gcc169-status" role="status">Press Start speaking, then read the sentence aloud.</div><div id="gcc169-transcript" class="gcc169-transcript"></div><div id="gcc169-score" class="gcc169-score"></div></div>
    <p class="gcc169-note">Accuracy compares recognized English words with the model sentence. It does not measure phonetic pronunciation, accent, or fluency. Speech recognition depends on your browser and may use its speech service.</p>
   </section>
  </section>
 </div>
</main>`;}
export function bindPracticePageV169(){
 const root=document.querySelector('#gcc169-practice');if(!root)return;
 const $=id=>root.querySelector('#'+id);
 const state=load();let role='student',stageIndex=0,lineIndex=0,recognition=null,recording=false;
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const stages=()=>PRACTICE_STAGES[role];
 const current=()=>stages()[stageIndex];
 const profile=()=>state.profile;
 const persist=()=>{if(!save(state))$('gcc169-status').textContent='Local storage is unavailable. Scores may not be saved.';};
 function stop(){if(recognition){const active=recognition;recognition=null;try{active.abort();}catch{}}recording=false;$('gcc169-record').textContent='🎤 Start speaking';$('gcc169-record').disabled=!SpeechRecognition;}
 function updateProfile(){for(const k of ['name','school','hobby'])state.profile[k]=$('gcc169-'+k).value.trim();persist();paintPhrase();}
 for(const k of ['name','school','hobby']){$('gcc169-'+k).value=state.profile[k]||'';$('gcc169-'+k).addEventListener('input',updateProfile);}
 function paintOverview(){
  const summary=summarizePractice(state.scores,role);
  $('gcc169-progress').textContent=summary.progress+'%';
  $('gcc169-average').textContent=summary.completed?'Best-score average '+summary.average+'%':'Accuracy —';
  $('gcc169-meter').style.width=summary.progress+'%';
  $('gcc169-completed').textContent=summary.completed+' / '+summary.total+' phrases practiced';
  const list=$('gcc169-stage-overview');list.replaceChildren();
  summary.stages.forEach((s,i)=>{const row=el('button','gcc169-overview-row',s.title+' · '+s.completed+'/'+s.total+(s.completed?' · '+s.average+'%':''));row.type='button';row.addEventListener('click',()=>chooseStage(i));list.append(row);});
 }
 function paintStages(){
  $('gcc169-stage-count').textContent=stages().length+' stages';
  const list=$('gcc169-stages');list.replaceChildren();
  const summary=summarizePractice(state.scores,role);
  stages().forEach((s,i)=>{
   const item=el('button','gcc169-stage'+(i===stageIndex?' active':''));
   item.type='button';item.setAttribute('aria-pressed',String(i===stageIndex));
   const icon=el('span','gcc169-stage-icon',s.icon);
   const info=el('span','gcc169-stage-info');
   info.append(el('strong','',String(i+1).padStart(2,'0')+' · '+s.title),el('small','',s.scene));
   const count=el('span','gcc169-stage-done',summary.stages[i].completed+'/'+s.lines.length);
   item.append(icon,info,count);item.addEventListener('click',()=>chooseStage(i));list.append(item);
  });
 }
 function paintPhrase(){
  const stage=current(),phrase=stage.lines[lineIndex],entry=state.scores[role]?.[stage.id]?.[lineIndex];
  $('gcc169-scene-art').textContent=stage.icon;
  $('gcc169-scene-art').setAttribute('aria-label',stage.scene);
  $('gcc169-scene-title').textContent=stage.scene;
  $('gcc169-scene-hint').textContent=stage.hint;
  $('gcc169-phrase-number').textContent='PHRASE '+(lineIndex+1)+' OF '+stage.lines.length;
  $('gcc169-best').textContent=entry?'Best: '+entry.best+'%':'Not practiced yet';
  $('gcc169-prompt').textContent=fillPracticePhrase(phrase,profile());
  $('gcc169-transcript').textContent=entry?.transcript?'Last recognized: '+entry.transcript:'';
  $('gcc169-score').textContent=entry?'Last score: '+entry.last+'% · Best: '+entry.best+'%':'';
  $('gcc169-status').textContent=SpeechRecognition?'Tap Start speaking and read the sentence.':'Speech recognition is unavailable in this browser. Try Chrome or Safari with microphone access.';
  $('gcc169-record').disabled=!SpeechRecognition;
  $('gcc169-next').textContent=lineIndex===stage.lines.length-1?'Next stage →':'Next phrase →';
 }
 function chooseStage(index){stop();stageIndex=index;lineIndex=0;paintStages();paintPhrase();}
 function setRole(next){stop();role=next;stageIndex=0;lineIndex=0;root.querySelectorAll('[data-role]').forEach(b=>{const active=b.dataset.role===role;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});paintStages();paintOverview();paintPhrase();}
 root.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>setRole(b.dataset.role)));
 $('gcc169-next').addEventListener('click',()=>{if(lineIndex+1<current().lines.length){stop();lineIndex++;paintPhrase();}else chooseStage((stageIndex+1)%stages().length);});
 $('gcc169-listen').addEventListener('click',()=>{if(!window.speechSynthesis){$('gcc169-status').textContent='Text-to-speech is unavailable in this browser.';return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('gcc169-prompt').textContent);u.lang='en-US';u.rate=.88;speechSynthesis.speak(u);});
 $('gcc169-record').addEventListener('click',()=>{
  if(recording){stop();$('gcc169-status').textContent='Recording stopped.';return;}
  if(!SpeechRecognition)return;
  window.speechSynthesis?.cancel();
  const activeRole=role,activeStage=current(),activeLine=lineIndex;
  try{
   recognition=new SpeechRecognition();const rec=recognition;
   rec.lang='en-US';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;
   let finalized=false;recording=true;$('gcc169-record').textContent='■ Stop';$('gcc169-status').textContent='Listening… speak clearly.';
   rec.onresult=event=>{
    if(recognition!==rec)return;
    let interim='',final='';
    for(let i=0;i<event.results.length;i++){const result=event.results[i];if(result.isFinal)final+=result[0].transcript+' ';else interim+=result[0].transcript+' ';}
    $('gcc169-transcript').textContent='Recognized: '+(final||interim).trim();
    if(final.trim()&&!finalized){
     finalized=true;
     const scored=scorePracticePhrase(activeStage.lines[activeLine],final,profile());
     state.scores[activeRole]??={};state.scores[activeRole][activeStage.id]??={};
     const previous=state.scores[activeRole][activeStage.id][activeLine]?.best||0;
     state.scores[activeRole][activeStage.id][activeLine]={best:Math.max(previous,scored.accuracy),last:scored.accuracy,transcript:scored.transcript,attempts:(state.scores[activeRole][activeStage.id][activeLine]?.attempts||0)+1};
     persist();$('gcc169-score').textContent='Accuracy: '+scored.accuracy+'% · Best: '+Math.max(previous,scored.accuracy)+'%';
     $('gcc169-status').textContent=scored.accuracy>=80?'Great work! Try the next phrase.':'Good practice! Listen and try again.';
     $('gcc169-best').textContent='Best: '+Math.max(previous,scored.accuracy)+'%';paintOverview();paintStages();
    }
   };
   rec.onerror=event=>{if(recognition===rec)$('gcc169-status').textContent='Microphone / recognition error: '+event.error+'. Check permission and try again.';};
   rec.onend=()=>{if(recognition===rec){recognition=null;recording=false;$('gcc169-record').textContent='🎤 Start speaking';if(!finalized&&$('gcc169-status').textContent==='Listening… speak clearly.')$('gcc169-status').textContent='No speech detected. Please try again.';}};
   rec.start();
  }catch(error){stop();$('gcc169-status').textContent='Could not start microphone: '+error.message;}
 });
 $('gcc169-reset').addEventListener('click',()=>{if(!window.confirm('Reset all saved practice scores on this device?'))return;stop();state.scores={};persist();paintOverview();paintStages();paintPhrase();});
 window.addEventListener('hashchange',stop,{once:true});
 setRole('student');
}
